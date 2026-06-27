import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  CalendarDays,
  CalendarRange,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import type { WatcherStatus } from "@/lib/types";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { WatcherStatusPanel } from "@/components/layout/WatcherStatusPanel";
import { RecentInboxPanel } from "@/components/inbox/RecentInboxPanel";
import { ConnectInboxPanel } from "@/components/inbox/ConnectInboxPanel";

const ANALYSIS_STEPS = [
  "Reading recent inbox messages…",
  "Detecting repeated workflow patterns…",
  "Mapping manual steps and bottlenecks…",
  "Scoring what can be safely automated…",
];

export function SetupPage() {
  const navigate = useNavigate();
  const {
    loadDemo,
    watcherStatus,
    setNotifications,
    refreshNotifications,
    refreshWatcherStatus,
  } = useApp();
  const [analysing, setAnalysing] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [liveStatus, setLiveStatus] = useState<WatcherStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const live = api.isLive();

  useEffect(() => {
    if (!analysing) return;
    const interval = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, ANALYSIS_STEPS.length - 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [analysing]);

  async function finishToOverview(notifications: Awaited<
    ReturnType<typeof api.runInboxAnalysis>
  >["notifications"]) {
    setNotifications(notifications);
    await refreshNotifications();
    await refreshWatcherStatus();
    loadDemo();
    navigate("/overview");
  }

  async function handleAnalyse() {
    setAnalysing(true);
    setStepIndex(0);
    setElapsedSec(0);
    setError(null);
    setLiveStatus(null);

    try {
      const boot = await api.runInboxAnalysis((status, elapsed) => {
        setElapsedSec(elapsed);
        if (status) setLiveStatus(status);
        if (status?.initialScanDone && status.workflowName) {
          setStepIndex(ANALYSIS_STEPS.length - 1);
        }
      });
      await finishToOverview(boot.notifications);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Scan failed. You can still open the dashboard."
      );
      setAnalysing(false);
    }
  }

  async function handleSkipToDashboard() {
    try {
      const items = await api.getNotifications();
      await finishToOverview(items);
    } catch {
      loadDemo();
      navigate("/overview");
    }
  }

  const canSkip =
    analysing &&
    (elapsedSec >= 8 ||
      liveStatus?.initialScanDone ||
      watcherStatus?.initialScanDone);

  return (
    <div className="min-h-screen bg-gradient-to-b from-moss-50/50 to-white">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
        <button onClick={() => navigate("/")} className="focus-ring rounded-lg">
          <Logo />
        </button>
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
          <ArrowLeft size={16} /> Back
        </Button>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8">
        <AnimatePresence mode="wait">
          {!analysing ? (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <div className="text-center">
                <p className="mb-3 font-mono text-[11px] uppercase tracking-label text-moss-600">
                  {live ? "Live inbox analysis" : "Offline preview"}
                </p>
                <h1 className="font-display text-3xl font-medium tracking-tighter text-ink-900">
                  Optimise your inbox
                </h1>
                <p className="mt-2 text-ink-500">
                  Sloth reads your recent email, finds repeatable work (meetings,
                  follow-ups, approvals, reports, and more), and tells you
                  honestly what can — and cannot — be automated safely.
                </p>
              </div>

              <div className="mt-8 space-y-4">
                {live && <ConnectInboxPanel />}

                <WatcherStatusPanel status={watcherStatus} compact />

                {live && <RecentInboxPanel limit={8} />}

                {watcherStatus?.initialScanDone && live && (
                  <div className="rounded-xl border border-moss-200 bg-moss-50 px-4 py-3 text-sm text-moss-800">
                    Inbox already scanned — clicking analyse should be instant.
                  </div>
                )}

                {error && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {error}
                  </div>
                )}

                {live ? (
                  <div className="card p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                      What happens on scan
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-ink-700">
                      <li>• Connect your inbox with an app password (or use server IMAP)</li>
                      <li>• Reads inbox + sent mail for repeated subjects and senders</li>
                      <li>• AI names the exact pattern — not generic “meeting workflow”</li>
                      <li>• First scan may take up to 2 minutes</li>
                    </ul>
                  </div>
                ) : (
                  <>
                    <div className="card p-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                        Data sources (demo)
                      </p>
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-ink-700">
                          <Mail size={16} className="text-email" /> Sample emails
                        </div>
                        <div className="flex items-center gap-2 text-sm text-ink-700">
                          <CalendarDays size={16} className="text-calendar" />{" "}
                          Sample calendar
                        </div>
                      </div>
                    </div>
                    <div className="card p-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                        Analysis period
                      </p>
                      <div className="mt-3 flex items-center gap-2 text-sm text-ink-700">
                        <CalendarRange size={16} className="text-ink-400" />
                        Last 30 days (bundled demo)
                      </div>
                    </div>
                  </>
                )}

                <div className="flex items-start gap-3 rounded-2xl border border-moss-200/70 bg-moss-50 p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-moss-600 text-white">
                    <Sparkles size={15} />
                  </div>
                  <p className="text-sm leading-relaxed text-ink-700">
                    “I'll look for any repeated manual work — not just meetings
                    — and only suggest automation when the pattern is clear and
                    safe.”
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Button size="lg" onClick={handleAnalyse}>
                  Scan &amp; optimise
                  <ArrowRight size={18} />
                </Button>
                {live && watcherStatus?.initialScanDone && (
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={handleSkipToDashboard}
                  >
                    Go to dashboard
                  </Button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="analysing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center py-16 text-center"
            >
              <div className="relative h-16 w-16">
                <span className="absolute inset-0 animate-pulse-ring rounded-full bg-moss-300" />
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-moss-600 text-white">
                  <Sparkles size={24} />
                </span>
              </div>
              <h2 className="mt-6 text-xl font-bold text-ink-900">
                SLOTH is reading your inbox…
              </h2>
              <p className="mt-2 text-sm text-ink-500">
                AI analysis in progress ({elapsedSec}s). Usually 30–90 seconds;
                can take up to 2 minutes on first scan.
              </p>

              {liveStatus && (
                <div className="mt-4 w-full max-w-sm">
                  <WatcherStatusPanel status={liveStatus} compact />
                </div>
              )}

              <div className="mt-6 w-full max-w-sm space-y-2 text-left">
                {ANALYSIS_STEPS.map((step, i) => (
                  <div
                    key={step}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                      i <= stepIndex ? "text-ink-700" : "text-ink-300"
                    }`}
                  >
                    {i < stepIndex ? (
                      <CheckCircle2 size={16} className="text-moss-600" />
                    ) : i === stepIndex ? (
                      <span className="h-4 w-4 rounded-full border-2 border-moss-200 border-t-moss-600 [animation:spin_0.8s_linear_infinite]" />
                    ) : (
                      <span className="h-4 w-4 rounded-full border-2 border-ink-200" />
                    )}
                    {step}
                  </div>
                ))}
              </div>

              {canSkip && (
                <Button
                  className="mt-8"
                  variant="secondary"
                  onClick={handleSkipToDashboard}
                >
                  Continue to dashboard
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
