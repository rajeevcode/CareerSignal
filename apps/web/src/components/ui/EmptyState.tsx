import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: { label: string; href: string } | { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({ title, description, icon: Icon, action, className }: Props) {
  return (
    <div className={cn('card-surface flex flex-col items-center p-12 text-center', className)}>
      {Icon && <Icon className="mb-4 h-10 w-10 text-muted-foreground" />}
      <h3 className="font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action &&
        ('href' in action ? (
          <Link href={action.href} className="btn-primary mt-6 px-5 py-2.5 text-sm">
            {action.label}
          </Link>
        ) : (
          <button type="button" onClick={action.onClick} className="btn-primary mt-6 px-5 py-2.5 text-sm">
            {action.label}
          </button>
        ))}
    </div>
  );
}
