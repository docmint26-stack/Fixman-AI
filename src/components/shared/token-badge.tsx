import { Coins } from "lucide-react";
import { cn } from "cn";

export function TokenBadge({
  value,
  signed = false,
  label,
  className,
}: {
  value: number;
  signed?: boolean;
  label?: string;
  className?: string;
}) {
  const text = signed
    ? `${value > 0 ? "+" : ""}${value.toLocaleString("en-US")}`
    : value.toLocaleString("en-US");
  return (
    <span
      className={cn(
        "inline-flex h-6 w-fit items-center gap-1 rounded-full border border-cyan-300/25 bg-cyan-400/10 px-2 text-xs font-medium text-cyan-300 dark:bg-cyan-400/[0.07]",
        className
      )}
    >
      <Coins className="size-3.5" />
      {label && <span className="text-muted-foreground">{label}</span>}
      <span className={cn("font-semibold", value > 0 && signed && "text-success")}>
        {text}
      </span>
      {!signed && <span className="text-[10px] text-cyan-300/70">FIX</span>}
    </span>
  );
}