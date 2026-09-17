"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FixGlyph } from "@/components/brand/logo";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function SplashScreen() {
  const [visible, setVisible] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    if (prefersReducedMotion() || sessionStorage.getItem("fixmind:splash")) {
      return;
    }
    sessionStorage.setItem("fixmind:splash", "1");
    queueMicrotask(() => setVisible(true));

    // progress pulse
    const start = performance.now();
    const total = 2400;
    const tick = () => {
      const elapsed = performance.now() - start;
      setProgress(Math.min(elapsed / total, 1));
      if (elapsed < total) requestAnimationFrame(tick);
      else {
        window.setTimeout(() => setVisible(false), 800);
      }
    };
    const raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-background"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04, filter: "blur(8px)" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* ambient glow */}
          <div className="pointer-events-none absolute inset-0 bg-grid-faint" />
          <div className="pointer-events-none absolute top-1/3 left-1/2 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[120px] animate-aurora" />
          <div className="pointer-events-none absolute bottom-0 left-1/4 h-[260px] w-[260px] rounded-full bg-cyan-400/10 blur-[100px] animate-float-slow" />

          <div className="relative flex flex-col items-center gap-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <span className="absolute inset-0 -m-3 rounded-[30%] bg-primary/25 blur-2xl animate-pulse-glow" />
              <FixGlyph size="xl" animate />
            </motion.div>

            <motion.div
              className="flex flex-col items-center gap-2 text-center"
              initial="hidden"
              animate="show"
              variants={{
                show: { transition: { staggerChildren: 0.14, delayChildren: 0.55 } },
              }}
            >
              <motion.p
                variants={{
                  hidden: { opacity: 0, y: 16, filter: "blur(6px)" },
                  show: {
                    opacity: 1,
                    y: 0,
                    filter: "blur(0px)",
                    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
                  },
                }}
                className="font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"
              >
                FixMind{" "}
                <span className="text-gradient-strong font-semibold">AI</span>
              </motion.p>
              <motion.p
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  show: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
                  },
                }}
                className="max-w-sm text-sm text-muted-foreground sm:text-base"
              >
                AI that learns from what actually works.
              </motion.p>
            </motion.div>

            {/* progress */}
            <div className="relative h-1 w-44 overflow-hidden rounded-full bg-foreground/10">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-violet-500 via-indigo-400 to-cyan-400"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}