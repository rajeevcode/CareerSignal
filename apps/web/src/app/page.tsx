import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Compass,
  FileText,
  Gauge,
  ListChecks,
  MessagesSquare,
  Search,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
} from 'lucide-react';
import { HeroDashboardPreview } from '@/components/cs/HeroDashboardPreview';

export const metadata: Metadata = {
  title: 'CareerSignal — Stop applying blindly. Know your interview signal.',
  description:
    'Build an ATS-ready CV, compare it with any job description, discover high-fit roles, and manage your job search from application to interview.',
  openGraph: {
    title: 'CareerSignal — AI career operating system',
    description: 'Build your CV. Match any job. Know your interview signal.',
  },
};

const primaryButton =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover sm:text-base';
const secondaryButton =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted sm:text-base';

const journeySteps = [
  { label: 'Upload CV', description: 'Add your current CV', href: '/cv-score' },
  { label: 'Get score', description: 'Understand your readiness', href: '/cv-score' },
  { label: 'Match JD', description: 'Compare against a target role', href: '/jd-match' },
  { label: 'Improve CV', description: 'Fix the most important gaps', href: '/cv-builder' },
  { label: 'Apply', description: 'Submit the stronger version', href: '/jobs' },
  { label: 'Track', description: 'Manage progress and follow-ups', href: '/applications' },
  { label: 'Prepare', description: 'Build interview readiness', href: '/interview-prep' },
] as const;

const modules = [
  {
    icon: FileText,
    title: 'AI CV Builder',
    description: 'Section-by-section editor with live AI feedback and role-specific versions.',
    label: 'Open builder',
    href: '/cv-builder',
  },
  {
    icon: Gauge,
    title: 'CV Score',
    description: 'Explainable breakdown across ATS, impact, keywords, seniority and clarity.',
    label: 'Get your score',
    href: '/cv-score',
  },
  {
    icon: Target,
    title: 'JD Match Analyzer',
    description: 'Paste any JD and see your match, gaps, and estimated shortlisting probability.',
    label: 'Analyze a role',
    href: '/jd-match',
  },
  {
    icon: TrendingUp,
    title: 'Interview Signal',
    description: 'Know whether a role is a Strong, Moderate, or Weak signal — before you apply.',
    label: 'See a sample',
    href: '/jd-match',
  },
  {
    icon: Search,
    title: 'Smart Job Search',
    description: 'A personalized opportunity feed, ranked by fit and competition — not noise.',
    label: 'Browse jobs',
    href: '/jobs',
  },
  {
    icon: ListChecks,
    title: 'Application Tracker',
    description: 'Board, table and analytics views with smart follow-up reminders.',
    label: 'View tracker',
    href: '/applications',
  },
  {
    icon: MessagesSquare,
    title: 'Interview Prep',
    description: 'Role-specific question bank, STAR builder, and 30-60-90 day plans.',
    label: 'Start prepping',
    href: '/interview-prep',
  },
  {
    icon: Compass,
    title: 'Career Coach',
    description: 'An action-oriented AI assistant that plans, rewrites, and prepares with you.',
    label: 'Talk to coach',
    href: '/career-coach',
  },
] as const;

export default function HomePage() {
  return (
    <div className="overflow-x-hidden">
      <Hero />
      <ProofStrip />
      <Problem />
      <HowItWorks />
      <Modules />
      <RecruiterStrip />
      <Trust />
      <PricingPreview />
      <FinalCTA />
    </div>
  );
}

function Eyebrow({ children, primary = false }: { children: React.ReactNode; primary?: boolean }) {
  return (
    <div
      className={`text-xs font-bold uppercase tracking-[0.08em] ${
        primary ? 'text-primary' : 'text-muted-foreground'
      }`}
    >
      {children}
    </div>
  );
}

