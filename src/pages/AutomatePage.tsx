import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Loader2,
  Mail,
  Sparkles,
  Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import { mapAutomationRule } from "@/lib/mappers";
import { opportunities } from "@/lib/mockData";
import type { ActivateAutomationResult, SlothNotification } from "@/lib/types";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

export function AutomatePage() {
  const { notificationId } = useParams<{ notificationId: string }>();
  const navigate = useNavigate();
  const { notifications, markNotificationRead, addActiveAutomation } = useApp();

  const [notification, setNotification] = useState<SlothNotification | null>(
    null
  );
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ActivateAutomationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!notificationId) return;

    const cached = notifications.find((n) => n.id === notificationId);
    if (cached) {
      setNotification(cached);
      return;
    }

    if (api.isLive()) {
      fetch(
        `${import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "")}/api/notifications/${notificationId}`
      )
        .then((res) => (res.ok ? res.json() : null))
        .then((raw) => {
          if (raw) {
            setNotification({
              id: raw.id,
              title: raw.title,
              message: raw.message,
              createdAt: raw.created_at,
              read: raw.read,
              opportunityId: raw.opportunity_id,
              recoverableMinutesPerWeek: raw.recoverable_minutes_per_week,
              action: raw.action,
              status: raw.status,
            });
          }
        })
        .catch(() => setError("Could not load this notification."));
    }
  }, [notificationId, notifications]);

  async function handleAutomate() {
    if (!notificationId || !notification?.opportunityId) return;

    setRunning(true);
    setError(null);

    const workflow = api.getLastAnalysis();
    const mockOpp = opportunities.find(
      (o) => o.id === notification.opportunityId
    );
    const rules = workflow
      ? mapAutomationRule(workflow.automation_rules)
      : mockOpp?.proposedRules ?? opportunities[0].proposedRules;

    try {
      const activation = await api.automateNotification(
        notificationId,
        notification.opportunityId,
        rules
      );
      setResult(activation);
      addActiveAutomation(activation.automation);
      markNotificationRead(notificationId);
      setNotification((n) =>
        n ? { ...n, status: "completed", read: true } : n
      );
    } catch {
      setError("Automation failed. Check that the backend is running.");
    } finally {
      setRunning(false);
    }
  }

  const done = result !== null || notification?.status === "completed";

  return (
    <div className="min-h-screen bg-gradient-to-b from-moss-50/40 to-white">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <button onClick={() => navigate("/overview")} className="focus-ring rounded-lg">
          <Logo />
        </button>
        <Button variant="ghost" size="sm" onClick={() => navigate("/overview")}>
          <ArrowLeft size={16} /> Dashboard
        </Button>
      </header>

      <main className="mx-auto max-w-2xl px-6 pb-16">
        {!notification && !error && (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-moss-600" />
          </div>
        )}

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        )}

        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div>
              <p className="font-mono text-[11px] uppercase tracking-label text-moss-600">
                {api.isLive() ? "Live automation" : "Preview mode"}
              </p>
              <h1 className="mt-2 font-display text-3xl font-medium tracking-tighter text-ink-900">
                {done ? "Automation complete" : notification.title}
              </h1>
              <p className="mt-2 text-ink-600">{notification.message}</p>
            </div>

            {!done && (
              <div className="card space-y-4 p-6">
                <p className="text-sm font-semibold text-ink-800">
                  Sloth will:
                </p>
                <ul className="space-y-3 text-sm text-ink-600">
                  <li className="flex gap-3">
                    <Calendar size={18} className="shrink-0 text-calendar" />
                    Check your calendar for free slots
                  </li>
                  <li className="flex gap-3">
                    <Mail size={18} className="shrink-0 text-email" />
                    Read the incoming email and draft a personalised reply with AI
                  </li>
                  <li className="flex gap-3">
                    <Sparkles size={18} className="shrink-0 text-moss-600" />
                    Hold a tentative calendar event on the first slot
                  </li>
                </ul>
                <Button
                  size="lg"
                  className="w-full"
                  disabled={running}
                  onClick={handleAutomate}
                >
                  {running ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />{" "}
                      Reading email &amp; drafting reply…
                    </>
                  ) : (
                    <>
                      <Zap size={18} /> Run automation
                    </>
                  )}
                </Button>
              </div>
            )}

            {done && result && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-xl border border-moss-200 bg-moss-50 p-4 text-moss-800">
                  <CheckCircle2 size={20} />
                  <span className="text-sm font-medium">
                    Workflow automated — review the output below
                  </span>
                </div>

                {result.preview?.originalEmail?.body && (
                  <div className="card p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                      Email Sloth replied to
                    </p>
                    <p className="mt-2 text-sm font-medium text-ink-900">
                      {result.preview.originalEmail.subject}
                    </p>
                    <p className="mt-1 text-xs text-ink-500">
                      From {result.preview.originalEmail.sender}
                    </p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-600">
                      {result.preview.originalEmail.body}
                    </p>
                  </div>
                )}

                {result.preview?.draftReply && (
                  <div className="card p-5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                        Draft reply
                      </p>
                      {result.preview.replySource === "cursor" && (
                        <span className="rounded-md bg-moss-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-moss-700">
                          AI-generated
                        </span>
                      )}
                    </div>
                    <pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-ink-700">
                      {result.preview.draftReply}
                    </pre>
                  </div>
                )}

                {result.preview?.proposedSlots &&
                  result.preview.proposedSlots.length > 0 && (
                    <div className="card p-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                        Proposed slots
                      </p>
                      <ul className="mt-3 space-y-2 text-sm text-ink-700">
                        {result.preview.proposedSlots.map((slot) => (
                          <li key={slot} className="flex gap-2">
                            <Calendar size={16} className="mt-0.5 text-calendar" />
                            {slot}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {result.preview?.tentativeEventTitle && (
                  <div className="card p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                      Tentative calendar hold
                    </p>
                    <p className="mt-2 font-medium text-ink-900">
                      {result.preview.tentativeEventTitle}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => navigate("/automations")}>
                    View active automations
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => navigate("/insights")}
                  >
                    Measure impact
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
