import type { ReactNode } from 'react';
import { AuthValueSlider } from './AuthValueSlider';

/**
 * Premium split-screen auth shell: dynamic value slider on the left (desktop),
 * the login/register form on the right. Collapses to a single column on mobile
 * with a compact slider above the form.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch lg:gap-10 lg:py-16">
      {/* Form first on mobile; proof panel returns to the left on desktop. */}
      <div className="order-1 flex items-center lg:order-2">
        <div className="w-full">
          <div className="mx-auto w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-[var(--shadow-elegant)] sm:p-8">
            {children}
          </div>
        </div>
      </div>

      <div className="order-2 lg:order-1">
        <div className="lg:hidden">
          <AuthValueSlider className="min-h-[14rem]" compact />
        </div>
        <div className="hidden h-full lg:block">
          <AuthValueSlider />
        </div>
      </div>
    </div>
  );
}
