"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Clock3,
  Coins,
  Loader2,
  MessageSquareQuote,
  Pause,
  Play,
  RefreshCcw,
  Sparkles,
  Trophy,
} from "lucide-react";
import { cn } from "cn";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Icon } from "@/components/shared/icon";
import { VerificationPanel } from "@/components/diagnose/verification-panel";

const STAGES = [
  "Problem",
  "Analyze",
  "Match",
  "Recommend",
  "Try",
  "Verify",
  "Learn",
  "Reward",
] as const;
type Stage = (typeof STAGES)[number];

const DURATIONS: Record<Stage, number> = {
  Problem: 2800,
  Analyze: 4400,
  Match: 2300,
  Recommend: 3200,
  Try: 4600,
  Verify: 4200,
  Learn: 3000,
  Reward: 999999,
};

const FIX = {
  title: "Render timestamps client-side only",
  why: "Dates from the client clock never match server HTML. Mount the value inside useEffect so SSR renders a stable placeholder and the client fills it in after mount.",
  steps: [
    "Extract the clock into a client component",
    "Render a stable placeholder during SSR",
    "Set the real time inside useEffect after mount",
  ],
  successRate: 91,
  matchScore: 93,
  confidence: "High" as const,
  risk: "Low" as const,
  effort: "Low" as const,
  time: "5 minutes",
};

const LEARNING = [
  { icon: "shield-check", text: "No chain-of-thought is stored — only high-level reasoning stages" },
  { icon: "lock", text: "Evidence stays in your browser until you choose to submit it" },
  { icon: "share-2", text: "Your verified outcome updates the knowledge graph for future cases" },
];

