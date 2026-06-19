'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { PRO_BENEFITS, PRO_PRICE_LABEL, PRO_CADENCE_LABEL } from '@/lib/billing';

export default function CheckoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout/complete', { method: 'POST' });
      if (res.status === 401) {
        router.push('/login?redirect=/checkout');
        return;
      }
      if (!res.ok) throw new Error('Checkout failed');
      router.push('/checkout/success');
      router.refresh();
    } catch {
      setError('Could not complete checkout. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Upgrade to CareerSignal Pro</h1>
      <p className="mt-2 text-muted-foreground">Review your plan and confirm. This is a demo checkout — no payment is taken.</p>

      <div className="card-surface mt-8 p-6">
        <div className="flex items-baseline justify-between">
          <span className="font-semibold text-foreground">CareerSignal Pro</span>
          <span className="text-2xl font-bold text-primary">
            {PRO_PRICE_LABEL}
            <span className="text-sm font-medium text-muted-foreground"> {PRO_CADENCE_LABEL}</span>
          </span>
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {PRO_BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              {b}
            </li>
          ))}
        </ul>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        <button
          type="button"
          onClick={pay}
          disabled={loading}
          className="btn-primary mt-6 flex w-full items-center justify-center gap-2 py-3 disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? 'Activating…' : 'Pay (demo) & activate Pro'}
        </button>
        <Link href="/checkout/cancel" className="mt-3 block text-center text-sm text-muted-foreground hover:underline">
          Cancel
        </Link>
      </div>
    </div>
  );
}
