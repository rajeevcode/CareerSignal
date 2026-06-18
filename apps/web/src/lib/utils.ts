import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSalary(min: number | null, max: number | null, currency = 'INR'): string {
  if (!min && !max) return 'Not disclosed';
  const fmt = (n: number) => {
    if (currency === 'INR') return `₹${(n / 100000).toFixed(1)}L`;
    if (currency === 'EUR') return `€${(n / 1000).toFixed(0)}k`;
    return `$${(n / 1000).toFixed(0)}k`;
  };
  if (min && max) return `${fmt(min)} - ${fmt(max)}`;
  return min ? `${fmt(min)}+` : `Up to ${fmt(max!)}`;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function getAiServiceUrl(): string {
  return process.env.AI_SERVICE_URL || 'http://localhost:8000';
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}
