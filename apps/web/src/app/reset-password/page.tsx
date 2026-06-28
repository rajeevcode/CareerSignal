'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { InlineFormError } from '@/components/auth/InlineFormError';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type FieldErrors = Partial<Record<'password' | 'confirm', string>>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (!password) errors.password = 'Password is required.';
    else if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
    if (!confirm) errors.confirm = 'Confirm your new password.';
    else if (password !== confirm) errors.confirm = 'Passwords do not match.';
    return errors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message || 'Could not update your password.');
        return;
      }
      await supabase.auth.signOut();
      router.push('/login?reset=success');
      router.refresh();
    } catch {
      setError('Could not update your password. Use the latest reset link and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-foreground">Choose a new password</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Use a strong password that is unique to CareerSignal.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        {error && <p role="alert" className="rounded-lg bg-risk-soft p-3 text-sm text-risk">{error}</p>}
        <div>
          <label htmlFor="new-password" className="text-sm font-medium text-foreground">New password</label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-describedby="new-password-err"
            aria-invalid={fieldErrors.password ? 'true' : undefined}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2"
          />
          <InlineFormError id="new-password-err" message={fieldErrors.password} />
        </div>
        <div>
          <label htmlFor="confirm-new-password" className="text-sm font-medium text-foreground">Confirm password</label>
          <input
            id="confirm-new-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            aria-describedby="confirm-new-password-err"
            aria-invalid={fieldErrors.confirm ? 'true' : undefined}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2"
          />
          <InlineFormError id="confirm-new-password-err" message={fieldErrors.confirm} />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary py-2.5 font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
        >
          {loading ? 'Updating password...' : 'Update password'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Need a new link?{' '}
        <Link href="/forgot-password" className="text-primary hover:underline">
          Send another reset email
        </Link>
      </p>
    </AuthLayout>
  );
}
