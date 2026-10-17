'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ClipboardList,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Mail,
  MessageCircle,
  PenLine,
  ScanLine,
  Search,
  Sparkles,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const links = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/resume-score', label: 'CV Score', icon: FileText },
  { href: '/ats-check', label: 'ATS Check', icon: ScanLine },
  { href: '/cv-builder', label: 'CV Builder', icon: PenLine },
  { href: '/jd-match-tool', label: 'JD Match', icon: Sparkles },
  { href: '/jobs', label: 'Jobs', icon: Search },
  { href: '/applications', label: 'Applications', icon: ClipboardList },
  { href: '/career', label: 'Career Workspace', icon: GraduationCap },
  { href: '/cover-letters', label: 'Cover Letters', icon: Mail },
  { href: '/interview-prep', label: 'Interview Prep', icon: GraduationCap },
  { href: '/career-coach', label: 'Career Coach', icon: MessageCircle },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/account', label: 'Account', icon: CreditCard },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              'group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground')} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
