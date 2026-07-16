import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  ListChecks,
  MessagesSquare,
  Shield,
  Sparkles,
  Target,
  Upload,
  X,
} from 'lucide-react';
import { ScoreRing } from '@/components/cs/ScoreRing';

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
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover';
const secondaryButton =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted';

const journeySteps = [
  { label: 'Upload CV', href: '/cv-score' },
  { label: 'Get score', href: '/cv-score' },
  { label: 'Match role', href: '/jd-match' },
  { label: 'Improve CV', href: '/cv-score' },
  { label: 'Apply', href: '/jobs' },
  { label: 'Track', href: '/applications' },
  { label: 'Prepare', href: '/interview-prep' },
] as const;

export default function HomePage() {
  return (
    <div className="overflow-x-hidden">
      <Hero />
      <CredibilityStrip />
      <Problem />
      <CandidateJourney />
      <ProfileSignal />
      <JobMatch />
      <ApplicationIntelligence />
      <Trust />
      <RecruiterStrip />
      <FinalCTA />
    </div>
  );
}

function Eyebrow({ children, primary = false }: { children: React.ReactNode; primary?: boolean }) {
  return (
    <div
      className={`text-xs font-semibold uppercase tracking-[0.08em] ${
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
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(560px 360px at 18% 15%, color-mix(in oklab, var(--primary) 8%, transparent), transparent 70%)',
        }}
      />
      <div className="mx-auto grid max-w-7xl items-start gap-12 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(400px,0.9fr)] lg:gap-16 lg:py-24">
        <div className="max-w-2xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full bg-accent px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            AI career operating system
          </div>
          <h1 className="text-4xl font-bold leading-[1.04] tracking-[-0.025em] text-foreground sm:text-5xl xl:text-[56px]">
            Stop applying blindly.
            <br />
            Know your <span className="text-primary">interview signal</span>
            <br />
            before you apply.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Build an ATS-ready CV, compare it with any job description, discover high-fit roles, and manage your job
            search from application to interview.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/cv-score" className={primaryButton}>
              <Upload className="h-4 w-4" />
              Upload CV and get your score
            </Link>
            <Link href="/jd-match" className={secondaryButton}>
              Paste a job description
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-3">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-2 text-[13px] font-medium text-foreground/80">
                <Check className="h-4 w-4 text-success" strokeWidth={2.5} />
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <HeroSignalCard />
      </div>
    </section>
  );
}

function HeroSignalCard() {
  return (
    <div className="w-full max-w-[520px] justify-self-center overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-elegant)] lg:justify-self-end">
      <div className="flex items-center justify-between px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
        <div>
          <div className="font-semibold text-foreground">Good evening, Rajeev</div>
          <div className="mt-1 text-xs text-muted-foreground">Your signal is improving this week</div>
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-full bg-accent text-xs font-bold text-primary">RK</div>
      </div>
      <div className="space-y-3 px-5 pb-5 sm:px-6 sm:pb-6">
        <div className="flex items-center gap-5 rounded-2xl border border-border p-5">
          <ScoreRing value={78} size={78} strokeWidth={8} label="/100" />
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Career readiness
            </div>
            <div className="mt-1 text-sm font-semibold text-success">Strong · ↑8 this week</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Metric label="JD match" value="84" suffix="/100" />
          <Metric label="Interview signal" value="Strong" success />
        </div>
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Top matched role
            </div>
            <span className="rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-bold text-success">
              92% match
            </span>
          </div>
          <div className="mt-1 text-sm font-semibold text-foreground">Senior AI Product Manager</div>
        </div>
        <Recommendation title="Next best action" text="Improve your CV summary" />
      </div>
    </div>
  );
}

function Metric({ label, value, suffix, success = false }: { label: string; value: string; suffix?: string; success?: boolean }) {
  return (
    <div className="rounded-xl border border-border p-3.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-bold ${success ? 'text-success' : 'text-foreground'}`}>
        {value}
        {suffix && <span className="ml-0.5 text-xs font-medium text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

function Recommendation({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-accent p-3.5">
      <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Sparkles className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wider text-primary">{title}</div>
        <div className="mt-0.5 text-sm font-semibold text-foreground">{text}</div>
      </div>
    </div>
  );
}

const credibilityItems = [
  { icon: Clock3, label: 'CV readiness' },
  { icon: Target, label: 'Role-specific matching' },
  { icon: ListChecks, label: 'Explainable recommendations' },
  { icon: Shield, label: 'Verified job listings' },
  { icon: CalendarDays, label: 'Application tracking' },
  { icon: MessagesSquare, label: 'Interview preparation' },
];

function CredibilityStrip() {
  return (
    <section className="border-y border-border bg-card/60 px-4 py-9 sm:px-6">
      <div className="mx-auto max-w-7xl text-center">
        <Eyebrow>Built for serious job searches</Eyebrow>
        <ul className="mt-6 flex flex-wrap justify-center gap-x-9 gap-y-4">
          {credibilityItems.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Icon className="h-[17px] w-[17px]" strokeWidth={1.8} />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Problem() {
  const without = ['Scroll endlessly', 'Apply broadly', 'Wait without feedback', 'Repeat'];
  const withSignal = ['Upload CV', 'Understand fit', 'Improve evidence', 'Prioritise the right roles'];

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
      <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <div className="max-w-lg">
          <Eyebrow>The problem</Eyebrow>
          <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-[38px]">
            Job boards give you volume.
            <br />
            CareerSignal gives you direction.
          </h2>
          <p className="mt-5 text-base leading-7 text-muted-foreground">
            You scroll. You apply. You wait. Most platforms show more roles, but they don&apos;t explain which
            opportunities fit your experience — or what to improve before applying.
          </p>
        </div>
        <div className="grid overflow-hidden rounded-2xl border border-border bg-card sm:grid-cols-2">
          <Comparison title="Without CareerSignal" items={without} />
          <Comparison title="With CareerSignal" items={withSignal} positive />
        </div>
      </div>
    </section>
  );
}

function Comparison({ title, items, positive = false }: { title: string; items: string[]; positive?: boolean }) {
  return (
    <div className={`p-6 sm:p-7 ${positive ? 'border-t border-border bg-accent/50 sm:border-l sm:border-t-0' : ''}`}>
      <div
        className={`text-xs font-semibold uppercase tracking-wider ${positive ? 'text-primary' : 'text-muted-foreground'}`}
      >
        {title}
      </div>
      <ul className="mt-5 space-y-3.5">
        {items.map((item) => (
          <li key={item} className={`flex items-start gap-2.5 text-sm ${positive ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
            {positive ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.4} />
            ) : (
              <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CandidateJourney() {
  return (
    <section className="border-y border-border bg-card px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <Eyebrow primary>Candidate journey</Eyebrow>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            One connected path from CV to interview
          </h2>
        </div>

        <ol className="mt-9 hidden items-center justify-center gap-1 xl:flex">
          {journeySteps.map((step, index) => (
            <li key={step.label} className="contents">
              <Link
                href={step.href}
                className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-2.5 py-2 pr-3.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted ${
                  index === 0 ? 'border-transparent bg-accent' : 'border-border bg-card'
                }`}
              >
                <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {index + 1}
                </span>
                {step.label}
              </Link>
              {index < journeySteps.length - 1 && (
                <ArrowRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
              )}
            </li>
          ))}
        </ol>

        <ol className="relative mx-auto mt-9 max-w-sm space-y-5 pl-7 xl:hidden">
          <div aria-hidden className="absolute bottom-2 left-[9px] top-2 w-px bg-border" />
          {journeySteps.map((step, index) => (
            <li key={step.label} className="relative">
              <span className="absolute left-[-27px] top-0.5 z-10 grid h-[18px] w-[18px] place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                {index + 1}
              </span>
              <Link href={step.href} className="text-sm font-semibold text-foreground hover:text-primary">
                {step.label}
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ProfileSignal() {
  const scores = [
    { label: 'ATS compatibility', value: 88 },
    { label: 'Impact', value: 72 },
    { label: 'Seniority', value: 81 },
    { label: 'Clarity', value: 69 },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-24">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="max-w-lg">
          <Eyebrow>Build and understand your profile</Eyebrow>
          <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-[34px]">
            Turn your experience into a stronger career signal.
          </h2>
          <p className="mt-5 text-base leading-7 text-muted-foreground">
            The AI CV Builder and CV Score work together to explain exactly what&apos;s holding your CV back — and
            Career Coach turns that into a concrete plan.
          </p>
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold">
            <InlineLink href="/cv-builder">AI CV Builder</InlineLink>
            <InlineLink href="/cv-score">CV Score</InlineLink>
            <InlineLink href="/career-coach">Career Coach</InlineLink>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
          <div className="flex items-center gap-5">
            <ScoreRing value={78} size={96} strokeWidth={10} label="/100" />
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">CV readiness</div>
              <div className="mt-1 text-sm font-semibold text-success">Strong · ready to send</div>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {scores.map((score) => (
              <div key={score.label} className="grid grid-cols-[120px_1fr_28px] items-center gap-3 sm:grid-cols-[132px_1fr_28px]">
                <div className="text-xs text-muted-foreground">{score.label}</div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${score.value}%` }} />
                </div>
                <div className="text-right text-xs font-medium text-foreground">{score.value}</div>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Recommendation title="Next recommended improvement" text="Quantify impact in your last two roles" />
          </div>
        </div>
      </div>
    </section>
  );
}

function InlineLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-primary hover:text-primary-hover">
      {children} <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}

function JobMatch() {
  const strengths = ['AI product leadership', 'API and platform experience', 'International product delivery'];
  const gaps = ['Enterprise SaaS depth', 'German language preferred'];

  return (
    <section className="border-y border-border bg-card px-4 py-20 sm:px-6 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow primary>Match the right opportunities</Eyebrow>
          <h2 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
            Every job tells you why it fits — and what&apos;s missing
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            JD Match Analyzer and Interview Signal don&apos;t promise guaranteed interviews — they give you an
            estimated signal, the evidence behind it, and the gaps to close before applying. Smart Job Search keeps a
            feed of roles ranked the same way.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-3 text-sm font-semibold">
            <InlineLink href="/jd-match">JD Match Analyzer</InlineLink>
            <InlineLink href="/jobs">Smart Job Search</InlineLink>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-3xl rounded-3xl border border-border bg-background p-5 shadow-[var(--shadow-elegant)] sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <div className="text-xs text-muted-foreground">BerlinTech AI · Berlin / Remote EU</div>
              <h3 className="mt-1 text-xl font-bold text-foreground">Senior AI Product Manager</h3>
              <div className="mt-2 text-xs text-muted-foreground">Verified · Hybrid · €80K–€105K</div>
            </div>
            <div className="flex gap-2 sm:flex-col sm:items-end">
              <span className="rounded-full bg-success-soft px-3 py-1 text-xs font-bold text-success">86% match</span>
              <span className="rounded-full bg-success-soft px-3 py-1 text-xs font-bold text-success">Strong signal</span>
            </div>
          </div>
          <div className="mt-7 grid gap-7 sm:grid-cols-2">
            <EvidenceList title="Why you match" items={strengths} />
            <EvidenceList title="Potential gaps" items={gaps} warning />
          </div>
          <Link href="/cv" className={`${primaryButton} mt-7 w-full`}>
            <Sparkles className="h-4 w-4" />
            Improve CV for this job
          </Link>
        </div>
      </div>
    </section>
  );
}

function EvidenceList({ title, items, warning = false }: { title: string; items: string[]; warning?: boolean }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</div>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-sm text-foreground/85">
            {warning ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            ) : (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" strokeWidth={2.4} />
            )}
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ApplicationIntelligence() {
  const stats = [
    ['18', 'Applied'],
    ['4', 'Interviews'],
    ['6', 'Follow-ups due'],
    ['12', 'Saved roles'],
  ] as const;

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
      <div className="max-w-2xl">
        <Eyebrow>Manage your search</Eyebrow>
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Know what needs your attention today.
        </h2>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          Application Tracker keeps every application, follow-up and interview in one place. Interview Prep turns the
          next one into a plan.
        </p>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold">
          <InlineLink href="/applications">Application Tracker</InlineLink>
          <InlineLink href="/interview-prep">Interview Prep</InlineLink>
        </div>
      </div>

      <div className="mt-12 overflow-hidden rounded-2xl border border-border bg-card lg:grid lg:grid-cols-[1.25fr_0.75fr]">
        <dl className="grid grid-cols-2 sm:grid-cols-4">
          {stats.map(([value, label], index) => (
            <div
              key={label}
              className={`p-5 sm:p-6 ${index % 2 === 0 ? 'border-r border-border' : ''} ${
                index < 2 ? 'border-b border-border sm:border-b-0' : ''
              } ${index > 0 ? 'sm:border-l sm:border-border' : ''}`}
            >
              <dd className="text-2xl font-bold text-foreground">{value}</dd>
              <dt className="mt-1 text-xs text-muted-foreground">{label}</dt>
            </div>
          ))}
        </dl>
        <div className="flex items-center gap-3 border-t border-border bg-accent/50 p-6 lg:border-l lg:border-t-0">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-primary">Next recommended action</div>
            <div className="mt-1 text-sm font-semibold text-foreground">
              Follow up with BerlinTech AI — 3 days since interview
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const trustItems = [
  { icon: Shield, title: 'Verified companies', description: 'Every employer goes through trust review.' },
  { icon: CheckCircle2, title: 'Scam detection', description: 'AI flags suspicious postings before you see them.' },
  { icon: BriefcaseBusiness, title: 'Salary transparency', description: 'Salary ranges encouraged on every role.' },
  { icon: Sparkles, title: 'Candidate privacy', description: 'You decide what recruiters can see, and when.' },
];

function Trust() {
  return (
    <section className="border-y border-border bg-card px-4 py-20 sm:px-6 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <Eyebrow>Trust</Eyebrow>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Calm. Verified. Credible.</h2>
          <p className="mt-4 text-base text-muted-foreground">Trust is part of the product, not a footer note.</p>
        </div>
        <div className="mx-auto mt-12 grid max-w-4xl border-l border-t border-border sm:grid-cols-2">
          {trustItems.map(({ icon: Icon, title, description }) => (
            <div key={title} className="border-b border-r border-border p-7">
              <Icon className="h-5 w-5 text-primary" strokeWidth={1.8} />
              <h3 className="mt-3 text-sm font-bold text-foreground">{title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RecruiterStrip() {
  return (
    <section className="bg-[#172554] px-4 py-16 text-white sm:px-6 lg:py-20">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 lg:flex-row lg:items-center">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-indigo-300">For recruiters</div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            Shortlist stronger candidates. Reduce irrelevant applications.
          </h2>
          <p className="mt-3 text-base leading-7 text-indigo-200">
            Improve job-description quality and rank candidates by role fit and evidence — not keyword repetition.
          </p>
        </div>
        <Link
          href="/for-recruiters"
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-white px-6 py-3 text-sm font-bold text-[#172554] transition-colors hover:bg-indigo-50 lg:self-auto"
        >
          Explore recruiter tools
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-[#101828] px-4 py-20 text-white sm:px-6 lg:py-28">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: 'radial-gradient(600px 400px at 50% 0%, rgba(79,70,229,0.28), transparent 70%)' }}
      />
      <div className="relative mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          Build your CV. Match any job.
          <br className="hidden sm:block" />
          Know your interview signal.
        </h2>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/register" className={`${primaryButton} px-7`}>
            Start free
          </Link>
          <Link
            href="/pricing"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/25 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            See pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
