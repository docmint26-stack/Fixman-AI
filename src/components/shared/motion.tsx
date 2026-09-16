"use client";

import * as React from "react";
import { motion, useInView, animate, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { EASE_OUT_EXPO, viewportOnce } from "@/lib/motion";

export function AnimatedCounter({
  value,
  suffix = "",
  prefix = "",
  duration = 1.4,
  className,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduced = useReducedMotion();
  const [display, setDisplay] = React.useState(reduced ? value : 0);

  React.useEffect(() => {
    if (!inView) return;
    if (reduced) {
      queueMicrotask(() => setDisplay(value));
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: EASE_OUT_EXPO,
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [inView, value, duration, reduced]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {Math.round(display).toLocaleString("en-US")}
      {suffix}
    </span>
  );
}

export function Reveal({
  children,
  delay = 0,
  y = 22,
  ...props
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
} & HTMLMotionProps<"div">) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportOnce}
      transition={{ duration: 0.6, ease: EASE_OUT_EXPO, delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function RotatingWords({
  words,
  className,
}: {
  words: string[];
  className?: string;
}) {
  const [index, setIndex] = React.useState(0);
  const reduced = useReducedMotion();

  React.useEffect(() => {
    if (reduced || words.length < 2) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % words.length),
      2600
    );
    return () => window.clearInterval(id);
  }, [words.length, reduced]);

  const current = words[index % words.length];

  if (reduced) return <span className={className}>{current}</span>;

  return (
    <span className={className}>
      <motion.span
        key={current}
        initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
        className="inline-block"
      >
        {current}
      </motion.span>
    </span>
  );
}