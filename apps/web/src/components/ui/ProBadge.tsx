import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ProBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warning-foreground',
        className,
      )}
    >
      <Sparkles className="h-2.5 w-2.5" />
      Pro
    </span>
  );
}
