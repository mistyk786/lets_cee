import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "accent";

const tones: Record<Tone, string> = {
  neutral: "bg-ink-100/90 text-ink-600 ring-ink-300/40",
  info: "bg-calendar/10 text-calendar ring-calendar/20",
  success: "bg-moss-100/90 text-moss-700 ring-moss-400/30",
  warning: "bg-amber-100/90 text-amber-700 ring-amber-400/30",
  danger: "bg-red-100/90 text-red-700 ring-red-400/30",
  accent: "bg-ai/10 text-ai ring-ai/20",
};

export function Badge({
  children,
  tone = "neutral",
  className,
  dot,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        tones[tone],
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
