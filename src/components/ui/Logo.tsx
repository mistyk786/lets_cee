import { cn } from "@/lib/utils";

export function Logo({
  className,
  showWordmark = true,
  size = 32,
}: {
  className?: string;
  showWordmark?: boolean;
  size?: number;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <img
        src="/sloth-logo.png"
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-2xl object-cover"
        aria-hidden="true"
      />
      {showWordmark && (
        <span className="text-lg font-extrabold tracking-tight text-ink-900">
          SLOTH
        </span>
      )}
    </span>
  );
}
