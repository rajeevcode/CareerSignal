import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingShell } from "@/components/cs/marketing-shell";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Restricted Access — CareerSignal" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminRestricted,
});

function AdminRestricted() {
  return (
    <MarketingShell>
      <section className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center sm:px-6">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-foreground">Admin access required</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This area is restricted to verified CareerSignal administrators. If you believe you should have
          access, please log in with an admin account.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link to="/"><ArrowLeft className="h-4 w-4" />Go back to Home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/auth" search={{ mode: "signin" }}>Log in</Link>
          </Button>
        </div>
      </section>
    </MarketingShell>
  );
}
