'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LayoutDashboard, User, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface HeaderUser {
  email: string;
  role: 'candidate' | 'recruiter' | 'admin' | string;
  plan: 'free' | 'pro' | string;
  full_name: string | null;
}

function initials(user: HeaderUser): string {
  const base = user.full_name?.trim() || user.email;
  const parts = base.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** Account dropdown: avatar initials → name/email, plan, Account, Dashboard, Logout. */
export function AccountMenu({ user }: { user: HeaderUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full border border-border bg-surface py-1 pl-1 pr-2 text-sm transition-colors hover:bg-accent"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {initials(user)}
        </span>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-semibold text-foreground">{user.full_name || 'Your account'}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            <span
              className={cn(
                'mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                user.plan === 'pro'
                  ? 'border-primary/20 bg-primary-muted text-primary'
                  : 'border-border bg-surface-muted text-muted-foreground',
              )}
            >
              {user.plan === 'pro' ? 'Pro plan' : 'Free plan'}
            </span>
          </div>
          <nav className="py-1 text-sm">
            <Link href="/dashboard" role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-foreground hover:bg-accent">
              <LayoutDashboard className="h-4 w-4 text-muted-foreground" /> Dashboard
            </Link>
            <Link href="/account" role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-foreground hover:bg-accent">
              <User className="h-4 w-4 text-muted-foreground" /> Account
            </Link>
            {user.role === 'admin' && (
              <Link href="/admin" role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-primary hover:bg-accent">
                <LayoutDashboard className="h-4 w-4" /> Admin
              </Link>
            )}
            {user.role === 'recruiter' && (
              <Link href="/recruiter/dashboard" role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-primary hover:bg-accent">
                <LayoutDashboard className="h-4 w-4" /> Recruiter
              </Link>
            )}
          </nav>
          <form action="/auth/signout" method="post" className="border-t border-border">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-accent"
            >
              <LogOut className="h-4 w-4 text-muted-foreground" /> Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
