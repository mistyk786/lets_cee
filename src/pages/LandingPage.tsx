import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  ShieldCheck,
  LineChart,
  Sparkles,
  ArrowRight,
  Lock,
  UserCheck,
  MailX,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { ValueCard } from "@/components/landing/ValueCard";
import { WorkflowPreview } from "@/components/landing/WorkflowPreview";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" },
  }),
};

export function LandingPage() {
  const navigate = useNavigate();

  function scrollToHow() {
    document
      .getElementById("how-it-works")
      ?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-moss-50/60 via-white to-white">
      {/* Top bar */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={scrollToHow}>
            How it works
          </Button>
          <Button size="sm" onClick={() => navigate("/setup")}>
            Use Demo Dataset
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-10 pt-10 sm:pt-16">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <motion.span
              custom={0}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="inline-flex items-center gap-2 rounded-full border border-moss-200 bg-moss-50 px-3 py-1 text-xs font-medium text-moss-700"
            >
              <Sparkles size={13} />
              AI workflow optimisation assistant
            </motion.span>

            <motion.h1
              custom={1}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-5xl"
            >
              Turn repetitive work into{" "}
              <span className="text-moss-600">safe, measurable</span>{" "}
              automations.
            </motion.h1>

            <motion.p
              custom={2}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="mt-5 max-w-xl text-lg leading-relaxed text-ink-600"
            >
              SLOTH detects repeated email and calendar workflows, helps you
              design safer automations, and measures whether they create real
              value.
            </motion.p>

            <motion.div
              custom={3}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Button size="lg" onClick={() => navigate("/setup")}>
                Use Demo Dataset
                <ArrowRight size={18} />
              </Button>
              <Button size="lg" variant="secondary" onClick={scrollToHow}>
                See How It Works
              </Button>
            </motion.div>

            <motion.div
              custom={4}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-500"
            >
              <span className="inline-flex items-center gap-1.5">
                <Lock size={14} className="text-moss-600" /> Selected work data
                only
              </span>
              <span className="inline-flex items-center gap-1.5">
                <UserCheck size={14} className="text-moss-600" /> Human approval
                built in
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MailX size={14} className="text-moss-600" /> No automatic
                sending by default
              </span>
            </motion.div>
          </div>

          {/* Assistant preview card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6, ease: "easeOut" }}
            className="relative"
          >
            <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-moss-200/40 to-calendar/10 blur-2xl" />
            <div className="rounded-3xl border border-ink-200/70 bg-white p-6 shadow-lift">
              <div className="flex items-center gap-3 border-b border-ink-100 pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-moss-600 text-white">
                  <Sparkles size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-900">
                    SLOTH Assistant
                  </p>
                  <p className="text-xs text-moss-600">Online</p>
                </div>
              </div>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-700">
                “I found <strong>3 workflows</strong> that may be worth
                optimising. The strongest is internal meeting scheduling —
                you're spending around{" "}
                <strong>9 hours a month</strong> coordinating manually.”
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-lg bg-moss-50 px-2.5 py-1 text-xs font-medium text-moss-700">
                  Review opportunity
                </span>
                <span className="rounded-lg bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-600">
                  Show evidence
                </span>
                <span className="rounded-lg bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-600">
                  How would this work?
                </span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 border-t border-ink-100 pt-4 text-center">
                {[
                  { v: "87", l: "Opportunity" },
                  { v: "9h", l: "Per month" },
                  { v: "Low", l: "Risk" },
                ].map((s) => (
                  <div key={s.l}>
                    <p className="text-xl font-bold text-ink-900">{s.v}</p>
                    <p className="text-xs text-ink-400">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works / workflow illustration */}
      <section
        id="how-it-works"
        className="mx-auto max-w-6xl scroll-mt-8 px-6 py-14"
      >
        <div className="rounded-3xl border border-ink-200/70 bg-white px-6 py-10 shadow-soft sm:px-10">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-moss-600">
              How SLOTH works
            </p>
            <h2 className="mt-2 text-2xl font-bold text-ink-900">
              A calm loop from insight to impact
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-ink-500">
              SLOTH guides every workflow through the same four steps — and you
              stay in control at each one.
            </p>
          </div>
          <div className="mt-9">
            <WorkflowPreview />
          </div>
        </div>
      </section>

      {/* Value cards */}
      <section className="mx-auto max-w-6xl px-6 pb-8">
        <div className="grid gap-5 md:grid-cols-3">
          <ValueCard
            icon={Search}
            accent="#6d5bd0"
            title="Detect repetitive work"
            description="SLOTH learns from approved email and calendar activity to surface multi-step work you repeat often."
          />
          <ValueCard
            icon={ShieldCheck}
            accent="#3d8c62"
            title="Design safe automations"
            description="Map the current workflow, draft a future one, and edit safety rules so a human stays in control."
          />
          <ValueCard
            icon={LineChart}
            accent="#b9863f"
            title="Prove measurable impact"
            description="Forecast time saved before you activate, then measure whether the automation truly delivered."
          />
        </div>
      </section>

      {/* Trust band + CTA */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="overflow-hidden rounded-3xl bg-moss-700 px-8 py-12 text-center text-white">
          <h2 className="text-2xl font-bold sm:text-3xl">
            See where your week is really going.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-moss-100">
            Load the demo dataset and walk through the full detect → design →
            optimise → measure journey. No accounts, no connections — just the
            experience.
          </p>
          <div className="mt-7 flex justify-center">
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate("/setup")}
            >
              Use Demo Dataset
              <ArrowRight size={18} />
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-100 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-sm text-ink-400 sm:flex-row">
          <Logo size={24} />
          <p>Turn repetitive work into safe, measurable automations.</p>
        </div>
      </footer>
    </div>
  );
}
