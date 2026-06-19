import { getProbabilityColor } from '@careersignal/shared';
import { cn } from '@/lib/utils';

interface Props {
  score: number | null;
  size?: 'sm' | 'md';
}

export function JobMatchBadge({ score, size = 'sm' }: Props) {
  if (score === null || score === undefined) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        score >= 75 ? 'bg-success-soft text-success' :
        score >= 50 ? 'bg-warning-soft text-warning-foreground' :
        'bg-risk-soft text-risk',
        getProbabilityColor(score),
      )}
    >
      {Math.round(score)}% fit
    </span>
  );
}
