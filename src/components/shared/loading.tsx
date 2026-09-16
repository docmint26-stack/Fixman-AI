import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "cn";

export function CardSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border/60 bg-card p-5 ring-1 ring-foreground/5", className)}>
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="mt-3 space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-full" style={{ width: `${90 - i * 12}%` }} />
        ))}
      </div>
    </div>
  );
}

export function KpiSkeleton() {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 ring-1 ring-foreground/5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="mt-3 h-7 w-20" />
      <Skeleton className="mt-2 h-3 w-16" />
    </div>
  );
}

export function ListSkeleton({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} rows={2} />
      ))}
    </div>
  );
}

export function AnalyzingLoader({ step = 0 }: { step?: number }) {
  const steps = [
    "Reading problem context…",
    "Scanning verified cases…",
    "Ranking top fixes…",
    "Calculating confidence…",
  ];
  return (
    <div className="flex flex-col items-center gap-4 py-10">
      <div className="relative size-12">
        <span className="absolute inset-0 rounded-full border-2 border-border animate-spin-slow" />
        <span className="absolute inset-1 rounded-full border-2 border-t-transparent border-primary" />
        <span className="absolute inset-0 rounded-full bg-primary/20 blur-md animate-pulse-glow" />
      </div>
      <div className="space-y-2 text-center">
        <p className="font-heading text-sm font-medium text-foreground">Analyzing your problem</p>
        <p className="text-xs text-muted-foreground">{steps[step % steps.length]}</p>
      </div>
      <div className="flex gap-1.5">
        {steps.map((_, i) => (
          <span
            key={i}
            className={cn(
              "size-1.5 rounded-full transition-all",
              i <= step ? "bg-primary" : "bg-foreground/15"
            )}
          />
        ))}
      </div>
    </div>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-foreground/10", className)}>
      <div
        className="h-full rounded-full bg-linear-to-r from-violet-500 via-indigo-400 to-cyan-400 transition-all duration-500"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function PulseDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex size-2", className)}>
      <span className="absolute inset-0 rounded-full bg-success animate-signal" />
      <span className="relative size-2 rounded-full bg-success" />
    </span>
  );
}