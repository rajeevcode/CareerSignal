import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingShell } from "@/components/cs/marketing-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/checkout/success")({
  head: () => ({ meta: [{ title: "Welcome to Pro — CareerSignal" }] }),
  component: () => (
    <MarketingShell>
      <section className="mx-auto max-w-xl px-4 py-20 sm:px-6">
        <Card className="p-10 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-tight">Welcome to CareerSignal Pro</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account now has unlimited CV scoring, JD matching, and the full career toolkit.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link to="/app">Go to your dashboard<ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </Card>
      </section>
    </MarketingShell>
  ),
});
