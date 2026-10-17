import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

export default function CheckoutSuccessPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-success-soft text-success">
        <CheckCircle2 className="h-8 w-8" />
      </div>
      <h1 className="mt-5 text-3xl font-bold tracking-tight text-foreground">Welcome to CareerSignal Pro</h1>
      <p className="mt-2 text-muted-foreground">
        Your account is upgraded. All advanced features are now unlocked — unlimited JD matches, CV
        rewrites, interview prep, cover letters, and more.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/dashboard" className="btn-primary px-6 py-2.5">Go to dashboard</Link>
        <Link href="/account" className="rounded-lg border border-border bg-card px-6 py-2.5 font-semibold text-foreground hover:bg-muted">
          View account
        </Link>
      </div>
    </div>
  );
}
