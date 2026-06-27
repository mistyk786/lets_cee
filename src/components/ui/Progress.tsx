import { cn } from "@/lib/utils";

type Tone = "moss" | "info" | "warning" | "danger" | "ink";

const toneClasses: Record<Tone, string> = {
  moss: "bg-moss-500",
  info: "bg-calendar",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  ink: "bg-ink-400",
};

export function ProgressBar({
  value,
  max = 100,
  tone = "moss",
  className,
  showTrack = true,
}: {
  value: number;
  max?: number;
  tone?: Tone;
  className?: string;
  showTrack?: boolean;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full",
        showTrack && "bg-ink-100",
        className
      )}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-700 ease-out",
          toneClasses[tone]
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function ScoreRing({
  score,
  size = 120,
  stroke = 10,
  tone,
  label,
}: {
  score: number;
  size?: number;
  stroke?: number;
  tone?: string;
  label?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    tone ??
    (score >= 90
      ? "#2c7050"
      : score >= 75
        ? "#3d8c62"
        : score >= 50
          ? "#b9863f"
          : "#dc2626");

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#eceef1"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-ink-900">{score}</span>
        {label && (
          <span className="text-[11px] font-medium uppercase tracking-wide text-ink-400">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