function ProblemView() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="space-y-4"
    >
      <div className="rounded-2xl border border-border/80 bg-card/70 p-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          A developer describes the issue
        </p>
        <h2 className="mt-2 font-heading text-xl font-semibold text-foreground">
          React hydration mismatch caused by client-only timestamp
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          A Next.js dashboard header renders a live clock. The server HTML contains one time, the client renders another — React logs a hydration mismatch and the time visibly changes after load.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {["Windows 11", "Development PC", "Next.js 15", "Added live clock"].map((t) => (
            <Badge key={t} variant="secondary" className="text-[10px]">
              {t}
            </Badge>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock3 className="size-3.5" />
        Timestamp just now · evidence type selected: code, output
      </div>
    </motion.div>
  );
}

function AnalyzeView() {
  const stages = React.useMemo(() => [
    { label: "Understanding context", pct: 14 },
    { label: "Checking evidence", pct: 28 },
    { label: "Extracting error signatures", pct: 42 },
    { label: "Comparing similar cases", pct: 57 },
    { label: "Evaluating outcomes", pct: 71 },
    { label: "Ranking fixes", pct: 85 },
    { label: "Preparing recommendation", pct: 100 },
  ], []);
  const [active, setActive] = React.useState(0);
  React.useEffect(() => {
    const timers = stages.map((_, i) => setTimeout(() => setActive(i + 1), 580 * (i + 1)));
    return () => timers.forEach(clearTimeout);
  }, [stages]);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center py-4"
    >
      <span className="relative mb-4 grid size-14 place-items-center rounded-2xl border border-primary/40 bg-primary/10 text-primary">
        <span className="absolute inset-0 animate-ping rounded-2xl bg-primary/20 [animation-duration:2.4s]" />
        <Sparkles className="size-7" />
      </span>
      <p className="text-center text-sm font-medium text-foreground">White-box diagnosis</p>
      <p className="text-xs text-muted-foreground">No hidden chain-of-thought · high-level stages only</p>
      <div className="mt-5 w-full max-w-md space-y-1.5">
        {stages.map((s, i) => (
          <div
            key={s.label}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-3.5 py-2 text-xs transition-colors",
              i < active
                ? "border-success/40 bg-success/5"
                : i === active
                  ? "border-primary/40 bg-primary/5"
                  : "border-transparent opacity-40"
            )}
          >
            <span
              className={cn(
                "grid size-5 shrink-0 place-items-center rounded-full border",
                i < active
                  ? "border-success/40 bg-success/15 text-success"
                  : i === active
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground/50"
              )}
            >
              {i < active ? <Check className="size-3" /> : i === active ? <Loader2 className="size-3 animate-spin" /> : <span className="size-1 rounded-full bg-current" />}
            </span>
            {s.label}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function MatchView() {
  const [count, setCount] = React.useState(0);
  React.useEffect(() => {
    let f = 0;
    const id = setInterval(() => {
      f++;
      setCount(Math.round((f / 50) * 487));
      if (f >= 50) clearInterval(id);
    }, 38);
    return () => clearInterval(id);
  }, []);
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="flex flex-col items-center justify-center py-6">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Outcome graph</p>
      <span className="mt-3 font-heading text-6xl font-bold tabular-nums text-foreground">{count.toLocaleString()}</span>
      <p className="mt-1 text-sm text-muted-foreground">similar verified cases matched</p>
      <div className="mt-5 flex gap-2">
        {["Hydration mismatch", "Next.js", "React", "SSR"].map((t) => (
          <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
        ))}
      </div>
    </motion.div>
  );
}

function RecommendView() {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="mx-auto max-w-lg space-y-4">
      <div className="rounded-2xl border border-primary/40 bg-primary/5 p-5">
        <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-linear-to-r from-violet-500/90 to-cyan-500/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
          <Sparkles className="size-3" /> Top pick
        </span>
        <h3 className="font-heading text-lg font-semibold text-foreground">#{1} {FIX.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{FIX.why}</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            ["Success", `${FIX.successRate}%`, "text-success"],
            ["Match", `${FIX.matchScore}%`, ""],
            ["Confidence", FIX.confidence, "text-success"],
          ].map(([l, v, cls]) => (
            <div key={l} className="rounded-lg border border-border/60 bg-card/70 px-2.5 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</p>
              <p className={cn("text-xs font-semibold text-foreground", cls)}>{v}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Risk {FIX.risk} · Effort {FIX.effort} · {FIX.time}</span>
        <span>Verified in 443 cases</span>
      </div>
    </motion.div>
  );
}

function TryView() {
  const [done, setDone] = React.useState(0);
  React.useEffect(() => {
    const timers = FIX.steps.map((_, i) => setTimeout(() => setDone(i + 1), 1100 * (i + 1)));
    return () => timers.forEach(clearTimeout);
  }, []);
  const pct = (done / FIX.steps.length) * 100;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mx-auto max-w-lg">
      <div className="rounded-2xl border border-border/80 bg-card/70 p-5">
        <p className="text-xs text-muted-foreground">{done}/{FIX.steps.length} steps done</p>
        <Progress value={pct} className="mt-2 w-full" />
        <ol className="mt-4 space-y-2.5">
          {FIX.steps.map((s, i) => {
            const ok = i < done;
            return (
              <li key={i} className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-[10px]",
                    ok ? "border-success bg-success text-white" : "border-border text-muted-foreground"
                  )}
                >
                  {ok ? <Check className="size-3" /> : i + 1}
                </span>
                <span className={cn("flex-1 text-sm leading-relaxed", ok ? "text-muted-foreground line-through" : "text-foreground")}>
                  {s}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </motion.div>
  );
}

function VerifyView() {
  const [done, setDone] = React.useState(false);
  return (
    <div className="mx-auto max-w-lg">
      {done ? (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-2xl border border-success/30 bg-success/5 p-6 text-center"
        >
          <div className="mx-auto grid size-12 place-items-center rounded-full border border-success/40 bg-success/10 text-success">
            <Check className="size-6" />
          </div>
          <p className="mt-3 font-heading text-lg font-semibold text-foreground">Verification complete</p>
          <p className="mt-1 text-xs text-muted-foreground">
            White-box verification only — no chain-of-thought was shown or stored.
          </p>
        </motion.div>
      ) : (
        <div className="rounded-2xl border border-border/80 bg-card/70 p-5">
          <VerificationPanel
            title="Confirming the observation window, then writing the outcome to the graph."
            onComplete={() => setDone(true)}
          />
        </div>
      )}
    </div>
  );
}

function LearnView() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mx-auto max-w-lg space-y-3">
      <div className="rounded-2xl border border-border/80 bg-card/70 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">What was learned</p>
        <ul className="mt-3 space-y-3">
          {LEARNING.map((l) => (
            <li key={l.text} className="flex items-start gap-3">
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-violet-400/30 bg-violet-500/10 text-violet-300">
                <Icon name={l.icon} className="size-3.5" />
              </span>
              <span className="text-sm leading-relaxed text-muted-foreground">{l.text}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="flex items-center gap-2 rounded-xl bg-primary/5 px-4 py-3 text-xs text-foreground">
        <MessageSquareQuote className="size-3.5 shrink-0 text-primary" />
        This outcome strengthens the same fix for anyone with the same environment.
      </p>
    </motion.div>
  );
}

function RewardView() {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", damping: 18, stiffness: 120 }}
      className="mx-auto max-w-lg space-y-4 text-center"
    >
      <div className="relative mx-auto grid size-16 place-items-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
        <span className="absolute inset-0 animate-ping rounded-2xl bg-cyan-400/20 [animation-duration:2.4s]" />
        <Coins className="size-8" />
      </div>
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground">+8 FIX earned</h2>
        <p className="mt-1 text-sm text-muted-foreground">Reward unlocked · no wallet needed to earn</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button render={<Link href="/login?next=/rewards" />}>
          <Trophy className="size-4" /> Claim rewards
        </Button>
        <Button render={<Link href="/login?next=/diagnose" />} variant="secondary">
          Run your own diagnosis <ArrowRight className="size-4" />
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Sign in to start earning, or keep exploring the demo.
      </p>
    </motion.div>
  );
}

const VIEW: Record<Stage, React.ReactNode> = {
  Problem: <ProblemView />,
  Analyze: <AnalyzeView />,
  Match: <MatchView />,
  Recommend: <RecommendView />,
  Try: <TryView />,
  Verify: <VerifyView />,
  Learn: <LearnView />,
  Reward: <RewardView />,
};

export function DemoWorkflow() {
  const [idx, setIdx] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const stage = STAGES[idx];

  const advance = React.useCallback(() => {
    setIdx((i) => Math.min(i + 1, STAGES.length - 1));
  }, []);

  React.useEffect(() => {
    if (paused || idx === STAGES.length - 1) return;
    timerRef.current = setTimeout(advance, DURATIONS[stage]);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [idx, paused, stage, advance]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        setPaused((p) => !p);
      }
      if (e.key === "ArrowRight" || e.key === "Enter") advance();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance]);

  const restart = () => {
    setIdx(0);
    setPaused(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <div className="hidden lg:block">
        <nav className="sticky top-24 space-y-0">
          {STAGES.map((s, i) => {
            const done = i < idx;
            const active = i === idx;
            return (
              <button
                key={s}
                onClick={() => {
                  setIdx(i);
                  setPaused(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 border-l-2 py-2 pl-3 text-left text-sm font-medium transition-colors",
                  active
                    ? "border-primary text-foreground"
                    : done
                      ? "border-success text-foreground/80"
                      : "border-border text-muted-foreground/60"
                )}
              >
                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-full border text-[10px]",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : done
                        ? "border-success bg-success text-white"
                        : "border-border"
                  )}
                >
                  {done ? <Check className="size-3" /> : i + 1}
                </span>
                {s}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="min-h-[26rem] rounded-2xl border border-border/80 bg-card/60 p-6 shadow-sm">
        <AnimatePresence mode="wait">
          <motion.div key={stage}>{VIEW[stage]}</motion.div>
        </AnimatePresence>
      </div>

      <div className="lg:col-span-2">
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" variant="ghost" onClick={() => setPaused((p) => !p)}>
            {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
            {paused ? "Resume" : "Pause"}
          </Button>
          <Button size="sm" variant="ghost" onClick={advance} disabled={idx >= STAGES.length - 1}>
            Skip <ArrowRight className="size-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={restart}>
            <RefreshCcw className="size-4" /> Restart
          </Button>
          <div className="flex-1" />
          <div className="hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex">
            <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono">Space</kbd> pause
            <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono">→</kbd> next
          </div>
        </div>
      </div>
    </div>
  );
}