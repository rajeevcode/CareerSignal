import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingShell } from "@/components/cs/marketing-shell";
import { Lock } from "lucide-react";
import {
  usePolicy,
  PolicyBody,
  PolicyLoading,
  formatUpdated,
} from "@/components/cs/policy";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | CareerSignal" },
      {
        name: "description",
        content:
          "How CareerSignal collects, uses, and protects your information, and the choices you have.",
      },
      { property: "og:title", content: "Privacy Policy — CareerSignal" },
      {
        property: "og:description",
        content: "Data we collect, how we use it, and your choices.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { data, loading } = usePolicy("privacy");
  return (
    <MarketingShell>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          <Lock className="h-4 w-4" />
          {data?.title ?? "Privacy Policy"}
        </div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          This policy explains what we collect and how we use it. It is
          informational and not legal advice.
        </p>

        <article className="mt-10 rounded-2xl border border-border bg-card p-6 sm:p-8">
          {loading ? <PolicyLoading /> : data ? <PolicyBody body={data.body} /> : null}
        </article>

        <p className="mt-6 text-xs text-muted-foreground">
          Last updated: {formatUpdated(data?.updated_at)}. Questions?{" "}
          <Link to="/contact" className="text-primary hover:underline">
            Contact us
          </Link>
          .
        </p>
      </section>
    </MarketingShell>
  );
}
