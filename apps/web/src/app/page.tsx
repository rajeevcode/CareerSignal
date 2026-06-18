import Link from 'next/link';
import { ArrowRight, Shield, Sparkles, Target, TrendingUp, Upload, Zap } from 'lucide-react';

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-indigo-50/30 py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800">
                <Sparkles className="h-3.5 w-3.5" />
                AI career intelligence platform
              </p>
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                Build your CV. Match any job. Know your interview signal.
              </h1>
              <p className="mt-4 text-lg text-slate-600">
                CareerSignal scores your CV, matches it against any job description, and shows where you have the strongest shortlisting signal — before you apply.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700"
                >
                  <Upload className="h-5 w-5" />
                  Upload CV and Get Your Score
                </Link>
                <Link
                  href="/jd-match"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Paste Job Description
                </Link>
              </div>
            </div>

            {/* Hero visual */}
            <div className="relative">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/50">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your profile</p>
                <p className="mt-1 font-semibold text-slate-900">Senior AI Product Manager</p>
                <p className="text-sm text-slate-500">CV Score: 78/100</p>
                <div className="mt-4 space-y-3">
                  <HeroJobCard
                    title="Senior AI Product Manager"
                    company="ExampleTech"
                    match={86}
                    missing="B2B SaaS, Salesforce"
                    high
                  />
                  <HeroJobCard
                    title="Technical Product Manager"
                    company="DataFlow"
                    match={76}
                    missing="Enterprise SaaS"
                  />
                  <HeroJobCard
                    title="Data Product Manager"
                    company="MarketHub"
                    match={68}
                    missing="SQL depth"
                    low
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-y border-slate-100 bg-white py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold text-slate-900">Most job boards show too many jobs and too little clarity</h2>
          <p className="mt-4 text-slate-600">
            Candidates don&apos;t know why they&apos;re rejected, which jobs truly fit, whether their CV matches the JD, which skills are missing, or whether location, visa, seniority, or competition is the issue.
          </p>
        </div>
      </section>

      {/* Solution */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-900">CareerSignal ranks jobs by your interview signal</h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-600">Every role shows opportunity quality — not just a listing.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              'Profile fit score',
              'Interview probability',
              'ATS & keyword gap',
              'Experience & seniority match',
              'Location & visa fit',
              'Competition level',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <Target className="h-5 w-5 shrink-0 text-indigo-600" />
                <span className="text-sm font-medium text-slate-800">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Candidate flow */}
      <section className="bg-slate-900 py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold">Your career dashboard</h2>
          <div className="mt-10 flex flex-wrap justify-center gap-4 text-sm">
            {['Upload CV', 'CV Score', 'JD Match', 'Interview Signal', 'Improve CV', 'Apply & track'].map((step, i, arr) => (
              <div key={step} className="flex items-center gap-2">
                <span className="rounded-lg bg-white/10 px-4 py-2 font-medium">{step}</span>
                {i < arr.length - 1 && <ArrowRight className="h-4 w-4 text-slate-500" />}
              </div>
            ))}
          </div>
          <ul className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-2">
            {['Best-fit jobs ranked daily', 'Interview probability per role', 'CV gap analysis before applying', 'Application tracker & follow-ups'].map((f) => (
              <li key={f} className="flex items-center gap-2 text-slate-300">
                <Zap className="h-4 w-4 text-indigo-400" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Recruiter + Trust */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <TrendingUp className="h-8 w-8 text-indigo-600" />
              <h3 className="mt-4 text-xl font-bold text-slate-900">Shortlist better candidates faster</h3>
              <p className="mt-2 text-slate-600">
                Use AI to rank applicants by fit, readiness, location, salary, and availability — fewer irrelevant applications, better interview-ready candidates.
              </p>
              <Link href="/for-employers" className="mt-6 inline-block text-sm font-semibold text-indigo-600 hover:underline">
                For Employers →
              </Link>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <Shield className="h-8 w-8 text-emerald-600" />
              <h3 className="mt-4 text-xl font-bold text-slate-900">Verified jobs. Better matches. Less spam.</h3>
              <p className="mt-2 text-slate-600">
                Every job and company goes through quality checks to reduce fake listings, scam roles, and irrelevant applications. Trust matters — especially in India.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-indigo-600 py-16">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold text-white">Apply where your profile has the strongest signal</h2>
          <p className="mt-3 text-indigo-100">Stop applying blindly. Apply smarter.</p>
          <Link
            href="/register"
            className="mt-8 inline-block rounded-xl bg-white px-8 py-3 font-semibold text-indigo-600 hover:bg-indigo-50"
          >
            Upload CV and Get Your Score
          </Link>
        </div>
      </section>
    </div>
  );
}

function HeroJobCard({
  title,
  company,
  match,
  missing,
  high,
  low,
}: {
  title: string;
  company: string;
  match: number;
  missing: string;
  high?: boolean;
  low?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="text-xs text-slate-500">{company}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
          high ? 'bg-emerald-100 text-emerald-800' : low ? 'bg-slate-200 text-slate-600' : 'bg-amber-100 text-amber-800'
        }`}>
          {match}%
        </span>
      </div>
      <p className="mt-2 text-xs text-amber-700">Missing: {missing}</p>
      <p className="mt-1 text-xs font-medium text-indigo-600">→ Improve CV</p>
    </div>
  );
}
