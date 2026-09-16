"use client";

import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/shared/icon";
import { cn } from "cn";
import { useNotifications } from "@/lib/hooks";

export function NotificationsContent() {
  const { items, markRead, markAllRead } = useNotifications();
  const router = useRouter();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Activity"
        title="Notifications"
        subtitle="Rewards, case updates, and system messages from the demo network."
        action={
          <Button size="sm" variant="secondary" className="gap-1.5" onClick={markAllRead} disabled={items.every((n) => !n.unread)}>
            <CheckCheck className="size-4" /> Mark all read
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState icon="bell-off" title="You're all caught up" description="New rewards and case updates will show up here." />
      ) : (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card/60">
          {items.map((n) => (
            <li key={n.id} className={cn("relative", n.unread && "bg-primary/[0.03]")}>
              <button
                onClick={() => {
                  markRead(n.id);
                  if (n.actionHref) router.push(n.actionHref);
                }}
                className="flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-accent/40"
              >
                <span
                  className={cn(
                    "mt-0.5 grid size-9 shrink-0 place-items-center rounded-full border",
                    n.kind === "reward" && "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
                    n.kind === "case" && "border-violet-400/30 bg-violet-500/10 text-violet-300",
                    n.kind === "system" && "border-border bg-muted text-muted-foreground"
                  )}
                >
                  <Icon name={n.kind === "reward" ? "coins" : n.kind === "case" ? "files" : "sparkles"} className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm", n.unread ? "font-semibold text-foreground" : "font-medium text-foreground/85")}>
                    {n.title}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{n.body}</span>
                  <span className="mt-1 block text-[11px] text-muted-foreground/70">{n.time}</span>
                </span>
                {n.unread && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}