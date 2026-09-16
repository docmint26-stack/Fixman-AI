import { Badge } from "@/components/ui/badge";
import { cn } from "cn";
import type { CaseStatus } from "@/lib/demo/types";

const STYLES: Record<CaseStatus, { label: string; className: string; dot: string }> = {
  Suggested: {
    label: "Suggested",
    className: "border-info/30 bg-info/10 text-info dark:bg-info/15",
    dot: "bg-info",
  },
  Applied: {
    label: "Applied",
    className: "border-violet-400/30 bg-violet-500/10 text-violet-300 dark:bg-violet-400/15",
    dot: "bg-violet-400",
  },
  Monitoring: {
    label: "Monitoring",
    className: "border-warning/30 bg-warning/10 text-warning dark:bg-warning/15",
    dot: "bg-warning",
  },
  Verified: {
    label: "Verified",
    className: "border-success/30 bg-success/10 text-success dark:bg-success/15",
    dot: "bg-success",
  },
  "Partially Verified": {
    label: "Partially Verified",
    className: "border-amber-300/30 bg-amber-400/10 text-amber-500 dark:bg-amber-400/15",
    dot: "bg-amber-400",
  },
  Failed: {
    label: "Failed",
    className: "border-destructive/30 bg-destructive/10 text-destructive dark:bg-destructive/15",
    dot: "bg-destructive",
  },
  "Needs Verification": {
    label: "Needs Verification",
    className: "border-indigo-300/30 bg-indigo-500/10 text-indigo-300 dark:bg-indigo-400/15",
    dot: "bg-indigo-400",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: CaseStatus;
  className?: string;
}) {
  const s = STYLES[status];
  return (
    <Badge variant="outline" className={cn(s.className, "h-5 px-2 text-[11px]", className)}>
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {s.label}
    </Badge>
  );
}