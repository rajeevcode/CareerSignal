'use client';

import Link from 'next/link';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';
import { AuthDivider } from '@/components/auth/AuthDivider';

interface AuthGateState {
  open: (opts?: { reason?: string; redirect?: string }) => void;
}

const AuthGateContext = createContext<AuthGateState | null>(null);

export function useAuthGate(): AuthGateState {
  const ctx = useContext(AuthGateContext);
  if (!ctx) throw new Error('useAuthGate must be used within AuthGateProvider');
  return ctx;
}

export function AuthGateProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<string | undefined>();
  const [redirect, setRedirect] = useState<string>('/dashboard');

  const open = useCallback((opts?: { reason?: string; redirect?: string }) => {
    setReason(opts?.reason);
    setRedirect(opts?.redirect ?? '/dashboard');
    setIsOpen(true);
  }, []);

  const value = useMemo(() => ({ open }), [open]);

  const registerHref = `/register${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`;
  const loginHref = `/login${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`;

  return (
    <AuthGateContext.Provider value={value}>
      {children}
      <Modal open={isOpen} onOpenChange={setIsOpen}>
        <div className="text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="mt-3 text-xl font-bold tracking-tight text-foreground">Create a free account to continue</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {reason ?? 'Sign up free to save jobs, match your CV, and track applications.'}
          </p>
        </div>

        <div className="mt-5">
          <SocialAuthButtons redirect={redirect} />
        </div>
        <AuthDivider />

        <div className="flex flex-col items-center gap-2">
          <Link
            href={registerHref}
            onClick={() => setIsOpen(false)}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            Create Free Account
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href={loginHref} onClick={() => setIsOpen(false)} className="font-medium text-primary hover:underline">
              Log In
            </Link>
            <span className="text-border">|</span>
            <Link href="/pricing" onClick={() => setIsOpen(false)} className="font-medium text-primary hover:underline">
              View Pricing
            </Link>
          </div>
        </div>
      </Modal>
    </AuthGateContext.Provider>
  );
}
