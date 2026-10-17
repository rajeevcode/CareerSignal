import { getProbabilityLabel } from '@careersignal/shared';
import { TrendingUp, Minus, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  score: number;
  className?: string;
  showScore?: boolean;
}

export function SignalBadge({ score, className, showScore = true }: Props) {
  const label = getProbabilityLabel(score);
  const { styles, Icon } =
    score >= 70
      ? { styles: 'bg-success-soft text-success border-success/20', Icon: TrendingUp }
      : score >= 55
        ? { styles: 'bg-warning-soft text-warning-foreground border-warning/30', Icon: Minus }
        : { styles: 'bg-risk-soft text-risk border-risk/20', Icon: AlertTriangle };

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium', styles, className)}>
      <Icon className="h-3.5 w-3.5" />
      {showScore && <span className="font-semibold">{Math.round(score)}/100</span>}
      <span>{label}</span>
    </span>
  );
}
