import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "success" | "warning" | "info";
}) {
  const toneClass = {
    default: "text-foreground",
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    info: "text-primary",
  }[tone];

  return (
    <Card className="flex flex-col gap-2 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
        {Icon && (
          <span className={cn("grid h-7 w-7 place-items-center rounded-md bg-muted", toneClass)}>
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <div className={cn("text-3xl font-bold tracking-tight tabular-nums", toneClass)}>{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </Card>
  );
}
