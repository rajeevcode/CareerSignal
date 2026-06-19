import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketingShell } from "@/components/cs/marketing-shell";
import { FileText } from "lucide-react";
import {
  usePolicy,
  PolicyBody,
  PolicyLoading,
  formatUpdated,
} from "@/components/cs/policy";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service | CareerSignal" },
      {
        name: "description",
        content:
          "The terms that govern your use of CareerSignal — accounts, acceptable use, content, billing, and more.",
      },
      { property: "og:title", content: "Terms of Service — CareerSignal" },
      {
        property: "og:description",
        content: "How CareerSignal and its users agree to work together.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  const { data, loading } = usePolicy("terms");
  return (
    <MarketingShell>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          <FileText className="h-4 w-4" />
          {data?.title ?? "Terms of Service"}
        </div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Terms of Service
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          These terms govern your use of CareerSignal. Please read them
          carefully. They are informational and not legal advice.
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
