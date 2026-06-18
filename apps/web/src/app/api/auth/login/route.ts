import { NextResponse } from 'next/server';
import { loginUser, setSessionCookie } from '@/lib/auth/session';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
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
