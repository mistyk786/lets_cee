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
import type { DemoDataset } from "@/lib/types";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { WatcherStatusPanel } from "@/components/layout/WatcherStatusPanel";

const ANALYSIS_STEPS = [
  "Reading approved email and calendar activity…",
  "Detecting repeated scheduling patterns…",
  "Mapping manual coordination steps…",
  "Scoring automation readiness…",
];

export function SetupPage() {
  const navigate = useNavigate();
  const { loadDemo, watcherStatus, setNotifications } = useApp();
  const [dataset, setDataset] = useState<DemoDataset | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    api.getDemoData().then(setDataset);
  }, []);

  useEffect(() => {
    if (!analysing) return;
    const interval = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, ANALYSIS_STEPS.length - 1));
    }, 400);
    return () => clearInterval(interval);
  }, [analysing]);

  async function handleAnalyse() {
    setAnalysing(true);
    setStepIndex(0);
    const boot = await api.bootstrapPrototype();
    await api.analyseWorkflow();
    setNotifications(boot.notifications);
    loadDemo();
    navigate("/overview");
  }

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
                  Demo dataset
                </p>
                <h1 className="font-display text-3xl font-medium tracking-tighter text-ink-900">
                  Start the Sloth prototype
                </h1>
                <p className="mt-2 text-ink-500">
                  Sloth watches your inbox in the background (every 2 minutes).
                  When it spots a repeated scheduling workflow, the bell
                  lights up — one click to propose times and hold a calendar slot.
                </p>
              </div>

              <div className="mt-8 space-y-4">
                <WatcherStatusPanel status={watcherStatus} compact />

                <div className="card p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                    Workflow selected
                  </p>
                  <p className="mt-1 text-lg font-semibold text-ink-900">
                    {dataset?.workflowName ?? "Internal Meeting Scheduling"}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="card p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                      Data sources
                    </p>
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-ink-700">
                        <Mail size={16} className="text-email" /> Email activity
                      </div>
                      <div className="flex items-center gap-2 text-sm text-ink-700">
                        <CalendarDays size={16} className="text-calendar" />{" "}
                        Calendar activity
                      </div>
                    </div>
                  </div>
                  <div className="card p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                      Analysis period
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-sm text-ink-700">
                      <CalendarRange size={16} className="text-ink-400" />
                      Last {dataset?.analysisPeriodDays ?? 30} days
                    </div>
                  </div>
                </div>

                <div className="card p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                    Mock data summary
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="font-display text-3xl font-medium tracking-tighter tnum text-ink-900">
                        {dataset?.summary.schedulingEmailRequests ?? 45}
                      </p>
                      <p className="text-xs text-ink-500">
                        scheduling requests
                      </p>
                    </div>
                    <div>
                      <p className="font-display text-3xl font-medium tracking-tighter tnum text-ink-900">
                        {dataset?.summary.calendarSources ?? 3}
                      </p>
                      <p className="text-xs text-ink-500">calendar sources</p>
                    </div>
                    <div>
                      <p className="font-display text-3xl font-medium tracking-tighter tnum text-ink-900">
                        {dataset?.summary.activityHistoryDays ?? 30}
                      </p>
                      <p className="text-xs text-ink-500">days of history</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-moss-200/70 bg-moss-50 p-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-moss-600 text-white">
                    <Sparkles size={15} />
                  </div>
                  <p className="text-sm leading-relaxed text-ink-700">
                    “I'll look for repeated scheduling patterns, manual
                    coordination steps, and safe ways to reduce effort.”
                  </p>
                </div>
              </div>

              <div className="mt-8 flex justify-center">
                <Button size="lg" onClick={handleAnalyse}>
                  Scan inbox &amp; notify me
                  <ArrowRight size={18} />
                </Button>
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
                SLOTH is mapping your workflow…
              </h2>
              <div className="mt-6 w-full max-w-sm space-y-2 text-left">
                {ANALYSIS_STEPS.map((step, i) => (
                  <div
                    key={step}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                      i <= stepIndex
                        ? "text-ink-700"
                        : "text-ink-300"
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
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
