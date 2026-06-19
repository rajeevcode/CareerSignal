'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { trackEvent } from '@/lib/analytics';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';
import { AuthDivider } from '@/components/auth/AuthDivider';
import { InlineFormError } from '@/components/auth/InlineFormError';
import { FREE_LIMITS } from '@/lib/billing';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = Partial<Record<'email' | 'password', string>>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    if (!email.trim()) e.email = 'Email is required.';
    else if (!EMAIL_RE.test(email)) e.email = 'Please enter a valid email address.';
    if (!password) e.password = 'Password is required.';
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Login failed');
      setLoading(false);
      return;
    }

    trackEvent('login', { method: 'email' });
    router.push(redirect);
    router.refresh();
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
      <p className="mt-1 text-sm text-muted-foreground">Continue improving your job search signal.</p>

      <div className="mt-6">
        <SocialAuthButtons redirect={redirect} />
      </div>
      <AuthDivider />

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {error && <p role="alert" className="rounded-lg bg-risk-soft p-3 text-sm text-risk">{error}</p>}
        <div>
          <label htmlFor="login-email" className="text-sm font-medium text-foreground">Email</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-describedby="login-email-err"
            className="mt-1 w-full rounded-lg border border-border px-3 py-2"
          />
          <InlineFormError id="login-email-err" message={fieldErrors.email} />
        </div>
        <div>
          <label htmlFor="login-password" className="text-sm font-medium text-foreground">Password</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby="login-password-err"
            className="mt-1 w-full rounded-lg border border-border px-3 py-2"
          />
          <InlineFormError id="login-password-err" message={fieldErrors.password} />
        </div>
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-muted-foreground">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            Remember me
          </label>
          <Link href="/login" className="font-medium text-primary hover:underline">Forgot password?</Link>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary py-2.5 font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Login'}
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-muted-foreground">
        Free account includes {FREE_LIMITS.cvUploads} CV uploads and {FREE_LIMITS.jdMatchesMonthly} JD matches per month.
      </p>
      <p className="mt-3 text-center text-sm text-muted-foreground">
        New to CareerSignal? <Link href="/register" className="text-primary hover:underline">Create free account</Link>
      </p>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
