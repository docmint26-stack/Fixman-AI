"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { cn } from "cn";

const GLYPH_SIZES = {
  xs: 20,
  sm: 26,
  md: 34,
  lg: 44,
  xl: 64,
} as const;

export type GlyphSize = keyof typeof GLYPH_SIZES;

type PuvexaMarkProps = {
  size?: GlyphSize;
  animate?: boolean;
  className?: string;
};

/**
 * The Puvexa mark — the official logo asset served from /puvexa.png.
 * When `animate` is true the mark fades and scales in.
 */
export function PuvexaMark({
  size = "md",
  animate = false,
  className,
}: PuvexaMarkProps) {
  const px = GLYPH_SIZES[size];
  return (
    <motion.div
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-[28%] border border-primary/20 bg-gradient-to-br from-primary/15 via-indigo-500/10 to-cyan-400/15 shadow-[0_0_24px_-6px] shadow-primary/40",
        className
      )}
      style={{ width: px, height: px }}
      aria-hidden
      initial={animate ? { opacity: 0, scale: 0.8 } : false}
      animate={animate ? { opacity: 1, scale: 1 } : undefined}
    >
      <Image
        src="/puvexa.png"
        alt=""
        width={px}
        height={px}
        className="object-cover"
      />
    </motion.div>
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
      <PuvexaMark size={size} animate={animated} />
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
          Puvexa
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