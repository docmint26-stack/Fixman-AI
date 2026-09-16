"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, Sparkles } from "lucide-react";
import { cn } from "cn";
import { Icon } from "@/components/shared/icon";

export const WIZARD_STAGES = [
  { label: "Understanding context", detail: "Parsing the title, description, and category" },
  { label: "Checking evidence", detail: "Scoring screenshots, logs, code and output" },
  { label: "Extracting error signatures", detail: "Isolating the failure pattern" },
  { label: "Comparing similar cases", detail: "Scanning verified outcome history" },
  { label: "Evaluating outcomes", detail: "Weighting success rates per environment" },
  { label: "Ranking fixes", detail: "Balancing confidence, effort, and risk" },
  { label: "Preparing recommendation", detail: "Composing your ranked fix list" },
] as const;

const TIPS = [
  "Similar cases with verified outcomes are weighted by your OS, device and recent changes.",
  "Fixes are ranked by success rate, match confidence, risk and effort — not popularity.",
  "New evidence you upload helps the model isolate a sharper signature.",
];

export function AnalyzingPanel({
  title,
  onComplete,
}: {
  title: string;
  onComplete: () => void;
}) {
  const [step, setStep] = React.useState(0);
  const [tip, setTip] = React.useState(TIPS[0]);

  React.useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    WIZARD_STAGES.forEach((_, i) => {
      timers.push(setTimeout(() => setStep(i + 1), 520 * (i + 1)));
    });
    TIPS.forEach((_, i) => {
      timers.push(setTimeout(() => setTip(TIPS[(i + 1) % TIPS.length]), 4400 * (i + 1)));
    });
    timers.push(setTimeout(onComplete, 520 * WIZARD_STAGES.length + 650));
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  const progress = (step / WIZARD_STAGES.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center py-10"
    >
      <div className="relative mb-6">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/25 [animation-duration:2.2s]" />
        <span className="relative grid size-16 place-items-center rounded-2xl border border-primary/30 bg-primary/10 text-primary shadow-lg shadow-primary/10">
          <Sparkles className="size-7" />
        </span>
      </div>

      <p className="text-center text-sm font-medium text-foreground">
        Analyzing “{title.slice(0, 60)}{title.length > 60 ? "…" : ""}”
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        White-box diagnosis on the outcome graph — no hidden chain-of-thought
      </p>

      <div className="mt-8 w-full max-w-md space-y-1.5">
        {WIZARD_STAGES.map((s, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0.35 }}
              animate={{ opacity: done || current ? 1 : 0.45 }}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-colors",
                current
                  ? "border-primary/40 bg-primary/5"
                  : done
                    ? "border-border/60 bg-card/50"
                    : "border-transparent"
              )}
            >
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full border",
                  done && "border-success/40 bg-success/15 text-success",
                  current && "border-primary/40 bg-primary/10 text-primary",
                  !done && !current && "border-border text-muted-foreground/50"
                )}
              >
                {done ? (
                  <Check className="size-3.5" />
                ) : current ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <span className="size-1.5 rounded-full bg-current" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block truncate text-sm font-medium",
                    current ? "text-foreground" : done ? "text-foreground/90" : "text-muted-foreground"
                  )}
                >
                  {s.label}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">{s.detail}</span>
              </span>
              {current && <span className="text-[11px] font-semibold text-primary">{Math.round(progress)}%</span>}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-6 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-linear-to-r from-violet-500 to-cyan-400"
          animate={{ width: `${Math.max(4, progress)}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.p
          key={tip}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="mt-5 flex max-w-md items-start gap-2 text-xs text-muted-foreground"
        >
          <Icon name="lightbulb" className="mt-0.5 size-3.5 shrink-0 text-warning" />
          {tip}
        </motion.p>
      </AnimatePresence>
    </motion.div>
  );
}