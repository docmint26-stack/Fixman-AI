import { cn } from "cn";
import { Icon } from "@/components/shared/icon";
import { Button } from "@/components/ui/button";

export function EmptyState({
  icon = "inbox",
  title,
  description,
  actionLabel,
  onAction,
  href,
  size = "md",
  className,
}: {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  href?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center",
        size === "lg" && "py-16",
        size === "sm" && "py-6",
        className
      )}
    >
      <div className="relative">
        <span className="absolute inset-0 rounded-full bg-primary/20 blur-lg" />
        <div className="relative grid size-12 place-items-center rounded-full border border-border bg-card text-muted-foreground">
          <Icon name={icon} className="size-5" />
        </div>
      </div>
      <div className="space-y-1">
        <p className="font-heading text-sm font-medium text-foreground">{title}</p>
        <p className="mx-auto max-w-xs text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {actionLabel && (href || onAction) && (
        href ? (
          <Button size="sm" variant="secondary" render={<a href={href} />}>
            {actionLabel}
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={onAction}>
            {actionLabel}
          </Button>
        )
      )}
    </div>
  );
}