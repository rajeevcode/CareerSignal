'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Briefcase,
  Building2,
  CreditCard,
  LayoutDashboard,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const links = [
  { href: '/recruiter/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/recruiter/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/recruiter/company', label: 'Company', icon: Building2 },
  { href: '/recruiter/messages', label: 'Messages', icon: MessageSquare },
  { href: '/recruiter/billing', label: 'Billing', icon: CreditCard },
];

export function RecruiterSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r border-border bg-surface lg:block">
      <div className="border-b border-border px-4 py-5">
        <Link href="/recruiter/dashboard" className="text-lg font-bold text-primary">
          CareerSignal
        </Link>
        <p className="text-xs text-muted-foreground">Recruiter</p>
      </div>
      <nav className="flex flex-col gap-0.5 p-3">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/recruiter/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active ? 'bg-primary-muted text-primary' : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
