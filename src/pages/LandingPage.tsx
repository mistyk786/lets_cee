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
import { SectionLabel } from "@/components/ui/SectionLabel";
import { StatLedger } from "@/components/ui/StatLedger";
import { ValueCard } from "@/components/landing/ValueCard";
import { WorkflowPreview } from "@/components/landing/WorkflowPreview";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.5, ease: "easeOut" },
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
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-ink-200/50 bg-[#f6f5f0]/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="hidden border-l border-ink-200 pl-3 font-mono text-[11px] uppercase tracking-label text-ink-400 sm:inline">
              Workflow intelligence
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={scrollToHow}>
              How it works
            </Button>
            <Button size="sm" onClick={() => navigate("/setup")}>
              Start prototype
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-6 pb-16 pt-12 sm:pt-20">
        {/* localized soft glow, paper + dots show through from the body */}
        <div className="pointer-events-none absolute -left-24 -top-24 -z-10 h-72 w-72 rounded-full bg-moss-300/20 blur-3xl" />

        <div className="grid items-start gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Left column — editorial headline */}
          <div>
            <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show">
              <SectionLabel index="00" tone="moss">
                AI workflow assistant
              </SectionLabel>
            </motion.div>

            <motion.h1
              custom={1}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="mt-6 font-display text-[2.75rem] font-medium leading-[1.02] tracking-tighter text-ink-900 sm:text-6xl"
            >
              Turn repetitive work into{" "}
              <em className="font-normal italic text-moss-600">
                safe, measurable
              </em>{" "}
              automations.
            </motion.h1>

            <motion.p
              custom={2}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="mt-6 max-w-xl text-balance text-lg leading-relaxed text-ink-600"
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

            {/* Instrument-style stat ledger */}
            <motion.div
              custom={4}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="mt-10 border-t border-ink-200/70 pt-6"
            >
              <StatLedger
                stats={[
                  { value: "45", label: "runs / month" },
                  { value: "9 hrs", label: "lost monthly" },
                  { value: "87", label: "opportunity" },
                  { value: "91%", label: "confidence" },
                ]}
              />
            </motion.div>

            <motion.div
              custom={5}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="mt-6 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-wide text-ink-400"
            >
              <span className="inline-flex items-center gap-1.5">
                <Lock size={13} className="text-moss-600" /> Selected data only
              </span>
              <span className="inline-flex items-center gap-1.5">
                <UserCheck size={13} className="text-moss-600" /> Human approval
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MailX size={13} className="text-moss-600" /> No auto-send
              </span>
            </motion.div>
          </div>

          {/* Right column — assistant "transcript" artifact */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
            className="lg:mt-10"
          >
            <div className="card highlight-top overflow-hidden">
              {/* mono meta header — reads like a real artifact */}
              <div className="flex items-center justify-between border-b border-ink-200/70 bg-ink-50/40 px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-moss-400 opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-moss-500" />
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-label text-ink-500">
                    SLOTH Assistant
                  </span>
                </div>
                <span className="font-mono text-[11px] tracking-wide text-ink-400">
                  09:41
                </span>
              </div>

              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-moss-600 text-white">
                    <Sparkles size={15} />
                  </div>
                  <p className="text-[15px] leading-relaxed text-ink-700">
                    “I found <strong className="font-semibold">3 workflows</strong>{" "}
                    that may be worth optimising. The strongest is internal
                    meeting scheduling — you're spending around{" "}
                    <strong className="font-semibold">9 hours a month</strong>{" "}
                    coordinating manually.”
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 pl-11">
                  <span className="rounded-lg bg-moss-50 px-2.5 py-1 text-xs font-medium text-moss-700 ring-1 ring-inset ring-moss-200/60">
                    Review opportunity
                  </span>
                  <span className="rounded-lg bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-600">
                    Show evidence
                  </span>
                  <span className="rounded-lg bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-600">
                    How would this work?
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 divide-x divide-ink-200/70 border-t border-ink-200/70">
                {[
                  { v: "87", l: "Opportunity" },
                  { v: "9h", l: "Per month" },
                  { v: "Low", l: "Risk" },
                ].map((s) => (
                  <div key={s.l} className="px-4 py-4 text-center">
                    <p className="font-display text-2xl font-medium tracking-tighter tnum text-ink-900">
                      {s.v}
                    </p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-label text-ink-400">
                      {s.l}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="mx-auto max-w-6xl scroll-mt-8 px-6 py-14"
      >
        <div className="card bg-dots relative overflow-hidden px-6 py-10 sm:px-10">
          <div className="max-w-lg">
            <SectionLabel index="01" tone="moss">
              How SLOTH works
            </SectionLabel>
            <h2 className="mt-4 font-display text-3xl font-medium tracking-tighter text-ink-900">
              A calm loop from insight to impact
            </h2>
            <p className="mt-3 text-ink-500">
              Every workflow moves through the same four steps — and you stay in
              control at each one.
            </p>
          </div>
          <div className="mt-10">
            <WorkflowPreview />
          </div>
        </div>
      </section>

      {/* Value cards */}
      <section className="mx-auto max-w-6xl px-6 pb-8">
        <SectionLabel index="02" className="mb-6">
          What SLOTH does
        </SectionLabel>
        <div className="grid gap-5 md:grid-cols-3">
          <ValueCard
            index="01"
            icon={Search}
            accent="#6d5bd0"
            title="Detect repetitive work"
            description="SLOTH learns from approved email and calendar activity to surface multi-step work you repeat often."
          />
          <ValueCard
            index="02"
            icon={ShieldCheck}
            accent="#3d8c62"
            title="Design safe automations"
            description="Map the current workflow, draft a future one, and edit safety rules so a human stays in control."
          />
          <ValueCard
            index="03"
            icon={LineChart}
            accent="#b9863f"
            title="Prove measurable impact"
            description="Forecast time saved before you activate, then measure whether the automation truly delivered."
          />
        </div>
      </section>

      {/* CTA specimen band */}
      <section className="mx-auto max-w-6xl px-6 py-14">
        <div className="relative overflow-hidden rounded-3xl bg-moss-700 px-8 py-14 text-white sm:px-12">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "radial-gradient(circle at center, rgba(255,255,255,0.9) 0.7px, transparent 0.8px)",
              backgroundSize: "22px 22px",
            }}
          />
          <div className="relative max-w-2xl">
            <span className="font-mono text-[11px] uppercase tracking-label text-moss-200">
              Start the demo
            </span>
            <h2 className="mt-4 font-display text-3xl font-medium tracking-tighter sm:text-4xl">
              See where your week is really going.
            </h2>
            <p className="mt-3 max-w-xl text-moss-100">
              Load the demo dataset and walk through the full detect → design →
              optimise → measure journey. No accounts, no connections — just the
              experience.
            </p>
            <div className="mt-8">
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
        </div>
      </section>

      <footer className="border-t border-ink-200/60 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 sm:flex-row">
          <Logo size={24} />
          <p className="font-mono text-[11px] uppercase tracking-wide text-ink-400">
            Turn repetitive work into safe, measurable automations.
          </p>
        </div>
      </footer>
    </div>
  );
}
