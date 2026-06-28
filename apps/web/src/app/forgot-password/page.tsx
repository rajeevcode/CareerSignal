'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { InlineFormError } from '@/components/auth/InlineFormError';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setFieldError('Email is required.');
      return;
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      setFieldError('Please enter a valid email address.');
      return;
    }

    setFieldError(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent('/reset-password')}`,
      });

      if (resetError) {
        setError(resetError.message || 'Could not send reset instructions.');
        return;
      }

      setStatus('If an account exists for that email, reset instructions will arrive shortly.');
    } catch {
      setError('Could not send reset instructions. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-foreground">Reset your password</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter your account email and we will send a secure recovery link.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        {status && <p role="status" className="rounded-lg bg-success-soft p-3 text-sm text-success">{status}</p>}
        {error && <p role="alert" className="rounded-lg bg-risk-soft p-3 text-sm text-risk">{error}</p>}
        <div>
          <label htmlFor="reset-email" className="text-sm font-medium text-foreground">Email</label>
          <input
            id="reset-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-describedby="reset-email-err"
            aria-invalid={fieldError ? 'true' : undefined}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2"
          />
          <InlineFormError id="reset-email-err" message={fieldError} />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary py-2.5 font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {loading ? 'Sending instructions...' : 'Send reset link'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remember your password?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
