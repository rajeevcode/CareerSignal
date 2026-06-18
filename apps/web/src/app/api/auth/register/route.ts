import { NextResponse } from 'next/server';
import { registerUser, setSessionCookie } from '@/lib/auth/session';

export async function POST(request: Request) {
  try {
    const { email, password, fullName } = await request.json();
    if (!email || !password || !fullName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const user = await registerUser(email, password, fullName);
    await setSessionCookie(user);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Registration failed' },
      { status: 400 },
    );
  }
}
