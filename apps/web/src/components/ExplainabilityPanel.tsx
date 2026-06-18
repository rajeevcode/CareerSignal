import type { MatchExplanation } from '@careersignal/shared';
import { CheckCircle2, AlertTriangle, Lightbulb } from 'lucide-react';

interface Props {
  explanation: MatchExplanation;
}

export function ExplainabilityPanel({ explanation }: Props) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <h3 className="font-semibold text-slate-900">Why this job fits you</h3>
        </div>
        <p className="mt-1 text-xs text-slate-500">You are likely to be considered because:</p>
        <ul className="mt-3 space-y-2">
          {(explanation.strengths || []).map((s, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-700">
              <span className="text-emerald-600">•</span>
              {s}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <h3 className="font-semibold text-slate-900">Why you may not be shortlisted</h3>
        </div>
        <p className="mt-1 text-xs text-slate-500">Your probability is reduced because:</p>
        <ul className="mt-3 space-y-2">
          {(explanation.gaps || []).map((g, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-700">
              <span className="text-amber-600">•</span>
              {g}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-5">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-indigo-600" />
          <h3 className="font-semibold text-slate-900">How to improve your chance</h3>
        </div>
        <ul className="mt-3 space-y-2">
          {(explanation.improvements || []).map((imp, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-700">
              <span className="font-medium text-indigo-600">{i + 1}.</span>
              {imp}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
