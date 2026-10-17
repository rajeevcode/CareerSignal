import type { Metadata } from 'next';
import Link from 'next/link';
import {
  FileText,
  Gauge,
  Target,
  TrendingUp,
  Search,
  ListChecks,
  MessagesSquare,
  Compass,
  ArrowRight,
  Building,
  ShieldCheck,
} from 'lucide-react';
import { AccessBadge, type AccessLevel } from '@/components/ui/LockedFeature';

export const metadata: Metadata = {
  title: 'Product — CareerSignal',
  description:
    "Eight integrated modules. See what's free, what unlocks with a free account, and what's reserved for CareerSignal Pro.",
};

type ModuleCard = {
  icon: typeof FileText;
  name: string;
  desc: string;
  level: AccessLevel;
  cta: { label: string; href: string };
  secondary?: { label: string; href: string };
};

const modules: ModuleCard[] = [
  {
    icon: FileText, name: 'AI CV Builder', level: 'pro-feature',
    desc: 'Build multiple role-specific CV versions with AI bullet rewrites and quantified impact.',
    cta: { label: 'Preview Builder', href: '/demo' },
    secondary: { label: 'Upgrade to Pro', href: '/pricing' },
  },
  {
    icon: Gauge, name: 'CV Score', level: 'free-preview',
    desc: 'Get a sample score and limited resume feedback. Sign up for the full 8-dimension breakdown.',
    cta: { label: 'Try Free CV Score', href: '/cv-score' },
    secondary: { label: 'Create free account', href: '/register' },
  },
  {
    icon: Target, name: 'JD Match Analyzer', level: 'free-preview',
    desc: 'Paste one job description and see a limited match preview. Pro unlocks unlimited matches.',
    cta: { label: 'Try JD Match', href: '/jd-match' },
    secondary: { label: 'Upgrade to Pro', href: '/pricing' },
  },
  {
    icon: TrendingUp, name: 'Interview Signal', level: 'pro-feature',
    desc: 'See estimated shortlisting probability and detailed why-you-match reasoning.',
    cta: { label: 'Unlock Interview Signal', href: '/pricing' },
    secondary: { label: 'See sample', href: '/demo' },
  },
  {
    icon: Search, name: 'Smart Job Search', level: 'free-preview',
    desc: 'Browse a curated sample feed as a guest. Free accounts unlock saving and basic match.',
    cta: { label: 'Browse jobs', href: '/jobs' },
    secondary: { label: 'Create free account', href: '/register' },
  },
  {
    icon: ListChecks, name: 'Application Tracker', level: 'login-required',
    desc: 'Pipeline from Saved → Offer with reminders and analytics. Requires an account.',
    cta: { label: 'Sign up to Track Applications', href: '/register' },
    secondary: { label: 'View sample', href: '/demo' },
  },
  {
    icon: MessagesSquare, name: 'Interview Prep', level: 'pro-feature',
    desc: 'Company-specific prep, STAR builder, mock recruiter screens, salary negotiation.',
    cta: { label: 'Upgrade to Pro', href: '/pricing' },
    secondary: { label: 'See preview', href: '/demo' },
  },
  {
    icon: Compass, name: 'Career Coach', level: 'pro-feature',
    desc: 'An always-on AI assistant that plans your week, rewrites CVs, and drafts recruiter messages.',
    cta: { label: 'Upgrade to Pro', href: '/pricing' },
  },
];

const teamModules: ModuleCard[] = [
  {
    icon: Building, name: 'Recruiter Intelligence', level: 'recruiter-plan',
    desc: 'AI shortlisting, candidate search, recruiter messaging, and pipeline analytics.',
    cta: { label: 'View Recruiter Plans', href: '/for-recruiters' },
    secondary: { label: 'View pricing', href: '/pricing' },
  },
  {
    icon: ShieldCheck, name: 'Trust & Safety', level: 'platform-feature',
    desc: 'Verified employers, fraud detection, and transparent scoring you can audit.',
    cta: { label: 'Learn More', href: '/product' },
  },
];

const btnPrimary =
  'inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover';
const btnOutline =
  'inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted';
const btnGhost =
  'inline-flex h-12 items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted';
const cardBtn =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover';
const cardBtnGhost =
  'inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted';

export default function ProductPage() {
  return (
    <>
      <section className="mx-auto max-w-3xl px-4 pt-16 pb-10 text-center sm:px-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-primary">Product</div>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          A career operating system, not a job board
        </h1>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          Eight modules built to answer one question:{' '}
          <em>&quot;Where should I apply today, and what should I fix before applying?&quot;</em> Try what&apos;s free,
          sign up to track, upgrade for the full edge.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Link href="/register" className={btnPrimary}>
            Start Free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/demo" className={btnOutline}>
            Preview Dashboard
          </Link>
          <Link href="/pricing" className={btnGhost}>
            View Pricing
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <div className="grid gap-5 sm:grid-cols-2">
          {modules.map((m) => (
            <ModuleCardView key={m.name} m={m} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          For Teams &amp; Platform
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {teamModules.map((m) => (
            <ModuleCardView key={m.name} m={m} />
          ))}
        </div>
      </section>
    </>
  );
}

function ModuleCardView({ m }: { m: ModuleCard }) {
  const Icon = m.icon;
  return (
    <article className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <AccessBadge level={m.level} />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-foreground">{m.name}</h2>
      <p className="mt-1.5 flex-1 text-sm text-muted-foreground">{m.desc}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={m.cta.href} className={cardBtn}>
          {m.cta.label}
          <ArrowRight className="h-4 w-4" />
        </Link>
        {m.secondary && (
          <Link href={m.secondary.href} className={cardBtnGhost}>
            {m.secondary.label}
          </Link>
        )}
      </div>
    </article>
  );
}
