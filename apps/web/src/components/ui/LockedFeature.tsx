import Link from 'next/link';
import { Lock, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type AccessLevel =
  | 'free-preview'
  | 'login-required'
  | 'pro-feature'
  | 'recruiter-plan'
  | 'platform-feature'
  | 'coming-soon';

const BADGE_STYLES: Record<AccessLevel, { label: string; cls: string }> = {
  'free-preview': { label: 'Free Preview', cls: 'bg-success-soft text-success border-success/30' },
  'login-required': { label: 'Login Required', cls: 'bg-primary/10 text-primary border-primary/30' },
  'pro-feature': { label: 'Pro Feature', cls: 'bg-warning-soft text-warning-foreground border-warning/40' },
  'recruiter-plan': { label: 'Recruiter Plan', cls: 'bg-accent text-accent-foreground border-primary/30' },
  'platform-feature': { label: 'Platform', cls: 'bg-muted text-muted-foreground border-border' },
  'coming-soon': { label: 'Coming Soon', cls: 'bg-muted text-muted-foreground border-border' },
};

export function AccessBadge({ level, className }: { level: AccessLevel; className?: string }) {
  const s = BADGE_STYLES[level];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
        s.cls,
        className,
      )}
    >
      {level === 'pro-feature' && <Sparkles className="h-2.5 w-2.5" />}
      {level === 'login-required' && <Lock className="h-2.5 w-2.5" />}
      {s.label}
    </span>
  );
}

interface LockedFeatureProps {
  title: string;
  description: string;
  level: AccessLevel;
  /** Blurred preview content shown behind the overlay. */
  preview?: ReactNode;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  className?: string;
}

const DEFAULT_PRIMARY: Partial<Record<AccessLevel, { label: string; href: string }>> = {
  'login-required': { label: 'Create Free Account', href: '/register' },
  'pro-feature': { label: 'Upgrade to Pro', href: '/pricing#pro' },
  'recruiter-plan': { label: 'View Recruiter Plans', href: '/for-employers' },
};

export function LockedFeature({
  title,
  description,
  level,
  preview,
  primaryLabel,
  primaryHref,
  secondaryLabel = 'View pricing',
  secondaryHref = '/pricing',
  className,
}: LockedFeatureProps) {
  const fallback = DEFAULT_PRIMARY[level] ?? { label: 'Upgrade to Pro', href: '/pricing#pro' };
  const cta = { label: primaryLabel ?? fallback.label, href: primaryHref ?? fallback.href };

  return (
    <div
      className={cn(
        'flex min-h-60 flex-col items-center rounded-2xl border border-border bg-card p-7 text-center shadow-sm',
        className,
      )}
    >
      <div className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary">
        <Lock className="h-5 w-5" />
      </div>
      <AccessBadge level={level} className="mt-4" />
      <h3 className="mt-3 text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>

      {preview && (
        <div
          aria-hidden
          className="pointer-events-none mt-4 w-full select-none overflow-hidden rounded-xl opacity-60 blur-sm"
        >
          {preview}
        </div>
      )}

      {/* CTA row sits inside the card with breathing room; wraps + stacks on mobile. */}
      <div className="mt-6 flex w-full flex-wrap items-center justify-center gap-3">
        <Link
          href={cta.href}
          className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover sm:w-auto"
        >
          {cta.label}
        </Link>
        <Link
          href={secondaryHref}
          className="inline-flex min-h-11 items-center justify-center text-sm font-medium text-primary hover:underline"
        >
          {secondaryLabel}
        </Link>
      </div>
    </div>
  );
}

/** Inline nudge bar: access badge + message + a single CTA. */
export function UpgradeNudge({
  level,
  message,
  ctaLabel,
  ctaHref = '/register',
  className,
}: {
  level: AccessLevel;
  message: string;
  ctaLabel: string;
  ctaHref?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm',
        className,
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <AccessBadge level={level} />
        <span>{message}</span>
      </div>
      <Link
        href={ctaHref}
        className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-muted"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
