import { cn } from "@/lib/utils";
import { TrendingUp, Minus, AlertTriangle } from "lucide-react";

type Signal = "Strong" | "Moderate" | "Weak";

const styles: Record<Signal, string> = {
  Strong: "bg-success-soft text-success border-success/20",
  Moderate: "bg-warning-soft text-warning-foreground border-warning/30",
  Weak: "bg-risk-soft text-risk border-risk/20",
};

const icons: Record<Signal, typeof TrendingUp> = {
  Strong: TrendingUp,
  Moderate: Minus,
  Weak: AlertTriangle,
};

export function SignalBadge({
  signal,
  label,
  className,
}: {
  signal: Signal;
  label?: string;
  className?: string;
}) {
  const Icon = icons[signal];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        styles[signal],
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label ?? `${signal} signal`}
    </span>
  );
}

export function MatchBadge({ value, className }: { value: number; className?: string }) {
  const tone = value >= 80 ? "Strong" : value >= 65 ? "Moderate" : "Weak";
  return <SignalBadge signal={tone as Signal} label={`${value}% match`} className={className} />;
}
