import { cn } from "@/lib/utils";

/**
 * SLOTH wordmark. The mark is a calm, abstract leaf/eye glyph — a subtle nod to
 * the mascot without leaning on literal sloth imagery, keeping it credible for
 * workplace use.
 */
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
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect width="64" height="64" rx="16" fill="#245a42" />
        <circle cx="32" cy="33" r="18" fill="#8ec7a5" />
        <circle cx="25" cy="30" r="5.5" fill="#1f4836" />
        <circle cx="39" cy="30" r="5.5" fill="#1f4836" />
        <circle cx="25" cy="30" r="2" fill="#f1f8f4" />
        <circle cx="39" cy="30" r="2" fill="#f1f8f4" />
        <path
          d="M26 41c2.5 2.5 9.5 2.5 12 0"
          stroke="#1f4836"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      {showWordmark && (
        <span className="text-lg font-extrabold tracking-tight text-ink-900">
          SLOTH
        </span>
      )}
    </span>
  );
}
