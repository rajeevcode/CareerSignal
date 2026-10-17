import { cn } from "@/lib/utils";

interface ScoreRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
  tone?: "primary" | "success" | "warning" | "risk";
}

const toneColor = {
  primary: "var(--primary)",
  success: "var(--success)",
  warning: "var(--warning)",
  risk: "var(--risk)",
} as const;

export function ScoreRing({
  value,
  max = 100,
  size = 120,
  strokeWidth = 10,
  label,
  className,
  tone = "primary",
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, value / max));
  const offset = circumference * (1 - pct);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--muted)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={toneColor[tone]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          fill="none"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tracking-tight text-foreground">{value}</span>
        {label ? (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
        ) : (
          <span className="text-xs text-muted-foreground">/ {max}</span>
        )}
      </div>
    </div>
  );
}
