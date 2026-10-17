import { NextResponse } from 'next/server';
import { registerUser, setSessionCookie } from '@/lib/auth/session';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { email, password, fullName } = body as {
    email?: unknown;
    password?: unknown;
    fullName?: unknown;
  };
  if (typeof email !== 'string' || typeof password !== 'string' || typeof fullName !== 'string') {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (!email.trim() || !password || !fullName.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  }

  try {
    const result = await registerUser(email, password, fullName);
    if (result.confirmationRequired) {
      return NextResponse.json({
        success: true,
        confirmationRequired: true,
        message: 'Check your email for a confirmation link before signing in.',
      });
    }

    await setSessionCookie(result.session);
    return NextResponse.json({ success: true, confirmationRequired: false });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Registration failed' },
      { status: 400 },
    );
  }
}
