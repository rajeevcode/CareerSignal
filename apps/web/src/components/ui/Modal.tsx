'use client';

import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function Modal({ open, onOpenChange, title, description, children, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onOpenChange]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative z-10 w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-glow outline-none',
          className,
        )}
      >
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Close dialog"
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
        {title && <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>}
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        {children}
      </div>
    </div>,
    document.body,
  );
}
