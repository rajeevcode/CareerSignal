'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/recommended', label: 'Recommended' },
  { href: '/jobs', label: 'Browse Jobs' },
  { href: '/cv', label: 'My CV' },
  { href: '/profile', label: 'Profile' },
  { href: '/saved', label: 'Saved' },
  { href: '/applied', label: 'Applied' },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1 border-b border-border pb-4">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            pathname === link.href
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
