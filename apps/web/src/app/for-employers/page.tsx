import Link from 'next/link';

export default function ForEmployersPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">Shortlist better candidates faster</h1>
      <p className="mt-4 text-lg text-slate-600">
        CareerSignal ranks applicants by fit, readiness, location, salary, and availability.
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        {[
          { title: 'AI job description scoring', desc: 'Improve titles, salary clarity, and required skills before you post.' },
          { title: 'Interview-ready shortlist', desc: 'See candidates ranked by match score, notice period, and salary fit.' },
          { title: 'Semantic resume search', desc: 'Find candidates by skills and domain — not just exact keywords.' },
          { title: 'Fewer irrelevant applications', desc: 'Candidates see their probability before applying, reducing noise.' },
        ].map((item) => (
          <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="font-semibold text-slate-900">{item.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
          </div>
        ))}
      </div>
      <div className="mt-10 rounded-xl border border-indigo-200 bg-indigo-50 p-8">
        <h2 className="text-xl font-semibold text-indigo-900">Recruiter MVP — Phase 2</h2>
        <p className="mt-2 text-indigo-800">
          Company signup, job posting, AI shortlist, messaging, and billing are on the roadmap. For early access, use the admin panel if you have access.
        </p>
        <Link href="/" className="mt-6 inline-block text-indigo-600 hover:underline">← Back to home</Link>
      </div>
    </div>
  );
}
