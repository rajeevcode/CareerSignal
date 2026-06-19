import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  accent?: 'primary' | 'success' | 'warning' | 'neutral';
  className?: string;
}

const accents = {
  primary: 'text-primary bg-accent',
  success: 'text-success bg-success-soft',
  warning: 'text-warning-foreground bg-warning-soft',
  neutral: 'text-foreground bg-muted',
};

const valueAccents = {
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning-foreground',
  neutral: 'text-foreground',
};

export function MetricCard({ label, value, hint, icon: Icon, accent = 'neutral', className }: Props) {
  return (
    <div className={cn('card-surface flex flex-col gap-2 p-5', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        {Icon && (
          <span className={cn('grid h-8 w-8 place-items-center rounded-md', accents[accent])}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className={cn('text-3xl font-bold tracking-tight', valueAccents[accent])}>{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
