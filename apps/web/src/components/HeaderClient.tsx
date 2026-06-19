'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

const NAV = [
  { href: '/product', label: 'Product' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/resume-score', label: 'CV Score' },
  { href: '/jd-match', label: 'JD Match' },
  { href: '/for-employers', label: 'For Recruiters' },
  { href: '/pricing', label: 'Pricing' },
];

export function HeaderClient({
  user,
}: {
  user: { full_name: string | null; role: string } | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm">
            CS
          </div>
          <div className="leading-tight">
            <span className="text-lg font-bold tracking-tight text-foreground">CareerSignal</span>
            <p className="hidden text-[10px] text-muted-foreground sm:block">AI career operating system</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm transition-colors hover:bg-surface-muted ${
                pathname === item.href ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button type="button" className="rounded-lg p-2 lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          {user ? (
            <>
              <Link href="/dashboard" className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline">
                Dashboard
              </Link>
              {user.role === 'admin' && (
                <Link href="/admin" className="hidden text-sm text-primary sm:inline">Admin</Link>
              )}
              {user.role === 'recruiter' && (
                <Link href="/recruiter/dashboard" className="hidden text-sm text-primary sm:inline">Recruiter</Link>
              )}
              <form action="/auth/signout" method="post" className="hidden sm:block">
                <button type="submit" className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-muted">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden text-sm text-muted-foreground sm:inline">Login</Link>
              <Link href="/register" className="btn-primary hidden px-4 py-2 text-sm sm:inline">Sign Up</Link>
            </>
          )}
        </div>
      </div>

      {open && (
        <nav className="border-t border-border bg-surface px-4 py-3 lg:hidden">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="block py-2 text-sm text-foreground" onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          ))}
          {!user && (
            <div className="mt-3 flex gap-2 border-t border-border pt-3">
              <Link href="/login" className="flex-1 rounded-lg border py-2 text-center text-sm">Login</Link>
              <Link href="/register" className="btn-primary flex-1 py-2 text-center text-sm">Sign Up</Link>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
