"use client";

import { motion } from "framer-motion";
import { cn } from "cn";

const GLYPH_SIZES = {
  xs: 20,
  sm: 26,
  md: 34,
  lg: 44,
  xl: 64,
} as const;

export type GlyphSize = keyof typeof GLYPH_SIZES;

type FixGlyphProps = {
  size?: GlyphSize;
  animate?: boolean;
  className?: string;
  delay?: number;
};

/**
 * The FixMind "F" glyph — built from signal-style bars inside a
 * gradient-trimmed tile. When `animate` is true the bars draw themselves
 * like a live signal line.
 */
export function FixGlyph({
  size = "md",
  animate = false,
  className,
  delay = 0,
}: FixGlyphProps) {
  const px = GLYPH_SIZES[size];
  return (
    <div
      className={cn(
        "relative grid shrink-0 place-items-center rounded-[28%] border border-primary/25 bg-gradient-to-br from-primary/20 via-indigo-500/10 to-cyan-400/15 p-[14%] shadow-[0_0_24px_-6px] shadow-primary/40",
        className
      )}
      style={{ width: px, height: px }}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        style={{ width: "72%", height: "72%" }}
      >
        <motion.path
          d="M7.5 19.5V4.5H17.25"
          stroke="url(#fixmind-f-gradient)"
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={animate ? { pathLength: 0 } : false}
          animate={animate ? { pathLength: 1 } : undefined}
          transition={
            animate
              ? { duration: 0.7, delay, ease: "easeOut" }
              : undefined
          }
        />
        <motion.path
          d="M7.5 11.25h6.5"
          stroke="url(#fixmind-f-gradient)"
          strokeWidth={2.6}
          strokeLinecap="round"
          initial={animate ? { pathLength: 0 } : false}
          animate={animate ? { pathLength: 1 } : undefined}
          transition={
            animate ? { duration: 0.7, delay: delay + 0.18, ease: "easeOut" } : undefined
          }
        />
        <motion.circle
          cx="7.5"
          cy="4.5"
          r="2"
          fill="url(#fixmind-f-gradient)"
          initial={animate ? { scale: 0, opacity: 0 } : false}
          animate={animate ? { scale: 1, opacity: 1 } : undefined}
          transition={
            animate ? { delay: delay + 0.4, type: "spring", stiffness: 300, damping: 16 } : undefined
          }
        />
        <defs>
          <linearGradient
            id="fixmind-f-gradient"
            x1="0"
            y1="0"
            x2="24"
            y2="24"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#a78bfa" />
            <stop offset="0.55" stopColor="#818cf8" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

type LogoProps = {
  size?: GlyphSize;
  withTagline?: boolean;
  animated?: boolean;
  onClick?: () => void;
  className?: string;
};

export function Logo({
  size = "md",
  withTagline = false,
  animated = false,
  onClick,
  className,
}: LogoProps) {
  return (
    <div
      className={cn("inline-flex cursor-pointer items-center gap-2.5", className)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <FixGlyph size={size} animate={animated} />
      <div className="flex flex-col leading-none">
        <span
          className={cn(
            "font-heading font-semibold tracking-tight text-foreground",
            size === "xl"
              ? "text-3xl"
              : size === "lg"
                ? "text-2xl"
                : size === "md"
                  ? "text-lg"
                  : "text-base"
          )}
        >
          FixMind
          <span className="text-gradient font-semibold"> AI</span>
        </span>
        {withTagline && (
          <span className="mt-1 text-[11px] leading-tight font-medium tracking-wide text-muted-foreground">
            AI that learns from what actually works.
          </span>
        )}
      </div>
    </div>
  );
}