"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft } from "lucide-react";
import { cn } from "cn";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { searchDemo } from "@/lib/demo/search";
import { useCases } from "@/lib/hooks";
import { Icon } from "@/components/shared/icon";

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const myCases = useCases();
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const results = q ? searchDemo(query) : [];

  const quickActions = [
    { label: "New Diagnosis", icon: "stethoscope", href: "/diagnose" },
    { label: "Claim Rewards", icon: "coins", href: "/rewards" },
    { label: "Contribute a Fix", icon: "sparkles", href: "/contribute" },
  ];

  const go = (href: string) => {
    onClose();
    setQuery("");
    router.push(href);
  };

  const hasResults = results.length > 0;

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
    if (e.key === "Enter" && !q) go("/diagnose");
  }

  React.useEffect(() => {
    if (open) {
      queueMicrotask(() => setQuery(""));
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="top-[18%] max-w-xl gap-0 p-0 overflow-hidden sm:max-w-xl"
        showCloseButton={false}
      >
        <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search cases, fixes, contributors…"
            className="h-14 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden shrink-0 items-center gap-0.5 rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:flex">
            esc
          </kbd>
        </div>

        <div className="max-h-[340px] overflow-y-auto p-2 scrollbar-thin">
          {q && (
            <CommandGroup label={`Results for “${query}”`}>
              {results.map((r) => (
                <CommandRow
                  key={r.id}
                  onClick={() => go(r.href)}
                  icon={r.kind === "Case" ? "files" : r.kind === "Fix" ? "wrench" : "user"}
                  left={r.title}
                  subtitle={r.subtitle}
                  right={
                    <span className="shrink-0 rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {r.kind}
                    </span>
                  }
                />
              ))}
            </CommandGroup>
          )}

          {!q && (
            <>
              <CommandGroup label="Quick actions">
                {quickActions.map((a) => (
                  <CommandRow key={a.href} onClick={() => go(a.href)} icon={a.icon} left={a.label} />
                ))}
                <CommandRow
                  onClick={() => go("/leaderboard")}
                  icon="trophy"
                  left="View Leaderboard"
                />
              </CommandGroup>

              <CommandGroup label="Your recent cases">
                {myCases.slice(0, 4).map((c) => (
                  <CommandRow
                    key={c.id}
                    onClick={() => go(`/cases/${c.id}`)}
                    icon="files"
                    left={c.title}
                    subtitle={c.category}
                  />
                ))}
              </CommandGroup>
            </>
          )}

          {q && !hasResults && (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">
              No results for “{query}”. Try “hydrat”, “Wi-Fi” or “Maya”.
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CornerDownLeft className="size-3" /> to open
          </span>
          <span>{hasResults ? `${results.length} results` : "FixMind AI · demo mode"}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CommandGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1.5">
      <p className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function CommandRow({
  onClick,
  icon,
  left,
  subtitle,
  right,
}: {
  onClick: () => void;
  icon: string;
  left: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent"
      )}
    >
      <span className="grid size-7 shrink-0 place-items-center rounded-md border border-border bg-card text-muted-foreground">
        <Icon name={icon} className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{left}</span>
        {subtitle && <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>}
      </span>
      {right}
    </button>
  );
}

export function CommandTriggerButton() {
  return (
    <Button variant="outline" className="w-full justify-start gap-2 text-muted-foreground sm:w-64">
      <Search className="size-3.5" />
      <span className="flex-1 text-left text-xs">Search fixes, cases…</span>
      <kbd className="hidden items-center gap-0.5 rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] sm:flex">
        ⌘K
      </kbd>
    </Button>
  );
}