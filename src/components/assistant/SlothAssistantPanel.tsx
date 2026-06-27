import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Lightbulb, Shield, Clock } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import type { AssistantContext } from "@/lib/types";

/** Maps the current route to the assistant's context so it changes per screen. */
function contextForPath(pathname: string): AssistantContext {
  if (pathname === "/" || pathname === "") return "landing";
  if (pathname.startsWith("/setup")) return "setup";
  if (pathname.startsWith("/overview")) return "overview";
  if (pathname.startsWith("/opportunities/")) return "opportunity";
  if (pathname.startsWith("/opportunities")) return "opportunity";
  if (pathname.startsWith("/automations")) return "automation";
  if (pathname.startsWith("/insights")) return "effectiveness";
  if (pathname.startsWith("/effectiveness")) return "effectiveness";
  return "overview";
}

const TIPS = [
  {
    icon: Shield,
    title: "Human approval first",
    body: "I keep you in control. Nothing sends without your approval until you tell me otherwise.",
  },
  {
    icon: Clock,
    title: "I improve over time",
    body: "The more approved activity I observe, the more repeatable patterns I can safely surface.",
  },
  {
    icon: Lightbulb,
    title: "Estimates, not promises",
    body: "Forecasts are based on observed frequency and your editable assumptions.",
  },
];

/**
 * Persistent slide-over SLOTH Assistant. Shows the active screen's contextual
 * insight plus a few stable, trustworthy tips. Driven by seeded content.
 */
export function SlothAssistantPanel() {
  const { assistantOpen, setAssistantOpen } = useApp();
  const location = useLocation();
  const context = contextForPath(location.pathname);
  const insight = api.getAssistantInsight(context);

  return (
    <AnimatePresence>
      {assistantOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-ink-900/20 backdrop-blur-[2px]"
            onClick={() => setAssistantOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.aside
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-white shadow-lift"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            aria-label="SLOTH Assistant"
          >
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <img
                  src="/sloth-logo.png"
                  alt=""
                  className="h-8 w-8 rounded-xl object-cover"
                />
                <div>
                  <p className="text-sm font-semibold text-ink-900">
                    SLOTH Assistant
                  </p>
                  <p className="text-xs text-moss-600">Online · context aware</p>
                </div>
              </div>
              <button
                onClick={() => setAssistantOpen(false)}
                aria-label="Close assistant"
                className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700 focus-ring"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {insight && (
                <div className="rounded-2xl bg-moss-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-moss-700">
                    On this screen
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-700">
                    {insight.message}
                  </p>
                </div>
              )}

              <div>
                <p className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-400">
                  How I work
                </p>
                <div className="mt-2 space-y-2">
                  {TIPS.map((tip) => (
                    <div
                      key={tip.title}
                      className="flex gap-3 rounded-xl border border-ink-100 bg-white p-3"
                    >
                      <tip.icon
                        size={18}
                        className="mt-0.5 shrink-0 text-moss-600"
                      />
                      <div>
                        <p className="text-sm font-medium text-ink-800">
                          {tip.title}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-ink-500">
                          {tip.body}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-ink-100 p-4">
              <p className="text-center text-xs text-ink-400">
                SLOTH never sends email or edits your calendar without approval.
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
