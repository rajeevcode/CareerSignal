import type { CvFeedback } from '@careersignal/shared';

interface Props {
  feedback: CvFeedback;
}

export function CVFeedbackPanel({ feedback }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="font-semibold text-slate-900">CV feedback</h2>
      <div className="mt-4 space-y-4">
        {feedback.good.length > 0 && (
          <div>
            <p className="text-sm font-medium text-emerald-700">What is good</p>
            <ul className="mt-1 list-inside list-disc text-sm text-slate-700">
              {feedback.good.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        )}
        {feedback.weak.length > 0 && (
          <div>
            <p className="text-sm font-medium text-amber-700">Needs improvement</p>
            <ul className="mt-1 list-inside list-disc text-sm text-slate-700">
              {feedback.weak.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        )}
        {feedback.rewrite.length > 0 && (
          <div>
            <p className="text-sm font-medium text-indigo-700">What to rewrite</p>
            <ul className="mt-1 list-inside list-disc text-sm text-slate-700">
              {feedback.rewrite.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        )}
        {feedback.missing_keywords.length > 0 && (
          <div>
            <p className="text-sm font-medium text-slate-700">Missing keywords</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {feedback.missing_keywords.map((kw) => (
                <span key={kw} className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{kw}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
