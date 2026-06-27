import type { AssistantContext } from "@/lib/types";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Contextual SLOTH Assistant card — live mode uses inbox analysis, demo uses seeds.
 */
export function AssistantInsightCard({
  context,
  onAction,
  className,
  compact,
}: {
  context: AssistantContext;
  onAction?: (action: string) => void;
  className?: string;
  compact?: boolean;
}) {
  const insight = api.getAssistantInsight(context);
  if (!insight) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-moss-200/70 bg-gradient-to-br from-moss-50 to-white p-4 shadow-soft",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl">
          <img
            src="/sloth-logo.png"
            alt=""
            className="h-9 w-9 object-cover"
            aria-hidden="true"
          />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-moss-700">
            {insight.title}
          </p>
          <p
            className={cn(
              "mt-1 text-ink-700",
              compact ? "text-sm" : "text-sm leading-relaxed"
            )}
          >
            {insight.message}
          </p>
          {insight.suggestedActions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {insight.suggestedActions.map((action) => (
                <button
                  key={action}
                  onClick={() => onAction?.(action)}
                  className="rounded-lg border border-moss-200 bg-white px-2.5 py-1 text-xs font-medium text-moss-700 transition-colors hover:bg-moss-50 focus-ring"
                >
                  {action}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
