"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Crown, Flame, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Icon } from "@/components/shared/icon";
import { PageHeader } from "@/components/shared/page-header";
import { useLeaderboard } from "@/lib/hooks";
import { leaderboardPools } from "@/lib/data";
import { avatarGradient } from "@/lib/format";

const BADGE_TONE: Record<string, string> = {
  "Verification Master": "border-success/25 bg-success/10 text-success",
  "Fix Architect": "border-violet-300/25 bg-violet-500/10 text-violet-300",
  "Top Diagnostician": "border-cyan-300/25 bg-cyan-400/10 text-cyan-300",
  "Crowd Verifier": "border-amber-300/25 bg-amber-400/10 text-amber-300",
  "OG Builder": "border-rose-300/25 bg-rose-400/10 text-rose-300",
};

export function LeaderboardContent() {
  const leaderboard = useLeaderboard();
  const top3 = leaderboard.filter((e) => e.rank <= 3);
  const rest = leaderboard.filter((e) => e.rank > 3);
  const you = leaderboard.find((e) => e.isYou);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Rankings"
        title="Leaderboard"
        subtitle="Weekly rankings reward verified, high-quality fixes — not just volume."
        action={
          <Tabs defaultValue="weekly" aria-label="Leaderboard period">
            <TabsList>
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="all">All-Time</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {top3.map((e) => {
          const order = e.rank === 1 ? "sm:order-2" : e.rank === 2 ? "sm:order-1" : "sm:order-3";
          return (
            <motion.div
              key={e.handle}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (e.rank - 1) * 0.08 }}
              className={cn(
                "relative flex flex-col items-center rounded-2xl border p-6 text-center ring-1 ring-foreground/5",
                e.rank === 1
                  ? "border-yellow-300/30 bg-linear-to-b from-yellow-400/10 to-transparent ring-yellow-300/10"
                  : e.rank === 2
                    ? "border-slate-300/20 bg-linear-to-b from-slate-400/10 to-transparent"
                    : "border-amber-500/20 bg-linear-to-b from-amber-500/10 to-transparent",
                order
              )}
            >
              {e.rank === 1 && (
                <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-yellow-300/40 bg-background px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-yellow-300">
                  <Crown className="size-3" /> Leader
                </span>
              )}
              <span className="font-heading text-3xl font-bold text-foreground/20">{e.rank}</span>
              <Avatar size="lg" className="mt-1">
                <AvatarFallback className={cn("bg-linear-to-br text-sm text-white", avatarGradient(e.handle))}>
                  {e.initials}
                </AvatarFallback>
              </Avatar>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {e.name}
                {e.isYou && <span className="ml-1 text-[10px] font-bold text-primary">(you)</span>}
              </p>
              <p className="text-[10px] text-muted-foreground">{e.handle} · streak {e.streak} days</p>
              <p className="mt-2 flex items-center gap-1 font-heading text-xl font-semibold text-cyan-300">
                <Icon name="coins" className="size-4" /> {e.fixEarned.toLocaleString()} FIX
              </p>
              {e.badge && (
                <Badge variant="secondary" className={cn("mt-2 text-[9px]", BADGE_TONE[e.badge] ?? "border-primary/25 bg-primary/10 text-primary")}>
                  {e.badge}
                </Badge>
              )}
              <p className="mt-3 text-[11px] text-muted-foreground">
                ✓ {e.verified} verified · {e.successRate}% success
              </p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Rankings</CardTitle>
            <CardDescription>All verified contributors this week</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {rest.map((e) => (
              <div
                key={e.handle}
                className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/50"
              >
                <span className="w-6 text-center font-heading text-xs font-semibold text-muted-foreground">
                  {e.rank}
                </span>
                <Avatar size="sm">
                  <AvatarFallback className={cn("bg-linear-to-br text-[10px] text-white", avatarGradient(e.handle))}>
                    {e.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">{e.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    ✓ {e.verified} · {e.successRate}% · reputation {e.reputation.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  {e.movement > 0 ? (
                    <span className="flex items-center gap-0.5 text-[10px] text-success">
                      <TrendingUp className="size-3" /> {e.movement}
                    </span>
                  ) : e.movement < 0 ? (
                    <span className="flex items-center gap-0.5 text-[10px] text-destructive">
                      <TrendingDown className="size-3" /> {Math.abs(e.movement)}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">—</span>
                  )}
                  <span className="font-heading text-xs font-semibold text-cyan-300">
                    {e.fixEarned.toLocaleString()} FIX
                  </span>
                </div>
              </div>
            ))}
            <Separator />
            {you && (
              <div className="flex items-center gap-3 rounded-lg bg-primary/10 px-2 py-2 ring-1 ring-primary/20">
                <span className="w-6 text-center font-heading text-xs font-semibold text-primary">{you.rank}</span>
                <Avatar size="sm">
                  <AvatarFallback className={cn("bg-linear-to-br text-[10px] text-white", avatarGradient(you.handle))}>
                    {you.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">
                    {you.name} <span className="text-[10px] font-semibold text-primary">(you)</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    ✓ {you.verified} · {you.successRate}% · reputation {you.reputation.toLocaleString()}
                  </p>
                </div>
                <span className="font-heading text-xs font-semibold text-cyan-300">
                  {you.fixEarned.toLocaleString()} FIX
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="relative overflow-hidden">
            <div className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-cyan-400/10 blur-3xl" />
            <CardHeader>
              <CardTitle>Weekly reward pool</CardTitle>
              <CardDescription>Split 80/20 among verified contributors</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end justify-between">
                <p className="font-heading text-3xl font-bold tracking-tight text-foreground">
                  {leaderboardPools.weekly.toLocaleString()}
                </p>
                <p className="flex items-center gap-1 pb-1 text-[11px] text-cyan-300">
                  <Icon name="coins" className="size-3.5" /> FIX
                </p>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Your current share</span>
                  <span className="font-semibold text-foreground">186 FIX (~1.5%)</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Top tier cutoff</span>
                  <span className="font-semibold text-foreground">{top3[2]?.fixEarned.toLocaleString() ?? 0} FIX</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Snapshot</span>
                  <span className="font-semibold text-foreground">in 2d 14h</span>
                </div>
              </div>
              <Button size="sm" className="w-full" render={<a href="/contribute" />}>
                <Icon name="trophy" className="size-3.5" /> Push for podium
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Streaks</CardTitle>
              <CardDescription>Consecutive verification days</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {[...leaderboard]
                .sort((a, b) => b.streak - a.streak)
                .slice(0, 5)
                .map((e, i) => (
                  <div key={e.handle} className="flex items-center gap-2.5 text-xs">
                    <span className="flex w-4 items-center justify-center text-[10px] text-muted-foreground">{i + 1}</span>
                    <span className="flex items-center gap-1 text-amber-300">
                      <Flame className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-foreground">
                      {e.name}
                      {e.isYou && <span className="text-primary"> (you)</span>}
                    </span>
                    <span className="font-semibold text-muted-foreground">{e.streak} days</span>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}