import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HealthReport } from "@/lib/health.functions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

async function fetchHealth(): Promise<HealthReport> {
  const res = await fetch("/api/health", { cache: "no-store" });
  // 503 still returns a JSON body we want to read.
  return res.json();
}

export function AiStatusIndicator({ className }: { className?: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["ai-health"],
    queryFn: fetchHealth,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  const ai = data?.ai;
  const severity = isError ? "down" : (ai?.severity ?? (isLoading ? "loading" : "ok"));

  const config = {
    ok: {
      label: "AI healthy",
      Icon: CheckCircle2,
      cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      dot: "bg-emerald-500",
    },
    degraded: {
      label: ai?.rateLimited ? "AI rate-limited" : "AI degraded",
      Icon: AlertTriangle,
      cls: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
      dot: "bg-amber-500 animate-pulse",
    },
    down: {
      label: ai?.timedOut ? "AI timing out" : "AI unavailable",
      Icon: XCircle,
      cls: "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400",
      dot: "bg-red-500 animate-pulse",
    },
    loading: {
      label: "Checking AI",
      Icon: Loader2,
      cls: "border-border bg-muted text-muted-foreground",
      dot: "bg-muted-foreground",
    },
  }[severity];

  const { Icon } = config;
  const detail = isError
    ? "Could not reach /api/health"
    : (ai?.detail ?? "Pinging AI Gateway…");

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`${config.label}: ${detail}`}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              config.cls,
              className,
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
            <Icon
              className={cn("h-3.5 w-3.5", severity === "loading" && "animate-spin")}
              strokeWidth={2.25}
            />
            <span className="hidden sm:inline">{config.label}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <div className="text-xs font-semibold">{config.label}</div>
            <div className="text-xs text-muted-foreground">{detail}</div>
            {typeof ai?.ms === "number" && (
              <div className="text-[10px] text-muted-foreground">
                Last check: {ai.ms}ms
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function AiStatusBanner() {
  const { data } = useQuery({
    queryKey: ["ai-health"],
    queryFn: fetchHealth,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const ai = data?.ai;
  if (!ai || ai.severity === "ok") return null;

  const isDown = ai.severity === "down";
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 border-b px-4 py-2.5 text-sm lg:px-8",
        isDown
          ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
          : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">
        <div className="font-medium">
          {isDown
            ? "AI features are temporarily unavailable"
            : ai.rateLimited
              ? "AI is rate-limiting requests"
              : "AI responses are slower than usual"}
        </div>
        <div className="text-xs opacity-80">{ai.detail}</div>
      </div>
    </div>
  );
}
