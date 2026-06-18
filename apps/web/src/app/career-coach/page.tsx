import Link from 'next/link';

export default function CareerCoachPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
      <h1 className="text-3xl font-bold text-slate-900">AI Career Coach</h1>
      <p className="mt-4 text-slate-600">
        Ask: &quot;Which jobs should I apply to today?&quot; · &quot;Why am I not getting interviews?&quot; · &quot;Rewrite my CV for this role.&quot;
      </p>
      <p className="mt-2 text-sm text-slate-500">Full AI coach chat coming in Phase 3. For now, use job match explainability and CV gap analysis.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/recommended" className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">
          View Recommended Jobs
        </Link>
        <Link href="/cv" className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium hover:bg-slate-50">
          Upload CV
        </Link>
      </div>
    </div>
  );
}