function Hero() {
  const benefits = ['ATS-ready CV', 'Explainable scores', 'Verified companies', 'Your data stays private'];

  return (
    <section className="relative">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(620px 420px at 8% 12%, color-mix(in oklab, var(--primary) 8%, transparent), transparent 72%)',
        }}
      />
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-14 lg:py-24">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-accent px-3.5 py-2 text-xs font-semibold text-primary">
            <Sparkles aria-hidden className="h-3.5 w-3.5" />
            AI career operating system
          </div>
          <h1 className="text-4xl font-bold leading-[1.04] tracking-[-0.025em] text-foreground sm:text-5xl xl:text-[58px]">
            Stop applying blindly.
            <br />
            Know your <span className="text-primary">interview signal</span> before you apply.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            CareerSignal builds you an ATS-ready CV, scores it against any job description, and shows you exactly
            which roles are worth applying to — before you spend the hour.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/cv-score" className={primaryButton}>
              <Upload aria-hidden className="h-4 w-4" />
              Upload CV and get your score
            </Link>
            <Link href="/jd-match" className={secondaryButton}>
              Paste a job description
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
          <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-3">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-2 text-[13px] font-medium text-foreground/80">
                <Check aria-hidden className="h-4 w-4 text-success" strokeWidth={2.5} />
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <div className="mx-auto w-full max-w-[590px] lg:mx-0 lg:justify-self-end">
          <HeroDashboardPreview />
        </div>
      </div>
    </section>
  );
}

const proofItems = [
  { icon: Clock3, label: 'ATS-ready analysis' },
  { icon: Target, label: 'Role-specific matching' },
  { icon: ListChecks, label: 'Explainable recommendations' },
  { icon: Shield, label: 'Verified opportunities' },
  { icon: CalendarDays, label: 'Application tracking' },
  { icon: MessagesSquare, label: 'Interview preparation' },
] as const;

