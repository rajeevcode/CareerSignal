import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { MarketingShell } from "@/components/cs/marketing-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Sparkles, Shield, ArrowRight } from "lucide-react";
import { activateProPlaceholder } from "@/lib/billing.functions";
import { PRO_PRICE_LABEL, PRO_CADENCE_LABEL } from "@/lib/billing";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

const search = z.object({ feature: z.string().optional() });

export const Route = createFileRoute("/checkout")({
  validateSearch: (s) => search.parse(s),
  head: () => ({
    meta: [
      { title: "Checkout — CareerSignal Pro" },
      { name: "description", content: "Upgrade to CareerSignal Pro for unlimited CV scoring, JD matching, and career tools — $9/month." },
    ],
  }),
  component: CheckoutPage,
});

const BENEFITS = [
  "Unlimited CV uploads & versions",
  "Unlimited JD matches",
  "Advanced CV score with section feedback",
  "AI bullet & summary rewrite",
  "Estimated shortlisting probability",
  "Unlimited saved jobs & application tracking",
  "Interview Prep, Career Coach, Export CV",
];

function CheckoutPage() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
  }, []);

  const activate = useServerFn(activateProPlaceholder);
  const mut = useMutation({
    mutationFn: () => activate(),
    onSuccess: () => navigate({ to: "/checkout/success" }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't activate"),
  });

  return (
    <MarketingShell>
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <div className="mb-8 text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary">Checkout</div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Continue to CareerSignal Pro
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Cancel anytime. No long-term contracts.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-7">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="h-4 w-4" /> CareerSignal Pro
            </div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl font-bold tracking-tight">{PRO_PRICE_LABEL}</span>
              <span className="text-muted-foreground">{PRO_CADENCE_LABEL}</span>
            </div>
            <ul className="mt-6 space-y-2 text-sm">
              {BENEFITS.map((b) => (
                <li key={b} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{b}</li>
              ))}
            </ul>
          </Card>

          <Card className="p-7">
            <h2 className="text-lg font-semibold">Payment</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Payment processing is being connected. For now, you can activate a Pro trial on this account to preview the full product.
            </p>
            <div className="mt-5 rounded-lg border border-border bg-muted/40 p-4 text-sm">
              <div className="font-medium text-foreground">CareerSignal Pro — monthly</div>
              <div className="mt-1 flex items-center justify-between text-muted-foreground">
                <span>Subtotal</span><span>{PRO_PRICE_LABEL}/mo</span>
              </div>
              <div className="mt-1 flex items-center justify-between font-semibold text-foreground">
                <span>Total today</span><span>{PRO_PRICE_LABEL}</span>
              </div>
            </div>

            {authed === false ? (
              <Button asChild size="lg" className="mt-5 w-full">
                <Link to="/auth" search={{ mode: "signup" }}>Sign in to continue<ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            ) : (
              <Button
                size="lg"
                className="mt-5 w-full"
                onClick={() => mut.mutate()}
                disabled={mut.isPending || authed === null}
              >
                {mut.isPending ? "Activating…" : "Continue to Payment"}
              </Button>
            )}

            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5" /> Secure activation. Cancel anytime from your account.
            </div>
            <Link to="/checkout/cancel" className="mt-2 block text-center text-xs text-muted-foreground hover:underline">
              Cancel and go back
            </Link>
          </Card>
        </div>
      </section>
    </MarketingShell>
  );
}
