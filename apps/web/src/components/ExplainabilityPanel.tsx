import type { MatchExplanation } from '@careersignal/shared';
import { CheckCircle2, AlertTriangle, Lightbulb } from 'lucide-react';

interface Props {
  explanation: MatchExplanation;
}

export function ExplainabilityPanel({ explanation }: Props) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-success/20 bg-success-soft p-5">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <h3 className="font-semibold text-foreground">Why this job fits you</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">You are likely to be considered because:</p>
        <ul className="mt-3 space-y-2">
          {(explanation.strengths || []).map((s, i) => (
            <li key={i} className="flex gap-2 text-sm text-foreground">
              <span className="text-success">•</span>
              {s}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-warning/20 bg-warning-soft p-5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <h3 className="font-semibold text-foreground">Why you may not be shortlisted</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Your probability is reduced because:</p>
        <ul className="mt-3 space-y-2">
          {(explanation.gaps || []).map((g, i) => (
            <li key={i} className="flex gap-2 text-sm text-foreground">
              <span className="text-warning">•</span>
              {g}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/10 p-5">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">How to improve your chance</h3>
        </div>
        <ul className="mt-3 space-y-2">
          {(explanation.improvements || []).map((imp, i) => (
            <li key={i} className="flex gap-2 text-sm text-foreground">
              <span className="font-medium text-primary">{i + 1}.</span>
              {imp}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
