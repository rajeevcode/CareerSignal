import Link from 'next/link';
import { Check } from 'lucide-react';

const BENEFITS = [
  'View more matched jobs',
  'Save jobs to your tracker',
  'Match each job against your CV',
  'See missing keywords before applying',
  'Track applications from saved to offer',
];

/** Inline signup gate shown to guests after the first 2 job previews. */
export function GuestJobsGate() {
  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary-glow/40 p-7 text-white shadow-sm sm:p-8">
      <h2 className="text-xl font-bold">Unlock your personalized job feed</h2>
      <p className="mt-2 max-w-xl text-sm text-white/75">
        Create a free CareerSignal account to see more jobs ranked by your CV fit, interview signal, visa
        preference, location, and role goals.
      </p>

      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {BENEFITS.map((b) => (
          <li key={b} className="flex items-center gap-2 text-sm text-white/90">
            <Check className="h-4 w-4 shrink-0 text-success" /> {b}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link
          href="/register"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-white px-5 text-sm font-semibold text-primary hover:bg-white/90 sm:w-auto"
        >
          Create Free Account
        </Link>
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/30 px-5 text-sm font-semibold text-white hover:bg-white/10"
        >
          Log In
        </Link>
        <Link href="/pricing" className="inline-flex min-h-11 items-center justify-center text-sm font-medium text-white/80 hover:text-white hover:underline">
          View Pricing
        </Link>
      </div>
    </div>
  );
}
