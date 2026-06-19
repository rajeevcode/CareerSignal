import { cn } from '@/lib/utils';

interface Props {
  score: number;
  max?: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = { sm: 48, md: 72, lg: 96 };

export function ScoreRing({ score, max = 100, label, size = 'md', className }: Props) {
  const dim = sizes[size];
  const pct = Math.min(100, Math.max(0, (score / max) * 100));
  const r = (dim - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 75 ? 'var(--success)' : pct >= 55 ? 'var(--warning)' : 'var(--risk)';

  return (
    <div className={cn('relative flex flex-col items-center gap-2', className)} role="img" aria-label={`${label}: ${Math.round(score)} out of ${max}`}>
      <svg width={dim} height={dim} className="-rotate-90">
        <circle cx={dim / 2} cy={dim / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={6} />
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: dim, height: dim }}>
        <span className="text-lg font-bold tracking-tight text-foreground">{Math.round(score)}</span>
      </div>
      <span className="text-center text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

export function ScoreBar({ score, label, className }: { score: number; label: string; className?: string }) {
  const pct = Math.min(100, Math.max(0, score));
  const barColor = pct >= 75 ? 'bg-success' : pct >= 55 ? 'bg-warning' : 'bg-risk';
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{Math.round(score)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full transition-all duration-700 ease-out', barColor)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
