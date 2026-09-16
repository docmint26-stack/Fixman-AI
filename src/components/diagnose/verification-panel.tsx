"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "cn";
import { verificationStages } from "@/lib/demo/help";

export function VerificationPanel({
  title,
  onComplete,
}: {
  title: string;
  onComplete: () => void;
}) {
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    verificationStages.forEach((_, i) => {
      timers.push(setTimeout(() => setStep(i + 1), 820 * (i + 1)));
    });
    timers.push(setTimeout(onComplete, 820 * verificationStages.length + 500));
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  const done = step >= verificationStages.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center py-8"
    >
      <div className="relative mb-5">
        <span className="absolute inset-0 animate-ping rounded-full bg-success/20 [animation-duration:2.4s]" />
        <span className="relative grid size-14 place-items-center rounded-2xl border border-success/40 bg-success/10 text-success shadow-lg shadow-success/10">
          {done ? (
            <motion.div
              initial={{ scale: 0.6 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12 }}
            >
              <Check className="size-7" />
            </motion.div>
          ) : (
            <ShieldCheck className="size-7" />
          )}
        </span>
      </div>

      <p className="text-center text-sm font-medium text-foreground">
        {done ? "Verification complete" : "Verifying the outcome"}
      </p>
      <p className="mt-1 max-w-sm text-center text-xs text-muted-foreground">
        {title}
      </p>

      <div className="mt-7 w-full max-w-sm space-y-2">
        {verificationStages.map((s, i) => {
          const finished = i < step;
          const current = i === step && !done;
          return (
            <div
              key={s.label}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-colors",
                finished || done ? "border-success/30 bg-success/5" : current ? "border-primary/40 bg-primary/5" : "border-border/50"
              )}
            >
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full border",
                  finished || done ? "border-success/40 bg-success/15 text-success" : current ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground/50"
                )}
              >
                {finished || done ? (
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
                    finished || done ? "text-foreground/90" : current ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {s.label}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">{s.detail}</span>
              </span>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {done && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 text-xs text-muted-foreground"
          >
            White-box verification — no chain-of-thought was shown or stored.
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}