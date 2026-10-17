import { NextResponse } from 'next/server';
import { loginUser, setSessionCookie } from '@/lib/auth/session';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const { email, password } = body as { email?: unknown; password?: unknown };
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  try {
    const user = await loginUser(email, password);
    await setSessionCookie(user);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Login failed' },
      { status: 401 },
    );
  }
}
