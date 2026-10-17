'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  Building2,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const links = [
  { href: '/admin', label: 'Trust overview', icon: Shield },
  { href: '/admin/companies', label: 'Companies', icon: Building2 },
  { href: '/admin/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/admin/alerts', label: 'Alerts', icon: AlertTriangle },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r border-border bg-surface lg:block">
      <div className="border-b border-border px-4 py-5">
        <Link href="/admin" className="text-lg font-bold text-primary">
          CareerSignal
        </Link>
        <p className="text-xs text-muted-foreground">Admin</p>
      </div>
      <nav className="flex flex-col gap-0.5 p-3">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/admin' && pathname.startsWith(href));
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
