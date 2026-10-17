import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  FileText,
  Wand2,
  Target,
  Briefcase,
  Inbox,
  GraduationCap,
  MessageCircle,
  Menu,
  X,
  Signal,
  LogOut,
  ShieldCheck,
  Crown,
  UserCircle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AiStatusBanner, AiStatusIndicator } from "@/components/cs/ai-status-indicator";
import { ThemeToggle } from "@/components/cs/theme";
import { getMyPlan } from "@/lib/billing.functions";
import { FREE_LIMITS } from "@/lib/billing";


type NavItem = {
  to: "/app" | "/pipeline" | "/cv-doctor" | "/cv-versions" | "/cover-letters" | "/interview-prep" | "/ats-check" | "/account";
  label: string;
  icon: typeof LayoutDashboard;
  soon?: boolean;
};
const nav: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard },
  { to: "/cv-doctor", label: "CV Doctor", icon: FileText },
  { to: "/ats-check", label: "ATS Check", icon: ShieldCheck },
  { to: "/cv-versions", label: "CV Versions", icon: Wand2 },
  { to: "/cv-doctor", label: "JD Match", icon: Target },
  { to: "/cover-letters", label: "Cover Letters", icon: FileText },
  { to: "/app", label: "Jobs", icon: Briefcase, soon: true },
  { to: "/pipeline", label: "Pipeline", icon: Inbox },
  { to: "/interview-prep", label: "Interview Prep", icon: GraduationCap },
  { to: "/app", label: "Career Coach", icon: MessageCircle, soon: true },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 -translate-x-full border-r border-border bg-card transition-transform lg:static lg:translate-x-0",
          open && "translate-x-0",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight text-foreground">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Signal className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <span className="text-base">CareerSignal</span>
          </Link>
          <button
            className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-accent lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {nav.map((n) => {
            const Icon = n.icon;
            const active = !n.soon && pathname === n.to;
            return (
              <Link
                key={n.label}
                to={n.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                  active && "bg-primary/10 text-primary",
                )}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  {n.label}
                </span>
                {n.soon && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    soon
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="absolute inset-x-0 bottom-0 border-t border-border p-3">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md lg:px-8">
          <button
            className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-accent lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="text-sm font-medium text-muted-foreground">Candidate workspace</div>
          <div className="ml-auto flex items-center gap-2">
            <PlanBadge />
            <AiStatusIndicator />
            <ThemeToggle />
            <Link
              to="/account"
              className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              aria-label="Account"
            >
              <UserCircle className="h-5 w-5" />
            </Link>
          </div>
        </header>
        <AiStatusBanner />
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

function PlanBadge() {
  const fn = useServerFn(getMyPlan);
  const { data } = useQuery({ queryKey: ["my-plan"], queryFn: () => fn(), staleTime: 60_000 });
  if (!data) return null;
  if (data.plan === "pro") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
        <Crown className="h-3 w-3" /> Pro
      </span>
    );
  }
  const cvLeft = Math.max(0, FREE_LIMITS.cvUploads - data.usage.cv_upload_count);
  const jdLeft = Math.max(0, FREE_LIMITS.jdMatchesMonthly - data.usage.jd_match_count_monthly);
  return (
    <div className="hidden items-center gap-2 sm:flex">
      <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
        {cvLeft} CVs · {jdLeft} JD matches left
      </span>
      <Button asChild size="sm" variant="default" className="h-7 gap-1">
        <Link to="/checkout">
          <Sparkles className="h-3 w-3" /> Upgrade
        </Link>
      </Button>
    </div>
  );
}

