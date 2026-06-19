import type { Metadata } from 'next';
import Link from 'next/link';
import { HeroDashboardPreview } from '@/components/cs/HeroDashboardPreview';
import { ScoreRing } from '@/components/cs/ScoreRing';
import { SignalBadge, MatchBadge } from '@/components/cs/SignalBadge';
import {
  ArrowRight,
  FileText,
  Gauge,
  Target,
  Sparkles,
  Briefcase,
  ListChecks,
  MessagesSquare,
  Compass,
  Shield,
  CheckCircle2,
  Upload,
  Search,
  TrendingUp,
  Building2,
  MapPin,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'CareerSignal — Stop applying blindly. Know your interview signal.',
  description:
    'AI career operating system: ATS-ready CV, JD match scoring, shortlisting probability, smart job search, and interview prep — all in one place.',
  openGraph: {
    title: 'CareerSignal — AI career operating system',
    description: 'Build your CV. Match any job. Know your interview signal.',
  },
};

const btnPrimary =
  'inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover';
const btnOutline =
  'inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted';

export default function HomePage() {
  return (
    <>
      <Hero />
      <Problem />
      <Modules />
      <Journey />
      <SampleMatch />
      <RecruiterStrip />
      <Trust />
      <FinalCTA />
    </>
  );
}

function Hero() {
  return (
    <section className="relative flex items-center overflow-hidden lg:min-h-[calc(100vh-3.75rem)]">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 0%, color-mix(in oklab, var(--primary-glow) 18%, transparent) 0%, transparent 70%)',
        }}
      />
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-20">
        <div className="max-w-xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            AI career operating system
          </div>
          <h1 className="text-4xl font-bold leading-[1.02] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Stop applying blindly.
            <br />
            <span className="text-primary">Know your interview signal</span> before you apply.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
            CareerSignal helps you build an ATS-ready CV, match it against any job description, discover high-fit
            roles, and manage your job search from application to interview.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className={btnPrimary}>
              <Upload className="h-4 w-4" />
              Upload CV and get your score
            </Link>
            <Link href="/jd-match" className={btnOutline}>
              Paste a job description
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              ATS-ready CV
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              Explainable scores
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              Verified companies
            </span>
          </div>
        </div>

        <div className="flex w-full justify-center lg:justify-end">
          <div className="w-full max-w-[560px]">
            <HeroDashboardPreview />
          </div>
        </div>
      </div>
    </section>
  );
}

