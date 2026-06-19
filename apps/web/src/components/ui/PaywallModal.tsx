'use client';

import Link from 'next/link';
import { Check, Sparkles } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { PRO_BENEFITS, PRO_PRICE_LABEL, PRO_CADENCE_LABEL, type FeatureKey } from '@/lib/billing';

interface PaywallState {
  open: (opts?: { reason?: string; feature?: FeatureKey }) => void;
}

const PaywallContext = createContext<PaywallState | null>(null);

export function usePaywall(): PaywallState {
  const ctx = useContext(PaywallContext);
  if (!ctx) throw new Error('usePaywall must be used within PaywallProvider');
  return ctx;
}

export function PaywallProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<string | undefined>();

  const open = useCallback((opts?: { reason?: string; feature?: FeatureKey }) => {
    setReason(opts?.reason);
    setIsOpen(true);
  }, []);

  const value = useMemo(() => ({ open }), [open]);

  return (
    <PaywallContext.Provider value={value}>
      {children}
      <PaywallModal open={isOpen} onOpenChange={setIsOpen} reason={reason} />
    </PaywallContext.Provider>
  );
}

export function PaywallModal({
  open,
  onOpenChange,
  reason,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reason?: string;
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <div className="text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-6 w-6" />
        </div>
        <h2 className="mt-3 text-xl font-bold tracking-tight text-foreground">Unlock CareerSignal Pro</h2>
        <p className="mt-1 text-sm text-muted-foreground">{reason ?? "You've reached the Free plan limit."}</p>
      </div>

      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {PRO_BENEFITS.map((b) => (
          <li key={b} className="flex items-start gap-2 text-sm text-foreground">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            {b}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-col items-center gap-2">
        <Link
          href="/checkout"
          onClick={() => onOpenChange(false)}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          Upgrade to Pro — {PRO_PRICE_LABEL} {PRO_CADENCE_LABEL}
        </Link>
        <Link
          href="/pricing"
          onClick={() => onOpenChange(false)}
          className="text-sm font-medium text-primary hover:underline"
        >
          View pricing
        </Link>
      </div>
    </Modal>
  );
}
