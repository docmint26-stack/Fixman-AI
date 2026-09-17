"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleHelp,
  Clock3,
  FastForward,
  Landmark,
  Sparkles,
  TriangleAlert,
  Trophy,
  ChevronRight,
  Minus,
} from "lucide-react";
import { cn } from "cn";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { TokenBadge } from "@/components/shared/token-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/shared/empty-state";
import { Icon } from "@/components/shared/icon";
import { VerificationPanel } from "@/components/diagnose/verification-panel";
import { useCase, useCaseActions, useRewards } from "@/lib/hooks";
import { isDemoMode } from "@/lib/services";
import type { OutcomeState, RankingFix } from "@/lib/demo/types";

const CONFIDENCE_STYLE: Record<string, string> = {
  High: "text-success",
  Medium: "text-warning",
  Low: "text-muted-foreground",
};

const RISK_STYLE: Record<string, string> = {
  Low: "text-success",
  Medium: "text-warning",
  High: "text-destructive",
};

export function DiagnosisResult({ caseId }: { caseId: string }) {
  const c = useCase(caseId);
  const { applyFix, setStepsDone, submitOutcome, finalizeVerification, markFailed } = useCaseActions();
  const { claimable } = useRewards();
  const [outcome, setOutcome] = React.useState<OutcomeState>("resolved");
  const [verifying, setVerifying] = React.useState(false);

  if (!c) {
    return (
      <EmptyState
        icon="compass"
        title="Case not found"
        description={isDemoMode ? "This case doesn't exist or has been cleared with the demo data." : "This case doesn't exist or you no longer have access to it."}
        actionLabel="Back to my cases"
        href="/cases"
      />
    );
  }

  const selectedFix = c.fixes.find((f) => f.id === c.selectedFixId) ?? null;
  const allStepsDone = c.stepsTotal > 0 && c.stepsDone >= c.stepsTotal;
  const isResolvedPath = c.outcome === "resolved";

  const toggleStep = (index: number) => {
    if (!selectedFix) return;
    const next = index < c.stepsDone ? index : index + 1;
    setStepsDone(c.id, next);
  };

  return (
    <div className="space-y-6">
      <Link
        href="/cases"
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Back to my cases
      </Link>

      <PageHeader
        eyebrow={c.category}
        title={c.title}
        subtitle={c.symptom}
        action={<StatusBadge status={c.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          {c.problemSummary && <section className="rounded-2xl border border-border/80 bg-card/70 p-5">
            <h2 className="text-sm font-semibold">Problem Summary</h2><p className="mt-2 text-sm">{c.problemSummary}</p>
            <h2 className="mt-4 text-sm font-semibold">Likely Cause</h2><p className="mt-2 text-sm">{c.reasoning[0]?.cause ?? "Needs more evidence"}</p>
          </section>}
          {c.sources && <section className="rounded-2xl border border-border/80 bg-card/70 p-5">
            <h2 className="text-sm font-semibold">Sources / Provenance</h2>
            {c.sources.length === 0 && <p className="mt-2 text-xs">No grounded sources were retrieved.</p>}
            {c.sources.map(source => <div key={source.id} className="mt-3 rounded-lg border border-border p-3 text-sm">
              <p>{source.title ?? ({ official_doc: "Official Documentation", curated: "Curated Knowledge", knowledge_chunk: "Curated Knowledge", verified_outcome: "Verified Outcome Pattern", outcome_intelligence: "Verified Outcome Pattern" } as Record<string, string>)[source.source_type] ?? "Knowledge Source"}</p>
              {source.source_url && /^https?:\/\//i.test(source.source_url) && <a className="text-primary underline" href={source.source_url} target="_blank" rel="noreferrer">View source</a>}
            </div>)}
          </section>}
          {verifying ? (
            <div className="rounded-2xl border border-border/80 bg-card/70 p-6">
              <VerificationPanel
                title="Confirming the observation window, then writing the outcome to the graph."
                onComplete={() => {
                  finalizeVerification(c.id);
                  setVerifying(false);
                }}
              />
            </div>
          ) : (
            <>
              {/* -------- Reward pill across states -------- */}
              <RewardBanner c={c} claimable={claimable} />

              {/* -------- Verification success -------- */}
              {c.status === "Verified" && (
                <div className="flex flex-col gap-4 rounded-2xl border border-success/25 bg-success/5 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-success/30 bg-success/10 text-success">
                      <Trophy className="size-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Outcome verified</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {c.verificationConfidence ?? 96}% verification confidence · outcome written to the graph
                        {isResolvedPath ? " · problem stays resolved" : " · partial resolution recorded"}.
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/rewards"
                    className="shrink-0 rounded-lg bg-success/15 px-3 py-2 text-xs font-medium text-success transition-colors hover:bg-success/25"
                  >
                    View rewards →
                  </Link>
                </div>
              )}

              {/* -------- Failure state -------- */}
              {c.status === "Failed" && (
                <div className="flex items-start gap-3 rounded-2xl border border-destructive/25 bg-destructive/5 p-5">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Outcome not resolved</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      This fix didn&apos;t hold. Try another ranked fix, or submit a new diagnosis with the new evidence.
                    </p>
                  </div>
                </div>
              )}

              {/* -------- Monitoring / observation -------- */}
              {(c.status === "Monitoring" || c.status === "Applied") && c.observation && (
                <div className="rounded-2xl border border-warning/25 bg-warning/5 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Clock3 className="size-4 text-warning" />
                      <p className="text-sm font-medium text-foreground">Observation window</p>
                    </div>
                    <span className="text-xs font-medium text-warning">{c.observation.timeLabel}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Verifiers watch for error recurrence over {c.observation.hoursTotal}h before signing the outcome.
                  </p>
                  <div className="mt-3">
                    <Progress value={(c.observation.hoursElapsed / c.observation.hoursTotal) * 100} className="w-full" />
                  </div>
                  {isDemoMode && c.status === "Monitoring" && isResolvedPath && !c.observation.complete && (
                    <div className="mt-4 flex items-center gap-3 rounded-xl bg-card/70 p-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                        <FastForward className="size-4" />
                      </span>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-foreground">Demo: skip the wait</p>
                        <p className="text-[11px] text-muted-foreground">Move to 24h and verify the outcome now.</p>
                      </div>
                      <Button size="sm" onClick={() => setVerifying(true)}>
                        Advance time
                      </Button>
                    </div>
                  )}
                  {!isDemoMode && c.status === "Monitoring" && isResolvedPath && !c.observation.complete && (
                    <p className="mt-4 text-[11px] text-muted-foreground">
                      This case will resolve automatically once the server completes the observation window.
                    </p>
                  )}
                  {c.status === "Monitoring" && !isResolvedPath && (
                    <Button size="sm" variant="secondary" className="mt-4 bg-card/70" onClick={() => markFailed(c.id)}>
                      Mark as not resolved
                    </Button>
                  )}
                  {c.status === "Monitoring" && isResolvedPath && c.observation.complete && (
                    <p className="mt-3 text-xs text-success">Observation window complete.</p>
                  )}
                </div>
              )}

              {/* -------- Suggested: top pick + ranked fixes -------- */}
              {!selectedFix && (
                <FixRankings c={c} onTry={applyFix} />
              )}

              {/* -------- Applied: active fix checklist -------- */}
              {selectedFix && (
                <div className="rounded-2xl border border-border/80 bg-card/70">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                        <Icon name="wrench" className="size-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{selectedFix.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Fix #{selectedFix.rank} · {selectedFix.estimatedTime} · {selectedFix.steps.length} steps
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {c.stepsDone}/{c.stepsTotal} done
                      </span>
                      <span className="text-xs font-semibold text-success">{selectedFix.verifiedSuccessRate === null ? "Insufficient verified outcome data" : `${selectedFix.verifiedSuccessRate ?? selectedFix.successRate}% verified success`}</span>
                    </div>
                  </div>

                  <div className="px-5 py-3">
                    <Progress value={(c.stepsDone / c.stepsTotal) * 100} className="w-full" />
                  </div>

                  <ol className="divide-y divide-border/60 px-5">
                    {selectedFix.steps.map((s, i) => {
                      const done = i < c.stepsDone;
                      return (
                        <li key={i}>
                          <button
                            onClick={() => toggleStep(i)}
                            className="flex w-full items-start gap-3 py-3 text-left"
                          >
                            <span
                              className={cn(
                                "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-[10px] transition-colors",
                                done
                                  ? "border-success bg-success text-white"
                                  : "border-border text-muted-foreground hover:border-primary"
                              )}
                            >
                              {done ? <Check className="size-3" /> : i + 1}
                            </span>
                            <span
                              className={cn(
                                "flex-1 text-sm leading-relaxed",
                                done ? "text-muted-foreground line-through" : "text-foreground"
                              )}
                            >
                              {s}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>

                  {allStepsDone && c.status !== "Monitoring" && c.status !== "Verified" && (
                    <div className="border-t border-border/60 px-5 py-4">
                      <Dialog>
                        <DialogTrigger render={<Button className="w-full">Submit outcome</Button>} />
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>How did it go?</DialogTitle>
                            <DialogDescription>
                              Choose the outcome after applying <span className="text-foreground">{selectedFix.title}</span>.
                              {isDemoMode ? " Demo value is simulated." : " The server verifies it over the full observation window."}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-2 py-2">
                            {(
                              [
                                { v: "resolved" as const, label: "Fixed — everything works now", tone: "text-success" },
                                { v: "partial" as const, label: "Partly fixed — some issues remain", tone: "text-warning" },
                                { v: "not-resolved" as const, label: "Did not fix it", tone: "text-destructive" },
                              ]
                            ).map((o) => (
                              <button
                                key={o.v}
                                onClick={() => setOutcome(o.v)}
                                className={cn(
                                  "flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors",
                                  outcome === o.v
                                    ? "border-primary bg-primary/5 text-foreground"
                                    : "border-border text-muted-foreground hover:border-primary/40"
                                )}
                              >
                                <span
                                  className={cn(
                                    "grid size-4 place-items-center rounded-full border",
                                    outcome === o.v ? "border-primary bg-primary" : "border-border"
                                  )}
                                >
                                  {outcome === o.v && <span className="size-1.5 rounded-full bg-white" />}
                                </span>
                                <span className={cn(outcome === o.v && o.tone)}>{o.label}</span>
                              </button>
                            ))}
                          </div>
                          <DialogFooter>
                            <DialogClose render={<Button variant="ghost">Cancel</Button>} />
                            <DialogClose
                              render={
                                <Button
                                  onClick={() => {
                                    submitOutcome(c.id, outcome);
                                    setOutcome("resolved");
                                  }}
                                >
                                  Submit <ArrowRight className="size-4" />
                                </Button>
                              }
                            />
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}

                  {c.status === "Applied" && !allStepsDone && (
                    <p className="border-t border-border/60 px-5 py-3 text-[11px] text-muted-foreground">
                      Complete every step, then submit the outcome to open a 24h verification window.
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* -------- Reasoning -------- */}
          <section className="rounded-2xl border border-border/80 bg-card/70 p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="size-4 text-violet-300" /> Why this was diagnosed this way
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.description}</p>
            <ul className="mt-4 space-y-3">
              {c.reasoning.map((r) => (
                <li key={r.cause}>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-foreground/90">{r.cause}</span>
                    <span className="shrink-0 font-mono text-muted-foreground">{r.likelihood}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-violet-500 to-cyan-400"
                      style={{ width: `${r.likelihood}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* -------- Timeline -------- */}
          <section className="rounded-2xl border border-border/80 bg-card/70 p-5">
            <h2 className="text-sm font-semibold text-foreground">Case timeline</h2>
            <ol className="mt-4 space-y-0">
              {c.timeline.map((t, i) => (
                <li key={t.id} className="relative flex gap-3 pb-5 last:pb-0">
                  {i < c.timeline.length - 1 && (
                    <span className="absolute left-[9px] top-5 h-full w-px bg-border" />
                  )}
                  <span
                    className={cn(
                      "relative mt-1 grid size-5 shrink-0 place-items-center rounded-full border",
                      t.tone === "success" && "border-success/40 bg-success/10 text-success",
                      t.tone === "warning" && "border-warning/40 bg-warning/10 text-warning",
                      t.tone === "danger" && "border-destructive/40 bg-destructive/10 text-destructive",
                      t.tone === "violet" && "border-violet-400/40 bg-violet-500/10 text-violet-300",
                      t.tone === "info" && "border-info/40 bg-info/10 text-info",
                      t.tone === "neutral" && "border-border bg-muted text-muted-foreground"
                    )}
                  >
                    {t.tone === "success" ? (
                      <Check className="size-3" />
                    ) : t.tone === "danger" ? (
                      <Minus className="size-3" />
                    ) : (
                      <span className="size-1.5 rounded-full bg-current" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{t.label}</p>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{t.time}</span>
                    </div>
                    {t.detail && <p className="mt-0.5 text-xs text-muted-foreground">{t.detail}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* -------- Right rail -------- */}
        <SideRail c={c} />
      </div>
    </div>
  );
}

function RewardBanner({ c, claimable }: { c: NonNullable<ReturnType<typeof useCase>>; claimable: number }) {
  if (c.rewardStatus === "claimable") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-400/25 bg-cyan-400/5 p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
            <Landmark className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">+{c.reward} FIX unlocked</p>
            <p className="text-[11px] text-muted-foreground">
              Reward for verified outcome · {claimable.toLocaleString()} total claimable
            </p>
          </div>
        </div>
        <Button size="sm" variant="secondary" render={<Link href="/rewards" />}>
          Claim rewards <ChevronRight className="size-3.5" />
        </Button>
      </div>
    );
  }
  if (c.rewardStatus === "pending") {
    return (
      <div className="rounded-2xl border border-border/70 bg-card/60 p-4 text-xs text-muted-foreground">
        +{c.reward} FIX is pending verification for this case —
        {c.status === "Monitoring" ? " it unlocks when the outcome verifies." : " observation in progress."}
      </div>
    );
  }
  if (c.rewardStatus === "claimed") {
    return (
      <div className="rounded-2xl border border-border/70 bg-card/60 p-4 text-xs text-muted-foreground">
        <span className="text-success">Claimed</span> · +{c.reward} FIX was added to your balance.
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 p-4 text-xs text-muted-foreground">
      Earn up to <TokenBadge value={c.reward} signed /> when this outcome verifies. No wallet needed to earn.
    </div>
  );
}

function FixRankings({ c, onTry }: { c: NonNullable<ReturnType<typeof useCase>>; onTry: (id: string, fixId: string) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Sparkles className="size-4 text-violet-300" /> Ranked fixes for your case
        </h2>
        <span className="text-[11px] text-muted-foreground">
          {c.matchedCases.toLocaleString()} similar cases matched
        </span>
      </div>
      {c.fixes.map((f, i) => (
        <FixCard key={f.id} fix={f} isTop={i === 0} onTry={() => onTry(c.id, f.id)} selected={false} />
      ))}
    </div>
  );
}

export function FixCard({
  fix,
  isTop,
  onTry,
  selected,
}: {
  fix: RankingFix;
  isTop: boolean;
  onTry: () => void;
  selected: boolean;
}) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border bg-card/70 p-5 transition-colors",
        selected ? "border-primary/50" : "border-border/80"
      )}
    >
      {fix.isTopPicked && (
        <span className="absolute -top-2.5 left-4 flex items-center gap-1 rounded-full bg-linear-to-r from-violet-500/90 to-cyan-500/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
          <Sparkles className="size-3" /> Top pick
        </span>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground">#{fix.rank}</span>
            <h3 className="text-sm font-semibold text-foreground">{fix.title}</h3>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{fix.why}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {fix.tags.map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
            ))}
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-3">
          <Stat label="Verified success" value={fix.verifiedSuccessRate === null ? "Insufficient data" : `${fix.verifiedSuccessRate ?? fix.successRate}%`} className="text-success" />
          <Stat label="Match" value={`${fix.matchScore}%`} />
          <Stat label="Puvexa confidence" value={fix.confidence} className={CONFIDENCE_STYLE[fix.confidence]} />
          <Stat label="Risk" value={fix.risk} className={RISK_STYLE[fix.risk]} />
          <Stat label="Effort" value={fix.effort} />
          <Stat label="Time" value={fix.estimatedTime} />
        </div>
      </div>
      {fix.trustLabel && <div className="mt-3 text-xs"><Badge>{fix.trustLabel}</Badge><span className="ml-2">Source type: {fix.sourceType}</span></div>}
      {fix.statisticalStatus && <p className="mt-3 text-xs">{fix.verifiedSuccessRate == null ? "Insufficient verified outcome data" : `${fix.verifiedSuccessRate}% verified success across ${fix.verifiedCases} eligible outcomes`}</p>}
      <details className="mt-3 text-xs"><summary className="cursor-pointer font-medium">Why Puvexa recommends this</summary><p className="mt-2">{fix.why}</p></details>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
        <p className="text-[11px] text-muted-foreground">
          <CircleHelp className="mr-1 inline size-3" />
          Based on {fix.verifiedCases.toLocaleString()} verified outcome(s)
        </p>
        {!isTop ? (
          <Button size="sm" variant="secondary" onClick={onTry}>
            Try this fix <ArrowRight className="size-3.5" />
          </Button>
        ) : (
          <Button size="sm" onClick={onTry}>
            <Icon name="wrench" className="size-3.5" /> Try this fix
          </Button>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("text-xs font-semibold text-foreground", className)}>{value}</p>
    </div>
  );
}

function SideRail({ c }: { c: NonNullable<ReturnType<typeof useCase>> }) {
  const rows = [
    ["Operating system", c.environment.os],
    ["Device", c.environment.device],
    ["Version", c.environment.version ?? "—"],
    ["Recent change", c.environment.recentChange ?? "—"],
  ];
  return (
    <aside className="space-y-4">
      <div className="rounded-2xl border border-border/80 bg-card/70 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Environment</p>
        <dl className="mt-3 space-y-2.5">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt className="text-[11px] text-muted-foreground">{k}</dt>
              <dd className="text-sm font-medium text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
        {c.evidence && c.evidence.length > 0 && (
          <p className="mt-3 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
            Evidence: {c.evidence.join(", ")}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-border/80 bg-card/70 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Similar verified cases</p>
        <ul className="mt-3 space-y-2">
          {c.similarCases.map((s) => (
            <li key={s.title} className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-medium text-foreground">{s.title}</p>
                <StatusBadge status={s.outcome} className="shrink-0" />
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {s.category} · {s.match}% match
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card/70 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Puvexa confidence</p>
        {c.confidenceBreakdown && <dl className="mt-3 text-xs">{Object.entries(c.confidenceBreakdown).filter(([, value]) => typeof value === "number").map(([key, value]) => <div key={key} className="flex justify-between gap-2"><dt>{key.replaceAll("_", " ")}</dt><dd>{Math.round(value * 100)}%</dd></div>)}</dl>}
        <div className="mt-2 flex items-center gap-3">
          <span className="font-heading text-3xl font-semibold text-foreground">{c.confidence}%</span>
          <div className="flex-1">
            <Progress value={c.confidence} className="w-full" />
            <p className="mt-1 text-[11px] text-muted-foreground">{c.matchedCases.toLocaleString()} matched cases</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
