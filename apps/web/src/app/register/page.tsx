'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Check } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';
import { AuthDivider } from '@/components/auth/AuthDivider';
import { InlineFormError } from '@/components/auth/InlineFormError';
import { FREE_LIMITS } from '@/lib/billing';
import { safeRedirectPath } from '@/lib/utils';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FREE_BENEFITS = [
  `${FREE_LIMITS.cvUploads} free CV uploads`,
  `${FREE_LIMITS.jdMatchesMonthly} JD matches per month`,
  'Basic CV score',
  `Save ${FREE_LIMITS.savedJobs} jobs`,
  `Track ${FREE_LIMITS.trackedApplications} applications`,
];

type FieldErrors = Partial<Record<'fullName' | 'email' | 'password' | 'confirm' | 'terms', string>>;

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = safeRedirectPath(searchParams.get('redirect') ?? '/onboarding/welcome');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [terms, setTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    if (!fullName.trim()) e.fullName = 'Please enter your full name.';
    if (!email.trim()) e.email = 'Email is required.';
    else if (!EMAIL_RE.test(email)) e.email = 'Please enter a valid email address.';
    if (!password) e.password = 'Password is required.';
    else if (password.length < 8) e.password = 'Password must be at least 8 characters.';
    if (confirm !== password) e.confirm = 'Passwords do not match.';
    if (!terms) e.terms = 'Please accept the Terms and Privacy Policy.';
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setConfirmationEmail(null);
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      setLoading(true);
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: fullName.trim(), email: email.trim(), password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Registration failed');
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (data.confirmationRequired) {
        setConfirmationEmail(email.trim());
        setPassword('');
        setConfirm('');
        setTerms(false);
        return;
      }

      trackEvent('signup', { method: 'email' });
      router.push(redirect);
      router.refresh();
    } catch {
      setError('Could not create your account. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-foreground">Create your free account</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Start with {FREE_LIMITS.cvUploads} CV uploads and {FREE_LIMITS.jdMatchesMonthly} JD matches every month.
      </p>

      <div className="mt-6">
        <SocialAuthButtons redirect={redirect} />
      </div>
      <AuthDivider />

      {confirmationEmail ? (
        <div
          role="status"
          className="mt-6 rounded-lg border border-success/30 bg-success-soft p-4 text-sm text-foreground"
        >
          <p className="font-semibold text-success">Confirm your email</p>
          <p className="mt-1 text-muted-foreground">
            We sent a confirmation link to {confirmationEmail}. Open it, then sign in with your password.
          </p>
          <Link href="/login" className="mt-3 inline-flex font-semibold text-primary hover:underline">
            Back to sign in
          </Link>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {error && <p role="alert" className="rounded-lg bg-risk-soft p-3 text-sm text-risk">{error}</p>}
        <div>
          <label htmlFor="reg-name" className="text-sm font-medium text-foreground">Full name</label>
          <input
            id="reg-name"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            aria-describedby="reg-name-err"
            aria-invalid={fieldErrors.fullName ? 'true' : undefined}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2"
          />
          <InlineFormError id="reg-name-err" message={fieldErrors.fullName} />
        </div>
        <div>
          <label htmlFor="reg-email" className="text-sm font-medium text-foreground">Email</label>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-describedby="reg-email-err"
            aria-invalid={fieldErrors.email ? 'true' : undefined}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2"
          />
          <InlineFormError id="reg-email-err" message={fieldErrors.email} />
        </div>
        <div>
          <label htmlFor="reg-password" className="text-sm font-medium text-foreground">Password</label>
          <input
            id="reg-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby="reg-password-err"
            aria-invalid={fieldErrors.password ? 'true' : undefined}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2"
          />
          <InlineFormError id="reg-password-err" message={fieldErrors.password} />
        </div>
        <div>
          <label htmlFor="reg-confirm" className="text-sm font-medium text-foreground">Confirm password</label>
          <input
            id="reg-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-describedby="reg-confirm-err"
            aria-invalid={fieldErrors.confirm ? 'true' : undefined}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2"
          />
          <InlineFormError id="reg-confirm-err" message={fieldErrors.confirm} />
        </div>
        <div>
          <label className="flex items-start gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              aria-describedby="reg-terms-err"
              aria-invalid={fieldErrors.terms ? 'true' : undefined}
              className="mt-0.5 h-4 w-4 rounded border-border"
            />
            <span>
              I agree to the{' '}
              <Link href="/terms" className="text-primary hover:underline">Terms</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
            </span>
          </label>
          <InlineFormError id="reg-terms-err" message={fieldErrors.terms} />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary py-2.5 font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {loading ? 'Creating account...' : 'Create free account'}
        </button>
      </form>

      <ul className="mt-6 grid grid-cols-1 gap-1.5 rounded-xl border border-border bg-accent/40 p-4 sm:grid-cols-2">
        {FREE_BENEFITS.map((b) => (
          <li key={b} className="flex items-center gap-2 text-xs text-foreground">
            <Check className="h-3.5 w-3.5 shrink-0 text-success" /> {b}
          </li>
        ))}
      </ul>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href={`/login?redirect=${encodeURIComponent(redirect)}`} className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
