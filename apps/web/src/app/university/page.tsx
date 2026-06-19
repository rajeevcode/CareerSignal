import Link from 'next/link';

export default function UniversityPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 text-center">
      <h1 className="text-4xl font-bold text-foreground">CareerSignal for Universities</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Student dashboards, career center analytics, bulk CV review, and employer engagement — built for career services teams.
      </p>
      <ul className="mt-8 space-y-2 text-left text-sm text-muted-foreground card-surface p-6">
        <li>• Automated resume review at scale</li>
        <li>• Outcome tracking by cohort and program</li>
        <li>• Employer partnership tools</li>
        <li>• Career readiness scoring</li>
      </ul>
      <Link href="/for-employers" className="btn-primary mt-8 inline-block px-8 py-3">Contact for partnership</Link>
    </div>
  );
}
