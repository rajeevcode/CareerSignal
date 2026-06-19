import ReactMarkdown from 'react-markdown';
import { formatUpdated, type PolicyRow } from '@/lib/policies';

function PolicyBody({ body }: { body: string }) {
  return (
    <div>
      <ReactMarkdown
        components={{
          h1: (p) => <h2 className="mt-8 text-2xl font-semibold tracking-tight text-foreground" {...p} />,
          h2: (p) => <h2 className="mt-8 text-xl font-semibold tracking-tight text-foreground" {...p} />,
          h3: (p) => <h3 className="mt-6 text-base font-semibold text-foreground" {...p} />,
          p: (p) => <p className="mt-3 text-sm leading-relaxed text-muted-foreground" {...p} />,
          ul: (p) => <ul className="mt-3 ml-5 list-disc space-y-2 text-sm leading-relaxed text-muted-foreground" {...p} />,
          ol: (p) => <ol className="mt-3 ml-5 list-decimal space-y-2 text-sm leading-relaxed text-muted-foreground" {...p} />,
          a: (p) => <a className="text-primary hover:underline" {...p} />,
          strong: (p) => <strong className="font-semibold text-foreground" {...p} />,
          code: (p) => <code className="rounded bg-muted px-1 py-0.5 text-xs" {...p} />,
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}

/** Renders a policy page (title + markdown body + last-updated). Falls back gracefully if not seeded. */
export function PolicyView({ policy, fallbackTitle }: { policy: PolicyRow | null; fallbackTitle: string }) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        {policy?.title ?? fallbackTitle}
      </h1>
      {policy ? (
        <>
          <PolicyBody body={policy.body} />
          {policy.updated_at && (
            <p className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
              Last updated {formatUpdated(policy.updated_at)}
            </p>
          )}
        </>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">This policy is being updated. Please check back soon.</p>
      )}
    </section>
  );
}
