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
        score >= 75 ? 'bg-emerald-100 text-emerald-800' :
        score >= 50 ? 'bg-amber-100 text-amber-800' :
        'bg-slate-100 text-slate-600',
        getProbabilityColor(score),
      )}
    >
      {Math.round(score)}% fit
    </span>
  );
}
