import { cn } from "@/lib/utils";

const LOGO_SRC = "/sloth.jpg";

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
        src={LOGO_SRC}
        alt=""
        width={size}
        height={size}
        aria-hidden="true"
        className="shrink-0 rounded-xl object-cover"
      />
      {showWordmark && (
        <span className="text-lg font-extrabold tracking-tight text-ink-900">
          SLOTH
        </span>
      )}
    </span>
  );
}
