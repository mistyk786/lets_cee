import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-lg", className)} />;
}

export function LoadingState({
  label = "Loading…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-16 text-center",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="relative h-10 w-10">
        <span className="absolute inset-0 animate-pulse-ring rounded-full bg-moss-300" />
        <span className="absolute inset-1 rounded-full border-2 border-moss-200 border-t-moss-600 [animation:spin_0.9s_linear_infinite]" />
      </div>
      <p className="text-sm font-medium text-ink-500">{label}</p>
    </div>
  );
}
