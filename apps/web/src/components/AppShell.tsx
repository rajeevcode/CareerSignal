'use client';

import Link from 'next/link';
import { Menu, Search, X } from 'lucide-react';
import { useState } from 'react';
import { SidebarNav } from '@/components/SidebarNav';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-[calc(100vh-3.75rem)] lg:flex">
      <aside className="hidden w-64 shrink-0 border-r border-border/80 bg-card/80 lg:block">
        <div className="sticky top-[60px] p-3">
          <div className="mb-3 rounded-lg border border-border bg-background/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workspace</p>
            <p className="mt-1 text-sm font-semibold text-foreground">Candidate cockpit</p>
          </div>
          <SidebarNav />
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-50 h-full w-80 max-w-[86vw] bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border p-4">
              <span className="font-semibold text-foreground">CareerSignal</span>
              <button type="button" className="grid h-9 w-9 place-items-center rounded-md hover:bg-muted" onClick={() => setMobileOpen(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-border bg-card/90 px-4 py-3 lg:hidden">
          <button type="button" className="grid h-9 w-9 place-items-center rounded-md hover:bg-muted" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/dashboard" className="font-semibold text-foreground">
            CareerSignal
          </Link>
        </div>
        <div className="hidden items-center justify-between border-b border-border/80 bg-background/70 px-6 py-3 backdrop-blur lg:flex">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm">
            <Search className="h-4 w-4" />
            <span>Search jobs, tools, applications</span>
          </div>
          <div className="text-xs font-medium text-muted-foreground">Signals update as your CV and job activity change</div>
        </div>
        <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </div>
    </div>
  );
}
