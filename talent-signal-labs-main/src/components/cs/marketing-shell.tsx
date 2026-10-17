import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Menu, X, Signal } from "lucide-react";
import { ThemeToggle } from "@/components/cs/theme";

const navLinks = [
  { to: "/product", label: "Product" },
  { to: "/cv-score", label: "CV Score" },
  { to: "/jd-match", label: "JD Match" },
  { to: "/jobs", label: "Jobs" },
  { to: "/demo", label: "Demo" },
  { to: "/for-recruiters", label: "For Recruiters" },
  { to: "/pricing", label: "Pricing" },
] as const;

export function CSLogo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2 font-semibold tracking-tight text-foreground", className)}>
      <span
        aria-hidden
        className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground"
      >
        <Signal className="h-4 w-4" strokeWidth={2.5} />
      </span>
      <span className="text-base">CareerSignal</span>
    </Link>
  );
}

function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-3 sm:px-6">
        <CSLogo />

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                pathname === l.to && "bg-accent text-accent-foreground",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild>
            <Link to="/auth" search={{ mode: "signin" }}>
              Log in
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/auth" search={{ mode: "signup" }}>
              Get started
            </Link>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-accent md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  pathname === l.to && "bg-accent text-accent-foreground",
                )}
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/auth" search={{ mode: "signin" }} onClick={() => setOpen(false)}>
                  Log in
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/auth" search={{ mode: "signup" }} onClick={() => setOpen(false)}>
                  Get started
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <CSLogo />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Build your CV. Match any job. Know your interview signal.
            </p>
          </div>

          <FooterCol
            title="Product"
            links={[
              { to: "/product", label: "Overview" },
              { to: "/cv-score", label: "CV Score" },
              { to: "/jd-match", label: "JD Match" },
              { to: "/jobs", label: "Jobs" },
            ]}
          />
          <FooterCol
            title="For teams"
            links={[
              { to: "/for-recruiters", label: "Recruiters" },
              { to: "/pricing", label: "Pricing" },
            ]}
          />
          <FooterCol
            title="Account"
            links={[
              { to: "/auth", label: "Log in", search: { mode: "signin" as const } },
              { to: "/auth", label: "Sign up", search: { mode: "signup" as const } },
              { to: "/contact", label: "Contact Us" },
            ]}
          />
          <FooterCol
            title="Legal"
            links={[
              { to: "/terms", label: "Terms of Service" },
              { to: "/privacy", label: "Privacy Policy" },
              { to: "/copyright", label: "Copyright & DMCA" },
            ]}
          />
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <span>
            © {new Date().getFullYear()} CareerSignal. All rights reserved.
          </span>
          <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link to="/terms" className="hover:text-foreground hover:underline">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-foreground hover:underline">
              Privacy
            </Link>
            <Link to="/copyright" className="hover:text-foreground hover:underline">
              Copyright & DMCA
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: Array<{ to: string; label: string; search?: { mode: "signin" | "signup" } }>;
}) {
  return (
    <div>
      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">{title}</div>
      <ul className="space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.label}>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <Link to={l.to as any} search={l.search as any} className="text-muted-foreground hover:text-foreground">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
