import Link from "next/link";
import { ArrowUpRight, Clock3, CircleHelp } from "lucide-react";
import { cn } from "cn";

import type { AppCase } from "@/lib/data";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { TokenBadge } from "@/components/shared/token-badge";
import { Icon } from "@/components/shared/icon";

const SEVERITY_STYLE: Record<string, string> = {
  Low: "text-slate-400",
  Medium: "text-warning",
  High: "text-amber-400",
  Critical: "text-destructive",
};

export function CaseRow({ c, compact = false }: { c: AppCase; compact?: boolean }) {
  return (
    <Link
      href={`/cases/${c.id}`}
      className="group flex items-center gap-3 rounded-xl border border-border/70 bg-card/50 p-3.5 ring-1 ring-foreground/5 transition-all hover:-translate-y-px hover:border-primary/30 hover:ring-primary/20"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-muted/40 text-muted-foreground transition-colors group-hover:text-primary">
        <Icon name={c.category.includes("Network") ? "wifi-off" : "bug"} className="size-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">{c.title}</p>
          {!compact && <StatusBadge status={c.status} className="hidden sm:inline-flex" />}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className={cn("font-medium", SEVERITY_STYLE[c.severity])}>{c.severity}</span>
          <span className="flex items-center gap-1">
            <Clock3 className="size-3" /> {c.updatedAt}
          </span>
          <span className="hidden items-center gap-1 sm:flex">
            <CircleHelp className="size-3" /> {c.confidence}% confidence
          </span>
          <span className="text-success">{c.successRate}% success</span>
        </div>
      </div>

      {!compact && (
        <div className="hidden shrink-0 md:block">
          <TokenBadge value={c.reward} signed />
        </div>
      )}

      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground/50 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}

export function CaseCard({ c }: { c: AppCase }) {
  return (
    <Link
      href={`/cases/${c.id}`}
      className="group flex flex-col gap-3 rounded-xl border border-border/70 bg-card/50 p-4 ring-1 ring-foreground/5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-muted/40 text-muted-foreground transition-colors group-hover:text-primary">
          <Icon name={c.category.includes("Network") ? "wifi-off" : "bug"} className="size-4" />
        </span>
        <StatusBadge status={c.status} />
      </div>

      <div className="space-y-1.5">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">{c.title}</p>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-[10px]">{c.category}</Badge>
          {c.tags.slice(0, 2).map((t) => (
            <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
          ))}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-3">
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>✓ {c.successRate}%</span>
          <span>▲ {c.matchedCases.toLocaleString()} matched</span>
        </div>
        <TokenBadge value={c.reward} signed />
      </div>
    </Link>
  );
}