import type { CvFeedback } from '@careersignal/shared';

interface Props {
  feedback: CvFeedback;
}

export function CVFeedbackPanel({ feedback }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="font-semibold text-foreground">CV feedback</h2>
      <div className="mt-4 space-y-4">
        {feedback.good.length > 0 && (
          <div>
            <p className="text-sm font-medium text-success">What is good</p>
            <ul className="mt-1 list-inside list-disc text-sm text-foreground">
              {feedback.good.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        )}
        {feedback.weak.length > 0 && (
          <div>
            <p className="text-sm font-medium text-warning-foreground">Needs improvement</p>
            <ul className="mt-1 list-inside list-disc text-sm text-foreground">
              {feedback.weak.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        )}
        {feedback.rewrite.length > 0 && (
          <div>
            <p className="text-sm font-medium text-primary">What to rewrite</p>
            <ul className="mt-1 list-inside list-disc text-sm text-foreground">
              {feedback.rewrite.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        )}
        {feedback.missing_keywords.length > 0 && (
          <div>
            <p className="text-sm font-medium text-foreground">Missing keywords</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {feedback.missing_keywords.map((kw) => (
                <span key={kw} className="rounded-full bg-warning-soft px-2 py-0.5 text-xs text-warning-foreground">{kw}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
