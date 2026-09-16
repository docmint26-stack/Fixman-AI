"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/shared/icon";
import { RotatingWords } from "@/components/shared/motion";
import { intelligenceImpact } from "@/lib/data";

export function InsightCard() {
  const cards = intelligenceImpact.insightCards;
  const [cardIdx, setCardIdx] = React.useState(0);
  const card = cards[cardIdx % cards.length];

  React.useEffect(() => {
    const id = window.setInterval(() => setCardIdx((i) => (i + 1) % cards.length), 5000);
    return () => window.clearInterval(id);
  }, [cards.length]);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-primary/20 bg-linear-to-r from-violet-500/10 via-card/60 to-cyan-400/10 p-5 ring-1 ring-primary/10 sm:p-6">
      <div className="pointer-events-none absolute -left-24 -top-24 size-64 rounded-full bg-violet-500/10 blur-3xl transition-opacity group-hover:opacity-80" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 size-64 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-violet-300">
          <Icon name="brain-circuit" className="size-5" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
            AI Weekly Insight
          </p>
          <motion.p
            key={card.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-1 font-heading text-base font-semibold leading-snug text-foreground sm:text-lg"
          >
            {card.title}
          </motion.p>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{card.description}</p>
        </div>

        <div className="flex shrink-0 flex-row items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
          <p className="font-heading text-2xl font-semibold text-success">{card.impact}</p>
          <p className="text-[11px] text-muted-foreground">your impact</p>
          {card.href && (
            <Button size="sm" variant="secondary" className="mt-1 hidden sm:inline-flex" render={<Link href={card.href} />}>
              {card.actionLabel ?? "View"} <ArrowRight className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      <motion.div
        className="relative mt-4 flex items-center gap-2 overflow-hidden rounded-lg border border-border/60 bg-background/40 px-3 py-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <TrendingUp className="size-3.5 shrink-0 text-primary" />
        <p className="truncate text-[11px] text-muted-foreground">
          <RotatingWords words={intelligenceImpact.phrases} />
        </p>
      </motion.div>
    </div>
  );
}