import Link from 'next/link';

export default function CheckoutCancelPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Checkout cancelled</h1>
      <p className="mt-2 text-muted-foreground">No changes were made. You can upgrade any time.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/pricing" className="btn-primary px-6 py-2.5">Back to pricing</Link>
        <Link href="/dashboard" className="rounded-lg border border-border bg-card px-6 py-2.5 font-semibold text-foreground hover:bg-muted">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