function ProofStrip() {
  return (
    <section aria-label="CareerSignal capabilities" className="border-y border-border bg-card px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl overflow-x-auto">
        <ul className="flex min-w-max items-center justify-center gap-8 px-1 lg:min-w-0 lg:flex-wrap">
          {proofItems.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2 text-[13px] font-semibold text-foreground/80">
              <Icon aria-hidden className="h-4 w-4 text-primary" strokeWidth={1.8} />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Problem() {
  const metrics = [
    ['12+', 'Hours wasted weekly'],
    ['73%', 'Low-fit applications'],
    ['<5%', 'Avg. response rate'],
    ['0', 'Reasons given'],
  ] as const;

  return (
    <section className="bg-secondary/55 px-4 py-20 sm:px-6 lg:py-24">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="max-w-xl">
          <Eyebrow>The problem</Eyebrow>
          <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl">
            Job boards show thousands of roles. None tell you where you actually have a chance.
          </h2>
          <p className="mt-5 text-base leading-7 text-muted-foreground">
            You scroll. You apply. You wait. There&apos;s no signal — only volume. CareerSignal ranks opportunities by{' '}
            <strong className="text-foreground">fit</strong>,{' '}
            <strong className="text-foreground">CV readiness</strong>, and{' '}
            <strong className="text-foreground">estimated shortlisting probability</strong>, so every application has
            a reason to exist.
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-4">
          {metrics.map(([value, label]) => (
            <div key={label} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <dd className="text-3xl font-extrabold tracking-tight text-foreground">{value}</dd>
              <dt className="mt-2 text-sm text-muted-foreground">{label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="border-y border-border bg-card px-4 py-20 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            A repeated improvement loop, not a one-time scan
          </h2>
        </div>
        <Journey />
        <SampleMatch />
      </div>
    </section>
  );
}

function Journey() {
  return (
    <>
      <ol className="relative mt-12 hidden grid-cols-7 lg:grid">
        <div aria-hidden className="absolute left-[7%] right-[7%] top-5 h-0.5 bg-border" />
        {journeySteps.map((step, index) => (
          <li key={step.label} className="relative z-10 px-1 text-center">
            <Link href={step.href} className="group flex flex-col items-center">
              <span className="grid h-11 w-11 place-items-center rounded-full border-[3px] border-card bg-primary text-sm font-bold text-primary-foreground transition-transform group-hover:scale-105">
                {index + 1}
              </span>
              <span className="mt-3 text-sm font-bold text-foreground xl:text-base">{step.label}</span>
              <span className="mt-1 max-w-[145px] text-xs leading-5 text-muted-foreground xl:text-[13px]">
                {step.description}
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <ol className="relative mx-auto mt-10 max-w-md space-y-6 pl-9 lg:hidden">
        <div aria-hidden className="absolute bottom-3 left-[13px] top-3 w-0.5 bg-border" />
        {journeySteps.map((step, index) => (
          <li key={step.label} className="relative">
            <span className="absolute left-[-36px] top-0 z-10 grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {index + 1}
            </span>
            <Link href={step.href} className="font-bold text-foreground hover:text-primary">
              {step.label}
            </Link>
            <p className="mt-0.5 text-sm text-muted-foreground">{step.description}</p>
          </li>
        ))}
      </ol>
    </>
  );
}

function SampleMatch() {
  const explanations = [
    'Why you match — strengths the AI found in your CV',
    'Why you may not be shortlisted — concrete gaps to address',
    'Missing keywords you can truthfully add',
    'Suggested next actions: rewrite, reorder, or improve specific bullets',
  ];

  return (
    <div className="mt-16 grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
      <div>
        <Eyebrow primary>Sample match</Eyebrow>
        <h3 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-foreground">
          Every job tells you why it fits — and what&apos;s missing
        </h3>
        <p className="mt-5 text-base leading-7 text-muted-foreground">
          We never say &quot;guaranteed interview.&quot; We surface an{' '}
          <strong className="text-foreground">estimated shortlisting probability</strong> and a{' '}
          <strong className="text-foreground">qualitative interview signal</strong> — paired with the exact gaps to
          close.
        </p>
        <ul className="mt-6 space-y-3.5">
          {explanations.map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm leading-6 text-foreground/85">
              <CheckCircle2 aria-hidden className="mt-0.5 h-[18px] w-[18px] shrink-0 text-success" />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <MatchCard />
    </div>
  );
}

function MatchCard() {
  const scoreRows = [
    ['Skills', 88],
    ['Experience', 81],
    ['Domain', 76],
    ['Seniority', 85],
  ] as const;

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-b from-accent/55 to-card p-5 shadow-[var(--shadow-elegant)] sm:p-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm text-muted-foreground">BerlinTech AI · Berlin / Remote EU</p>
          <h4 className="mt-1 text-xl font-bold text-foreground">Senior AI Product Manager</h4>
          <p className="mt-3 text-xs text-muted-foreground">Verified · Hybrid · €80K–€105K</p>
        </div>
        <div className="flex shrink-0 gap-2 sm:flex-col sm:items-end">
          <span className="rounded-full bg-success-soft px-3 py-1 text-xs font-bold text-success">↗ 86% match</span>
          <span className="rounded-full bg-success-soft px-3 py-1 text-xs font-bold text-success">
            ↗ Strong signal
          </span>
        </div>
      </div>

      <div className="mt-6 grid items-center gap-5 sm:grid-cols-[92px_1fr]">
        <div
          className="grid h-[88px] w-[88px] place-items-center rounded-full"
          style={{ background: 'conic-gradient(var(--success) 0 86%, var(--muted) 86% 100%)' }}
          aria-label="Match score: 86 out of 100"
        >
          <div className="grid h-[68px] w-[68px] place-items-center rounded-full bg-card text-center">
            <span className="text-2xl font-extrabold leading-none text-foreground">86</span>
            <span className="-mt-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Match</span>
          </div>
        </div>
        <div className="space-y-3">
          {scoreRows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[72px_1fr_26px] items-center gap-2">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                <span className="block h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
              </span>
              <span className="text-right text-xs font-medium text-foreground/80">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-warning-soft p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-warning">Missing</p>
        <p className="mt-1 text-sm text-warning-foreground">Enterprise SaaS depth · German language preferred</p>
      </div>

      <Link href="/jd-match" className={`${primaryButton} mt-5 w-full`}>
        <Sparkles aria-hidden className="h-4 w-4" />
        Improve CV for this job
      </Link>
    </div>
  );
}

function Modules() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow primary>Modules</Eyebrow>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          One workspace for your entire job search
        </h2>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          Built around a single repeated loop: build, match, improve, apply, prepare, learn.
        </p>
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {modules.map(({ icon: Icon, title, description, label, href }) => (
          <article
            key={title}
            className="group flex min-h-60 flex-col rounded-2xl border border-border bg-card p-6 transition-[transform,box-shadow,border-color] hover:-translate-y-1 hover:border-foreground/20 hover:shadow-[var(--shadow-elegant)]"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-primary">
              <Icon aria-hidden className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <h3 className="mt-4 text-base font-bold text-foreground">{title}</h3>
            <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{description}</p>
            <Link href={href} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
              {label}
              <ArrowRight aria-hidden className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

function RecruiterStrip() {
  return (
    <section className="bg-[#4338ca] px-4 py-16 text-white sm:px-6 lg:py-20">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 lg:flex-row lg:items-center">
        <div className="max-w-2xl">
          <div className="text-xs font-bold uppercase tracking-[0.08em] text-indigo-200">For recruiters</div>
          <h2 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Shortlist better candidates. Cut irrelevant applications.
          </h2>
          <p className="mt-3 text-base leading-7 text-indigo-100/85">
            Post jobs, improve your JD quality score, and rank candidates by role fit and interview readiness — not
            by keyword spam.
          </p>
        </div>
        <Link
          href="/for-recruiters"
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-lg bg-white px-6 py-3 text-sm font-bold text-[#4338ca] transition-colors hover:bg-indigo-50 lg:self-auto"
        >
          Explore recruiter tools
          <ArrowRight aria-hidden className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

const trustItems = [
  { icon: Shield, title: 'Verified companies', description: 'Company verification signals help you assess job credibility.' },
  { icon: CheckCircle2, title: 'Scam detection', description: 'Suspicious postings are highlighted for extra review.' },
  { icon: BriefcaseBusiness, title: 'Salary transparency', description: 'Salary ranges are encouraged wherever available.' },
  { icon: Sparkles, title: 'Candidate privacy', description: 'You decide what recruiters can see, and when.' },
] as const;

function Trust() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-24">
      <div className="text-center">
        <Eyebrow primary>Trust</Eyebrow>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Calm. Verified. Credible.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
          Trust is a product feature, not a footer — especially across India, the EU and the Gulf.
        </p>
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {trustItems.map(({ icon: Icon, title, description }) => (
          <article key={title} className="rounded-xl border border-border bg-card p-6">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-success-soft text-success">
              <Icon aria-hidden className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <h3 className="mt-4 text-sm font-bold text-foreground">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function PricingPreview() {
  return (
    <section className="border-y border-border bg-secondary/55 px-4 py-20 sm:px-6 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <Eyebrow primary>Pricing</Eyebrow>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-[32px]">
            Start free. Upgrade when you need more signal.
          </h2>
        </div>
        <div className="mx-auto mt-10 grid max-w-3xl gap-5 md:grid-cols-2">
          <article className="rounded-2xl border border-border bg-card p-7">
            <h3 className="font-bold text-foreground">Free</h3>
            <div className="mt-2 text-3xl font-extrabold text-foreground">$0</div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              1 CV score, 3 JD matches a month, basic job discovery.
            </p>
            <Link href="/register" className={`${secondaryButton} mt-6 w-full`}>
              Get started
            </Link>
          </article>
          <article className="relative rounded-2xl border-2 border-primary bg-card p-7">
            <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
              Recommended
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-foreground">Pro</h3>
              <span className="rounded-full bg-accent px-2 py-1 text-[10px] font-semibold text-primary">
                For active job seekers
              </span>
            </div>
            <div className="mt-2 text-3xl font-extrabold text-foreground">
              $19<span className="text-sm font-medium text-muted-foreground">/mo</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Unlimited scoring, JD matching, full job discovery and interview prep.
            </p>
            <Link href="/pricing" className={`${primaryButton} mt-6 w-full`}>
              Start free trial
            </Link>
          </article>
        </div>
        <div className="mt-6 text-center">
          <Link href="/pricing" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
            Compare all plans
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-[#101828] px-4 py-20 text-white sm:px-6 lg:py-24">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: 'radial-gradient(600px 400px at 50% 0%, rgba(79,70,229,0.28), transparent 70%)' }}
      />
      <div className="relative mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          Build your CV. Match any job.
          <br className="hidden sm:block" />
          Know your interview signal.
        </h2>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/register" className={`${primaryButton} px-7`}>
            Start free
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/25 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:text-base"
          >
            See pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
