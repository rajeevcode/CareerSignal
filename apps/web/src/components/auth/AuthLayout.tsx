import type { ReactNode } from 'react';
import { AuthValueSlider } from './AuthValueSlider';

/**
 * Premium split-screen auth shell: dynamic value slider on the left (desktop),
 * the login/register form on the right. Collapses to a single column on mobile
 * with a compact slider above the form.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:items-stretch lg:gap-10 lg:py-16">
      {/* Left value panel — full height on desktop, compact above form on mobile */}
      <div className="order-1 lg:order-none">
        <div className="lg:hidden">
          <AuthValueSlider className="min-h-0" />
        </div>
        <div className="hidden h-full lg:block">
          <AuthValueSlider />
        </div>
      </div>

      {/* Right form column */}
      <div className="order-2 flex items-center lg:order-none">
        <div className="w-full">
          <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
