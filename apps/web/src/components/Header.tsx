import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/session';

const NAV = [
  { href: '/resume-score', label: 'CV Score' },
  { href: '/jd-match', label: 'JD Match' },
  { href: '/jobs', label: 'Job Search' },
  { href: '/for-employers', label: 'For Employers' },
  { href: '/career-coach', label: 'Career Coach' },
];

export async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-sm font-bold text-white shadow-sm">
            CS
          </div>
          <div className="leading-tight">
            <span className="text-lg font-bold tracking-tight text-slate-900">CareerSignal</span>
            <p className="hidden text-[10px] text-slate-500 sm:block">AI career intelligence platform</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              <Link href="/dashboard" className="hidden text-sm text-slate-600 hover:text-slate-900 sm:inline">
                Career Dashboard
              </Link>
              {user.role === 'admin' && (
                <Link href="/admin/jobs" className="text-sm text-indigo-600 hover:underline">Admin</Link>
              )}
              <Link href="/cv" className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                Upload CV
              </Link>
              <form action="/auth/signout" method="post">
                <button type="submit" className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900">Login</Link>
              <Link href="/register" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
