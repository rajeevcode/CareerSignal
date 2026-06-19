import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingShell } from "@/components/cs/marketing-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/checkout/cancel")({
  head: () => ({ meta: [{ title: "Checkout cancelled — CareerSignal" }] }),
  component: () => (
    <MarketingShell>
      <section className="mx-auto max-w-xl px-4 py-20 sm:px-6">
        <Card className="p-10 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Payment cancelled</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You can continue using the Free plan or upgrade anytime.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button asChild variant="outline"><Link to="/pricing">See pricing</Link></Button>
            <Button asChild><Link to="/app">Back to dashboard</Link></Button>
          </div>
        </Card>
      </section>
    </MarketingShell>
  ),
});
