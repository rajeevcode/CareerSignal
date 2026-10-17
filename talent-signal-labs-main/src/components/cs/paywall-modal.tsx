import { Link } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, ArrowRight } from "lucide-react";
import { PRO_PRICE_LABEL, PRO_CADENCE_LABEL, type FeatureKey } from "@/lib/billing";

const PRO_BENEFITS = [
  "Unlimited CV uploads & versions",
  "Unlimited JD matches",
  "Advanced CV score with section feedback",
  "AI bullet & summary rewrite",
  "Estimated shortlisting probability",
  "Unlimited saved jobs & application tracking",
  "Application analytics",
  "Interview Prep & Career Coach",
  "Export optimized CV (PDF/DOCX)",
];

export function PaywallModal({
  open,
  onOpenChange,
  reason,
  feature,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reason?: string;
  feature?: FeatureKey;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-xl">Unlock CareerSignal Pro</DialogTitle>
          <DialogDescription className="text-center">
            {reason ?? "You've reached the Free plan limit."}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-3xl font-bold tracking-tight text-foreground">{PRO_PRICE_LABEL}</span>
            <span className="text-sm text-muted-foreground">{PRO_CADENCE_LABEL}</span>
          </div>
          <ul className="mt-4 space-y-1.5 text-sm">
            {PRO_BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-2 text-foreground/90">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {b}
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button asChild size="lg" className="w-full">
            <Link to="/checkout" search={{ feature: feature ?? undefined }}>
              Upgrade to Pro <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            Maybe later
          </Button>
          <Link to="/pricing" className="text-center text-xs text-muted-foreground hover:underline">
            See full pricing
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type PaywallCtx = {
  open: (opts?: { reason?: string; feature?: FeatureKey }) => void;
};
const Ctx = createContext<PaywallCtx | null>(null);

export function PaywallProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [reason, setReason] = useState<string | undefined>();
  const [feature, setFeature] = useState<FeatureKey | undefined>();

  const open = useCallback((opts?: { reason?: string; feature?: FeatureKey }) => {
    setReason(opts?.reason);
    setFeature(opts?.feature);
    setOpen(true);
  }, []);

  return (
    <Ctx.Provider value={{ open }}>
      {children}
      <PaywallModal open={isOpen} onOpenChange={setOpen} reason={reason} feature={feature} />
    </Ctx.Provider>
  );
}

export function usePaywall() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePaywall must be used inside <PaywallProvider>");
  return ctx;
}

/** Helper: parse the "PAYWALL:feature:reason" error thrown by server fns. */
export function parsePaywallError(err: unknown): { feature?: FeatureKey; reason: string } | null {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  if (!msg.startsWith("PAYWALL:")) return null;
  const [, feature, ...rest] = msg.split(":");
  return { feature: feature as FeatureKey, reason: rest.join(":").trim() };
}
