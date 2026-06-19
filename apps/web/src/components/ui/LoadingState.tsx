import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  message?: string;
  steps?: string[];
  className?: string;
}

export function LoadingState({ message = 'Loading...', steps, className }: Props) {
  return (
    <div className={cn('card-surface flex flex-col items-center p-12 text-center', className)}>
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="mt-4 font-medium text-foreground">{message}</p>
      {steps && steps.length > 0 && (
        <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
          {steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
