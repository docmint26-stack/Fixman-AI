"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/shared/icon";
import { CaseCard } from "@/components/shared/case-card";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { useCases } from "@/lib/hooks";
import type { CaseStatus } from "@/lib/demo/types";

const CATEGORIES = [
  "Coding Error",
  "Windows / OS",
  "Network & Wi-Fi",
  "Hardware & Devices",
  "Apps & Productivity",
  "Performance",
  "Security",
] as const;

const FILTERS: { label: string; value: "All" | CaseStatus }[] = [
  { label: "All", value: "All" },
  { label: "Suggested", value: "Suggested" },
  { label: "Monitoring", value: "Monitoring" },
  { label: "Verified", value: "Verified" },
  { label: "Needs Verification", value: "Needs Verification" },
  { label: "Failed", value: "Failed" },
];

export function CasesContent() {
  const cases = useCases();
  const [filter, setFilter] = React.useState<"All" | CaseStatus>("All");
  const [category, setCategory] = React.useState<string>("All");
  const [query, setQuery] = React.useState("");

  const filtered = cases.filter((c) => {
    const statusOk = filter === "All" || c.status === filter;
    const categoryOk = category === "All" || c.category === category;
    const q = query.trim().toLowerCase();
    const queryOk =
      !q ||
      c.title.toLowerCase().includes(q) ||
      c.symptom.toLowerCase().includes(q) ||
      c.tags.some((t) => t.toLowerCase().includes(q));
    return statusOk && categoryOk && queryOk;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cases"
        title="My Cases"
        subtitle="Every AI diagnosis you've run, plus fixes selected and verified."
        action={
          <Button render={<Link href="/diagnose" />}>
            <Icon name="plus" className="size-4" /> New Diagnosis
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            {FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value}>
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search cases…"
              className="h-9 w-44 rounded-lg border border-border/70 bg-muted/20 pl-8 pr-3 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/50 sm:w-56"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-9 rounded-lg border border-border/70 bg-muted/20 px-2.5 text-xs text-foreground outline-none transition-colors focus:border-primary/50"
            aria-label="Filter by category"
          >
            <option value="All">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <Button size="sm" variant="ghost" className="hidden text-muted-foreground sm:inline-flex" onClick={() => setCategory("All")}>
            <SlidersHorizontal className="size-3.5" />
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        {filtered.length} case{filtered.length === 1 ? "" : "s"} ·{" "}
        <Badge variant="secondary" className="text-[10px]">
          Sorted by most recent
        </Badge>
      </p>

      {filtered.length > 0 ? (
        <motion.div layout className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <CaseCard key={c.id} c={c} />
          ))}
        </motion.div>
      ) : (
        <EmptyState
          icon="files"
          title="No cases match"
          description="Try clearing the search or filters, or run a new AI diagnosis to get a fresh case."
          href="/diagnose"
          actionLabel="New Diagnosis"
        />
      )}
    </div>
  );
}