import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export type PolicySlug = "copyright" | "terms" | "privacy";

export interface PolicyRow {
  slug: string;
  title: string;
  body: string;
  updated_at: string;
}

export function usePolicy(slug: PolicySlug) {
  const [data, setData] = useState<PolicyRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from("site_policies")
      .select("slug,title,body,updated_at")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) setError(error.message);
        setData(data as PolicyRow | null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { data, loading, error };
}

export function PolicyBody({ body }: { body: string }) {
  return (
    <div className="prose-policy">
      <ReactMarkdown
        components={{
          h1: ({ node, ...p }) => (
            <h2 className="mt-8 text-2xl font-semibold tracking-tight text-foreground" {...p} />
          ),
          h2: ({ node, ...p }) => (
            <h2 className="mt-8 text-xl font-semibold tracking-tight text-foreground" {...p} />
          ),
          h3: ({ node, ...p }) => (
            <h3 className="mt-6 text-base font-semibold text-foreground" {...p} />
          ),
          p: ({ node, ...p }) => (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground" {...p} />
          ),
          ul: ({ node, ...p }) => (
            <ul className="mt-3 ml-5 list-disc space-y-2 text-sm leading-relaxed text-muted-foreground" {...p} />
          ),
          ol: ({ node, ...p }) => (
            <ol className="mt-3 ml-5 list-decimal space-y-2 text-sm leading-relaxed text-muted-foreground" {...p} />
          ),
          a: ({ node, ...p }) => (
            <a className="text-primary hover:underline" {...p} />
          ),
          strong: ({ node, ...p }) => (
            <strong className="font-semibold text-foreground" {...p} />
          ),
          code: ({ node, ...p }) => (
            <code className="rounded bg-muted px-1 py-0.5 text-xs" {...p} />
          ),
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}

export function PolicyLoading() {
  return (
    <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Loading policy…
    </div>
  );
}

export function formatUpdated(ts?: string | null) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}
