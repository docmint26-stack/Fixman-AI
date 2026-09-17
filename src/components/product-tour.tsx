"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/shared/icon";
import { useTourStore } from "@/lib/state/ui";

const STEPS = [
  {
    icon: "stethoscope",
    title: "Start an AI Diagnosis",
    body: "Describe any software, coding or device problem. Puvexa reads your evidence and ranks the fixes most likely to work for your environment.",
    href: "/diagnose",
    cta: "Start diagnosing",
  },
  {
    icon: "list-ordered",
    title: "Try ranked fixes",
    body: "Every fix shows its measured success rate, match score, effort and risk. Follow the steps and mark them complete.",
    href: "/diagnose",
    cta: "See ranked fixes",
  },
  {
    icon: "shield-check",
    title: "Verify what worked",
    body: "Report the outcome and attach evidence. Real results — not guesses — are what make a fix trustworthy on Puvexa.",
    href: "/contribute",
    cta: "Verification explained",
  },
  {
    icon: "coins",
    title: "Earn FIX for useful knowledge",
    body: "Verified fixes and verified outcomes earn FIX, plus royalties every time they help someone else. Knowledge that keeps paying you.",
    href: "/rewards",
    cta: "See your rewards",
  },
  {
    icon: "wallet",
    title: "Claim rewards when ready",
    body: "You can diagnose, contribute and earn pending FIX with no wallet. Connect one only when you want to claim on-chain.",
    href: "/rewards",
    cta: "Wallet & claiming",
  },
] as const;

export function ProductTour() {
  const { active, complete } = useTourStore();
  const [step, setStep] = React.useState(0);
  const last = step === STEPS.length - 1;

  React.useEffect(() => {
    if (!active) queueMicrotask(() => setStep(0));
  }, [active]);

  if (!active) return null;
  const s = STEPS[step];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 lg:bottom-10"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
      >
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.24 }}
          className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl"
        >
          <div className="flex items-center gap-3 border-b border-border/70 px-4 py-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
              <Icon name={s.icon} className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground">
                {step + 1} of {STEPS.length} · {s.title}
              </p>
              <div className="mt-1 flex gap-1">
                {STEPS.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`}
                  />
                ))}
              </div>
            </div>
            <Button size="icon-sm" variant="ghost" onClick={complete} aria-label="Close tour">
              <X className="size-4" />
            </Button>
          </div>

          <div className="px-4 py-4">
            <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
            {s.href && (
              <Link
                href={s.href}
                onClick={() => setStep((v) => Math.min(v + 1, STEPS.length - 1))}
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                {s.cta} <ChevronRight className="size-3.5" />
              </Link>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border/70 px-4 py-3">
            <Button size="xs" variant="ghost" onClick={complete}>
              Skip
            </Button>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                disabled={step === 0}
                onClick={() => setStep((v) => Math.max(v - 1, 0))}
              >
                Back
              </Button>
              {last ? (
                <Button size="sm" onClick={complete}>
                  <Check className="size-3.5" /> Done
                </Button>
              ) : (
                <Button size="sm" onClick={() => setStep((v) => v + 1)}>
                  Next <ChevronRight className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}