function Problem() {
  return (
    <section className="border-y border-border bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">The problem</div>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Job boards show thousands of roles. None of them tell you where you actually have a chance.
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            You scroll. You apply. You wait. There&apos;s no signal — only volume. CareerSignal ranks opportunities
            by <strong className="text-foreground">fit</strong>, <strong className="text-foreground">CV readiness</strong>,
            and <strong className="text-foreground">estimated shortlisting probability</strong>, so every application
            has a reason to exist.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { k: 'Hours wasted weekly', v: '12+' },
            { k: 'Low-fit applications', v: '73%' },
            { k: 'Avg. response rate', v: '<5%' },
            { k: 'Reasons given', v: '0' },
          ].map((s) => (
            <div key={s.k} className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
              <div className="text-3xl font-bold tracking-tight text-foreground">{s.v}</div>
              <div className="mt-1 text-xs text-muted-foreground">{s.k}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const modules = [
  { icon: FileText, name: 'AI CV Builder', desc: 'Section-by-section editor with live AI feedback and role-specific versions.' },
  { icon: Gauge, name: 'CV Score', desc: 'VMock-style breakdown across ATS, impact, keywords, seniority and clarity.' },
  { icon: Target, name: 'JD Match Analyzer', desc: 'Paste any JD and see your match, gaps, and estimated shortlisting probability.' },
  { icon: TrendingUp, name: 'Interview Signal', desc: 'Know whether a role is a Strong, Moderate, or Weak signal — before applying.' },
  { icon: Search, name: 'Smart Job Search', desc: 'A personalized opportunity feed, ranked by fit and competition — not noise.' },
  { icon: ListChecks, name: 'Application Tracker', desc: 'Board, table, calendar and analytics views with smart follow-up reminders.' },
  { icon: MessagesSquare, name: 'Interview Prep', desc: 'Role-specific question bank, STAR builder, and 30-60-90 day plans.' },
  { icon: Compass, name: 'Career Coach', desc: 'An action-oriented AI assistant that plans, rewrites, and prepares with you.' },
];

function Modules() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <div className="text-xs font-semibold uppercase tracking-wider text-primary">Modules</div>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          One workspace for your entire job search
        </h2>
        <p className="mt-3 text-base text-muted-foreground">
          Eight tightly integrated modules — built around a single repeated loop: build, match, improve, apply,
          prepare, learn.
        </p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {modules.map((m) => (
          <div
            key={m.name}
            className="group rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--shadow-elegant)]"
          >
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <m.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-foreground">{m.name}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{m.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const journeySteps = ['Upload CV', 'Get Score', 'Match JD', 'Improve CV', 'Apply', 'Track', 'Prepare'];

function Journey() {
  return (
    <section className="border-y border-border bg-secondary/40">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">The candidate journey</div>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            A repeated improvement loop, not a one-time scan
          </h2>
        </div>

        <div className="mt-10 overflow-x-auto">
          <ol className="mx-auto flex min-w-max items-center justify-center gap-2 sm:gap-3">
            {journeySteps.map((step, i) => (
              <li key={step} className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 shadow-sm">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-foreground">{step}</span>
                </div>
                {i < journeySteps.length - 1 && <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function SampleMatch() {
  const subs = [
    { label: 'Skills', val: 88 },
    { label: 'Experience', val: 81 },
    { label: 'Domain', val: 76 },
    { label: 'Seniority', val: 85 },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">Sample match</div>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Every job tells you why it fits and what&apos;s missing
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            We never say &quot;guaranteed interview.&quot; We surface an{' '}
            <strong className="text-foreground">estimated shortlisting probability</strong> and a{' '}
            <strong className="text-foreground">qualitative interview signal</strong> — paired with the exact gaps to
            close.
          </p>
          <ul className="mt-5 space-y-2.5 text-sm">
            {[
              'Why you match — strengths the AI picked from your CV',
              'Why you may not be shortlisted — concrete gaps to address',
              'Missing keywords you can truthfully add',
              'Next actions: rewrite, reorder, or improve specific bullets',
            ].map((s) => (
              <li key={s} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <span className="text-foreground/90">{s}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-elegant)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-medium text-muted-foreground">BerlinTech AI · Berlin / Remote EU</div>
              <h3 className="mt-1 text-lg font-semibold text-foreground">Senior AI Product Manager</h3>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> Verified
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Hybrid
                </span>
                <span>€80K–€105K</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MatchBadge value={86} />
              <SignalBadge signal="Strong" />
            </div>
          </div>

          <div className="mt-5 flex items-center gap-5">
            <ScoreRing value={86} size={92} strokeWidth={9} label="Match" tone="success" />
            <div className="flex-1 space-y-2">
              {subs.map((s) => (
                <div key={s.label} className="grid grid-cols-[80px_1fr_32px] items-center gap-2">
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${s.val}%` }} />
                  </div>
                  <div className="text-right text-xs font-medium text-foreground">{s.val}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-lg bg-warning-soft p-3.5 text-sm text-warning-foreground">
            <div className="text-xs font-semibold uppercase tracking-wider opacity-80">Missing</div>
            <div className="mt-1">Enterprise SaaS depth · German language preferred</div>
          </div>

          <Link href="/cv" className={`${btnPrimary} mt-5 w-full`}>
            <Sparkles className="h-4 w-4" />
            Improve CV for this job
          </Link>
        </div>
      </div>
    </section>
  );
}

function RecruiterStrip() {
  return (
    <section className="bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-[2fr_1fr] md:items-center">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/70">
            For recruiters
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Shortlist better candidates. Cut irrelevant applications.
          </h2>
          <p className="mt-2 max-w-xl text-sm text-primary-foreground/80 sm:text-base">
            Post jobs, improve your JD quality score, and rank candidates by role fit and interview readiness — not by
            keyword spam.
          </p>
        </div>
        <div className="flex md:justify-end">
          <Link
            href="/for-recruiters"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-card px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Explore recruiter tools
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

const trustItems = [
  { icon: Shield, title: 'Verified companies', desc: 'Every employer goes through trust review.' },
  { icon: CheckCircle2, title: 'Scam detection', desc: 'AI flags suspicious postings before you see them.' },
  { icon: Briefcase, title: 'Salary transparency', desc: 'Salary ranges encouraged on every role.' },
  { icon: Sparkles, title: 'Candidate privacy', desc: 'You decide what recruiters can see, and when.' },
];

function Trust() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <div className="text-xs font-semibold uppercase tracking-wider text-primary">Trust</div>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Calm. Verified. Credible.</h2>
        <p className="mt-3 text-base text-muted-foreground">
          Trust is a product feature, not a footer. Especially across India, the EU and the Gulf.
        </p>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {trustItems.map((t) => (
          <div key={t.title} className="rounded-2xl border border-border bg-card p-5">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-success-soft text-success">
              <t.icon className="h-4 w-4" />
            </div>
            <div className="mt-3 text-sm font-semibold text-foreground">{t.title}</div>
            <div className="mt-1 text-sm text-muted-foreground">{t.desc}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <div className="overflow-hidden rounded-3xl border border-border bg-card p-10 text-center shadow-[var(--shadow-elegant)] sm:p-14">
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Build your CV. Match any job.
          <br className="hidden sm:block" />
          <span className="text-primary"> Know your interview signal.</span>
        </h2>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/register" className={`${btnPrimary} px-6`}>
            Start free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/pricing" className={`${btnOutline} px-6`}>
            See pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
