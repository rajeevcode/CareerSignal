import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import {
  getDb,
  newId,
  toIsoNow,
  users,
  candidateProfiles,
  mapUser,
  parseJsonArray,
} from '@careersignal/db';
import {
  createSessionToken,
  verifySessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  type SessionPayload,
} from './token';

export type { SessionPayload };

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function getSessionPayloadForUser(userId: string, email: string, role: SessionPayload['role']): Promise<SessionPayload> {
  if (role !== 'candidate') {
    return { userId, email, role, onboardingComplete: true, onboardingStep: 3 };
  }

  const db = getDb();
  const profile = db.select().from(candidateProfiles).where(eq(candidateProfiles.userId, userId)).get();
  if (!profile) {
    return { userId, email, role, onboardingComplete: false, onboardingStep: 0 };
  }

  const { onboardingComplete, onboardingStep } = normalizeOnboardingState(profile);
  return { userId, email, role, onboardingComplete, onboardingStep };
}

function normalizeOnboardingState(profile: typeof candidateProfiles.$inferSelect) {
  if (profile.onboardingComplete) {
    return { onboardingComplete: true, onboardingStep: profile.onboardingStep ?? 3 };
  }

  const hasCv = profile.cvScore != null;
  const hasRoles = parseJsonArray(profile.targetRoles).length > 0;
  if (hasCv && hasRoles) {
    const now = toIsoNow();
    getDb().update(candidateProfiles).set({
      onboardingComplete: true,
      onboardingStep: 3,
      updatedAt: now,
    }).where(eq(candidateProfiles.id, profile.id)).run();
    return { onboardingComplete: true, onboardingStep: 3 };
  }

  return {
    onboardingComplete: profile.onboardingComplete ?? false,
    onboardingStep: profile.onboardingStep ?? 0,
  };
}

export async function setSessionCookie(payload: SessionPayload) {
  const token = await createSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const db = getDb();
  const row = db.select().from(users).where(eq(users.id, session.userId)).get();
  if (!row) return null;
  return mapUser(row);
}

export async function registerUser(email: string, password: string, fullName: string) {
  const db = getDb();
  const existing = db.select().from(users).where(eq(users.email, email.toLowerCase())).get();
  if (existing) throw new Error('Email already registered');

  const now = toIsoNow();
  const userId = newId();
  const candidateId = newId();
  const passwordHash = await hashPassword(password);

  db.insert(users).values({
    id: userId,
    email: email.toLowerCase(),
    passwordHash,
    role: 'candidate',
    fullName,
    avatarUrl: null,
    createdAt: now,
    updatedAt: now,
  }).run();

  db.insert(candidateProfiles).values({
    id: candidateId,
    userId,
    salaryCurrency: 'INR',
    remotePreference: 'any',
    targetRoles: '[]',
    onboardingStep: 0,
    onboardingComplete: false,
    createdAt: now,
    updatedAt: now,
  }).run();

  return getSessionPayloadForUser(userId, email.toLowerCase(), 'candidate');
}

export async function loginUser(email: string, password: string) {
  const db = getDb();
  const row = db.select().from(users).where(eq(users.email, email.toLowerCase())).get();
  if (!row) throw new Error('Invalid email or password');

  const valid = await verifyPassword(password, row.passwordHash);
  if (!valid) throw new Error('Invalid email or password');

  return getSessionPayloadForUser(row.id, row.email, row.role);
}
