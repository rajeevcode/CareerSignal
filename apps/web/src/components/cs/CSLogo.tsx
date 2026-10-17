import Link from 'next/link';
import { Signal } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CSLogo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn('flex items-center gap-2 font-semibold tracking-tight text-foreground', className)}>
      <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Signal className="h-4 w-4" strokeWidth={2.5} />
      </span>
      <span className="text-base">CareerSignal</span>
    </Link>
  );
}
