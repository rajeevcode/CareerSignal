import 'server-only';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import {
  getDb,
  careerConnections,
  careerIntegrationItems,
  toIsoNow,
} from '@careersignal/db';
import { record } from '@/lib/career-intelligence';

export type ConnectionKind = 'inbox' | 'calendar';
export const GOOGLE_SCOPES = {
  inbox: 'https://www.googleapis.com/auth/gmail.readonly',
  calendar: 'https://www.googleapis.com/auth/calendar.events.readonly',
};
export function sealToken(value: unknown, owner: string): string {
  const key = Buffer.from(
    process.env.CAREER_TOKEN_ENCRYPTION_KEY ?? '',
    'base64',
  );
  if (key.length !== 32)
    throw new Error('Connection encryption key is not configured');
  const iv = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(owner));
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value), 'utf8'),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64');
}
export function unsealToken(
  ciphertext: string,
  owner: string,
): Record<string, unknown> {
  const key = Buffer.from(
    process.env.CAREER_TOKEN_ENCRYPTION_KEY ?? '',
    'base64',
  );
  if (key.length !== 32)
    throw new Error('Connection encryption key is not configured');
  const bytes = Buffer.from(ciphertext, 'base64'),
    decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
  decipher.setAAD(Buffer.from(owner));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return record(
    JSON.parse(
      Buffer.concat([
        decipher.update(bytes.subarray(28)),
        decipher.final(),
      ]).toString('utf8'),
    ),
  );
}
export function stateHash(value: string) {
  return createHash('sha256').update(value).digest('hex');
}
export function googleConfig() {
  const {
    GOOGLE_CLIENT_ID: clientId,
    GOOGLE_CLIENT_SECRET: clientSecret,
    GOOGLE_REDIRECT_URI: redirectUri,
  } = process.env;
  if (
    !clientId ||
    !clientSecret ||
    !redirectUri ||
    !process.env.CAREER_TOKEN_ENCRYPTION_KEY
  )
    throw new Error('Google connection is not configured');
  const uri = new URL(redirectUri);
  if (
    uri.protocol !== 'https:' &&
    !['localhost', '127.0.0.1'].includes(uri.hostname)
  )
    throw new Error('Use HTTPS for the OAuth callback');
  return { clientId, clientSecret, redirectUri };
}
export async function googleToken(form: Record<string, string>) {
  const config = googleConfig();
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      ...form,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok)
    throw new Error(
      'Google authorization expired or was rejected. Reconnect your account.',
    );
  const token = record(await response.json());
  if (typeof token.access_token !== 'string')
    throw new Error('Google returned no access token');
  return token;
}
export async function googleRead(
  path: string,
  accessToken: string,
  deadline?: AbortSignal,
): Promise<Record<string, unknown>> {
  // Paths are constructed only by this adapter, never accepted from user input.
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`https://www.googleapis.com${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: deadline
        ? AbortSignal.any([deadline, AbortSignal.timeout(15_000)])
        : AbortSignal.timeout(15_000),
      cache: 'no-store',
    });
    if (response.ok) return record(await response.json());
    if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 2)
      throw new Error(
        'Google sync failed. Check access or reconnect and retry.',
      );
    await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
  }
  throw new Error('Google sync failed');
}
export function suggestedStatus(title: string): string | null {
  if (
    /\b(rejected|not moving forward|unsuccessful|not selected)\b/i.test(title)
  )
    return 'rejected';
  if (/\b(interview|screening call)\b/i.test(title)) return 'interview';
  return null;
}
export async function syncGoogleConnection(candidateId: string, id: string) {
  const db = getDb();
  const [connection] = await db
    .select()
    .from(careerConnections)
    .where(
      and(
        eq(careerConnections.id, id),
        eq(careerConnections.candidateId, candidateId),
      ),
    );
  if (!connection) throw new Error('Connection not found');
  const owner = `${candidateId}:${connection.kind}`;
  let connectionVersion = connection.updatedAt;
  let token = unsealToken(connection.tokenCiphertext, owner);
  if (
    typeof token.expires_at !== 'number' ||
    token.expires_at < Date.now() + 60_000
  ) {
    if (typeof token.refresh_token !== 'string')
      throw new Error('Reconnect to grant offline access');
    const fresh = await googleToken({
      grant_type: 'refresh_token',
      refresh_token: token.refresh_token,
    });
    token = {
      ...token,
      ...fresh,
      expires_at: Date.now() + Number(fresh.expires_in ?? 3600) * 1000,
    };
    const [refreshed] = await db
      .update(careerConnections)
      .set({ tokenCiphertext: sealToken(token, owner), updatedAt: toIsoNow() })
      .where(
        and(
          eq(careerConnections.id, id),
          eq(careerConnections.candidateId, candidateId),
          eq(careerConnections.updatedAt, connectionVersion),
        ),
      )
      .returning({ updatedAt: careerConnections.updatedAt });
    if (!refreshed)
      throw new Error('Connection changed during refresh. Retry sync.');
    connectionVersion = refreshed.updatedAt;
  }
  if (typeof token.access_token !== 'string')
    throw new Error('Reconnect your account');
  const deadline = AbortSignal.timeout(60_000);
  const access = token.access_token;
  let imported = 0,
    updated = 0,
    cancelled = 0;
  const cancelledIds: string[] = [];
  let truncated = false;
  const items: {
    externalId: string;
    title: string;
    excerpt: string;
    sourceUrl: string;
    startsAt: string | null;
    allDay: boolean;
  }[] = [];
  if (connection.kind === 'inbox') {
    const query = new URLSearchParams({
      maxResults: '25',
      q: 'newer_than:30d (interview OR application OR recruiter OR rejected OR offer)',
    });
    const listing = await googleRead(
      `/gmail/v1/users/me/messages?${query}`,
      access,
      deadline,
    );
    truncated = typeof listing.nextPageToken === 'string';
    for (const message of Array.isArray(listing.messages)
      ? listing.messages.slice(0, 25)
      : []) {
      const externalId = record(message).id;
      if (typeof externalId !== 'string') continue;
      const detail = await googleRead(
        `/gmail/v1/users/me/messages/${encodeURIComponent(externalId)}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
        access,
        deadline,
      );
      const headers = record(detail.payload).headers;
      const subject = (Array.isArray(headers) ? headers : [])
        .map(record)
        .find((h) => h.name === 'Subject')?.value;
      items.push({
        externalId,
        title:
          typeof subject === 'string'
            ? subject.slice(0, 500)
            : 'Email without subject',
        excerpt:
          typeof detail.snippet === 'string'
            ? detail.snippet.slice(0, 500)
            : '',
        sourceUrl: `https://mail.google.com/mail/u/0/#inbox/${encodeURIComponent(externalId)}`,
        startsAt: null,
        allDay: false,
      });
    }
  } else {
    const query = new URLSearchParams({
      maxResults: '50',
      singleEvents: 'true',
      showDeleted: 'true',
      orderBy: 'startTime',
      timeMin: new Date().toISOString(),
      timeMax: new Date(Date.now() + 30 * 86400000).toISOString(),
    });
    const listing = await googleRead(
      `/calendar/v3/calendars/primary/events?${query}`,
      access,
      deadline,
    );
    truncated = typeof listing.nextPageToken === 'string';
    for (const raw of Array.isArray(listing.items)
      ? listing.items.slice(0, 50)
      : []) {
      const event = record(raw);
      if (typeof event.id !== 'string') continue;
      if (event.status === 'cancelled') {
        cancelledIds.push(event.id);
        continue;
      }
      const start = record(event.start);
      const startsAt =
        typeof start.dateTime === 'string'
          ? start.dateTime
          : typeof start.date === 'string'
            ? `${start.date}T00:00:00Z`
            : null;
      items.push({
        externalId: event.id,
        title:
          typeof event.summary === 'string'
            ? event.summary.slice(0, 500)
            : 'Untitled calendar event',
        excerpt:
          'Primary calendar event; review before associating with an application.',
        sourceUrl:
          typeof event.htmlLink === 'string' &&
          event.htmlLink.startsWith('https://calendar.google.com/')
            ? event.htmlLink
            : 'https://calendar.google.com/',
        allDay:
          typeof start.dateTime !== 'string' && typeof start.date === 'string',
        startsAt:
          startsAt && Number.isFinite(Date.parse(startsAt)) ? startsAt : null,
      });
    }
  }
  return db.transaction(async (tx) => {
    // External calls finish before this short transaction. Reconsent or disconnect
    // invalidates results from an earlier grant instead of mixing accounts.
    const [active] = await tx
      .select({ id: careerConnections.id })
      .from(careerConnections)
      .where(
        and(
          eq(careerConnections.id, id),
          eq(careerConnections.candidateId, candidateId),
          eq(careerConnections.updatedAt, connectionVersion),
        ),
      )
      .for('update');
    if (!active) throw new Error('Connection changed during sync. Retry.');
    for (const externalId of cancelledIds) {
      const removed = await tx
        .delete(careerIntegrationItems)
        .where(
          and(
            eq(careerIntegrationItems.candidateId, candidateId),
            eq(careerIntegrationItems.connectionId, id),
            eq(careerIntegrationItems.externalId, externalId),
          ),
        )
        .returning({ id: careerIntegrationItems.id });
      cancelled += removed.length;
    }
    for (const item of items) {
      const [existing] = await tx
        .select()
        .from(careerIntegrationItems)
        .where(
          and(
            eq(careerIntegrationItems.candidateId, candidateId),
            eq(careerIntegrationItems.connectionId, id),
            eq(careerIntegrationItems.externalId, item.externalId),
          ),
        )
        .for('update');
      if (existing) {
        const sameDate =
          (existing.startsAt === null && item.startsAt === null) ||
          (existing.startsAt !== null &&
            item.startsAt !== null &&
            Date.parse(existing.startsAt) === Date.parse(item.startsAt));
        if (
          existing.title === item.title &&
          existing.excerpt === item.excerpt &&
          existing.sourceUrl === item.sourceUrl &&
          existing.allDay === item.allDay &&
          sameDate
        )
          continue;
        await tx
          .update(careerIntegrationItems)
          .set({
            ...item,
            proposedStatus: suggestedStatus(item.title),
            reviewedAt: null,
            applicationId: null,
            updatedAt: new Date(
              Math.max(Date.now(), Date.parse(existing.updatedAt) + 1),
            ).toISOString(),
          })
          .where(eq(careerIntegrationItems.id, existing.id));
        updated++;
        continue;
      }
      const inserted = await tx
        .insert(careerIntegrationItems)
        .values({
          ...item,
          candidateId,
          connectionId: id,
          kind: connection.kind,
          proposedStatus: suggestedStatus(item.title),
        })
        .onConflictDoNothing()
        .returning({ id: careerIntegrationItems.id });
      imported += inserted.length;
    }
    await tx
      .update(careerConnections)
      .set({ lastSyncedAt: toIsoNow() })
      .where(
        and(
          eq(careerConnections.id, id),
          eq(careerConnections.candidateId, candidateId),
        ),
      );
    return {
      imported,
      updated,
      cancelled,
      truncated,
      coverage:
        connection.kind === 'calendar'
          ? 'Primary calendar only, next 30 days, up to 50 events'
          : 'Last 30 days, up to 25 career-related email candidates',
    };
  });
}
