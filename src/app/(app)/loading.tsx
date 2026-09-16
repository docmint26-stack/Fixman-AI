import { KpiSkeleton, ListSkeleton } from "@/components/shared/loading";

export default function AppLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="h-3 w-24 animate-pulse rounded-full bg-foreground/10" />
        <div className="h-7 w-64 animate-pulse rounded-lg bg-foreground/10" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <KpiSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ListSkeleton count={4} />
        </div>
        <ListSkeleton count={3} />
      </div>
    </div>
  );
}