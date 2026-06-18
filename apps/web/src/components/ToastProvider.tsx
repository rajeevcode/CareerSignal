'use client';

import Link from 'next/link';
import { CheckCircle2, X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export interface ToastAction {
  label: string;
  href: string;
}

export interface ToastInput {
  title: string;
  description?: string;
  action?: ToastAction;
  durationMs?: number;
}

interface ToastState extends ToastInput {
  id: number;
}

interface ToastContextValue {
  showToast: (toast: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((toast: ToastInput) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { ...toast, id }]);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div aria-live="polite" className="pointer-events-none">
        <div className="pointer-events-auto fixed bottom-20 left-4 right-4 z-50 flex flex-col gap-2 sm:left-auto sm:right-6 sm:max-w-sm lg:bottom-6">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, toast.durationMs ?? 8000);
    return () => window.clearTimeout(timer);
  }, [onDismiss, toast.durationMs]);

  return (
    <div
      className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-white p-4 shadow-lg"
      role="status"
    >
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-900">{toast.title}</p>
        {toast.description && (
          <p className="mt-1 text-sm text-slate-600">{toast.description}</p>
        )}
        {toast.action && (
          <Link
            href={toast.action.href}
            className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            {toast.action.label} →
          </Link>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
