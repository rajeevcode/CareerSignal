import Link from 'next/link';

export default function SalaryGuidePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
      <h1 className="text-3xl font-bold text-foreground">Salary Guide</h1>
      <p className="mt-4 text-muted-foreground">
        Salary benchmarks for AI, Product, and Tech roles across India, EU, and remote markets — coming in Phase 3.
      </p>
      <Link href="/jobs" className="mt-8 inline-block text-primary hover:underline">Browse jobs with salary data →</Link>
    </div>
  );
}
