"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Coins,
  ExternalLink,
  Landmark,
  Loader2,
  ShieldCheck,
  TrendingUp,
  Unlock,
  Wallet,
  Vault,
} from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Icon } from "@/components/shared/icon";
import { TokenBadge } from "@/components/shared/token-badge";
import { AnimatedCounter } from "@/components/shared/motion";
import { PageHeader } from "@/components/shared/page-header";
import { useRewards, useWallet } from "@/lib/hooks";
import { isDemoMode } from "@/lib/services";
import { notify } from "@/lib/feedback";
import type { RewardItem, WalletProvider } from "@/lib/demo/types";

const WEB3_NOTICE =
  "Web3 claiming, staking, and wallet linking will be enabled after wallet verification and smart contract deployment.";

const PROVIDERS: { key: WalletProvider; icon: string }[] = [
  { key: "MetaMask", icon: "fox" },
  { key: "WalletConnect", icon: "link-2" },
  { key: "Coinbase Wallet", icon: "coins" },
];

const TYPE_STYLE: Partial<Record<RewardItem["type"], string>> = {
  "Verified Outcome": "border-success/25 bg-success/10 text-success",
  "Useful Fix": "border-primary/25 bg-primary/10 text-primary",
  Royalty: "border-violet-300/25 bg-violet-500/10 text-violet-300",
  "Reward Share": "border-success/25 bg-success/10 text-success",
  "Crowd Verification": "border-amber-300/25 bg-amber-400/10 text-amber-300",
  Staked: "border-amber-300/25 bg-amber-400/10 text-amber-300",
  Claimed: "border-cyan-300/25 bg-cyan-400/10 text-cyan-300",
  Earned: "border-primary/25 bg-primary/10 text-primary",
};

export function RewardsContent() {
  const {
    balance,
    claimable,
    lifetimeEarned,
    royalty,
    staked,
    history,
    transactions,
    breakdown,
    claim,
    confirmClaim,
    stake,
    unstake,
  } = useRewards();
  const { state: wallet, connect, disconnect } = useWallet();
  const [claiming, setClaiming] = React.useState(false);
  const [walletOpen, setWalletOpen] = React.useState(false);
  const [stakeOpen, setStakeOpen] = React.useState(false);
  const [stakeAmount, setStakeAmount] = React.useState(20);

  const walletDisconnected = wallet.status === "disconnected";

  const onClaim = () => {
    if (claimable <= 0) return;
    if (!isDemoMode) {
      notify.info("Claiming not available yet", WEB3_NOTICE);
      return;
    }
    setClaiming(true);
    window.setTimeout(() => {
      const res = claim();
      confirmClaim(res.txId);
      setClaiming(false);
      notify.success("Rewards claimed", `+${res.claimed.toLocaleString()} FIX moved to your balance.`);
    }, 1400);
  };

  const onConnect = async (provider: WalletProvider) => {
    setWalletOpen(false);
    if (!isDemoMode) {
      notify.error("Wallet connection not available", WEB3_NOTICE);
      return;
    }
    await connect(provider);
    notify.success("Wallet connected", `${provider} · ${wallet.shortAddress ?? "testnet"}`);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Web3 Economy"
        title="Rewards & Wallet"
        subtitle="FIX is your on-chain proof of helpfulness. Earn it, stake it, and claim it to your wallet."
        action={
          <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-card/60 px-3 py-2">
<span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-success" />
                </span>
                {isDemoMode ? "Demo · Testnet" : "Phase 5 · mainnet"}
              </span>
            <Separator orientation="vertical" className="h-4" />
            {wallet.shortAddress && wallet.status === "verified" ? (
              <>
                <Wallet className="size-3.5 text-success" />
                <span className="font-mono text-[11px] text-foreground">{wallet.shortAddress}</span>
              </>
            ) : (
              <button
                onClick={() => setWalletOpen(true)}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
              >
                <Wallet className="size-3.5" /> Connect wallet
              </button>
            )}
          </div>
        }
      />

      {/* Hero balance */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-linear-to-br from-violet-500/15 via-card/50 to-cyan-400/10 p-6 ring-1 ring-primary/10 sm:p-8">
        <div className="pointer-events-none absolute -left-24 -top-28 size-80 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-24 size-80 rounded-full bg-cyan-400/15 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Coins className="size-3.5 text-cyan-300" /> Available balance
            </p>
            <div className="mt-2 flex items-end gap-3">
              <p className="font-heading text-5xl font-bold tracking-tight text-foreground">
                <AnimatedCounter value={balance} />
              </p>
              <p className="pb-1.5 font-heading text-lg font-semibold text-cyan-300">FIX</p>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {isDemoMode ? (
                <>
                  ≈ ${(balance * 0.084).toLocaleString("en-US", { maximumFractionDigits: 2 })} · 1 FIX = $0.084
                  {walletDisconnected && " · connect a wallet to claim"}
                </>
              ) : (
                <>
                  FIX balance from verified outcomes ·{" "}
                  {walletDisconnected ? "web3 claiming arrives with wallet verification" : "wallet claim arrives with smart contracts"}
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Dialog open={walletOpen} onOpenChange={setWalletOpen}>
              {walletDisconnected ? (
                <DialogTrigger render={<Button size="lg">Connect wallet</Button>} />
              ) : (
                <Button size="lg" onClick={onClaim} disabled={claiming || claimable <= 0}>
                  {claiming ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Claiming…
                    </>
                  ) : (
                    <>
                      <Unlock className="size-4" /> Claim {claimable.toLocaleString()} FIX
                    </>
                  )}
                </Button>
              )}
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Connect a wallet</DialogTitle>
                  <DialogDescription>
                    {isDemoMode
                      ? "You only need a wallet to claim on-chain FIX, stake, or receive royalties. Demo connection is simulated."
                      : "Wallet verification and smart-contract claiming arrive in a later phase. Your verified rewards are tracked off-chain here until then."}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2 py-2">
                  {PROVIDERS.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => onConnect(p.key)}
                      className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5"
                    >
                      <span className="grid size-8 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                        <Icon name={p.icon} className="size-4" />
                      </span>
                      {p.key}
                      <ArrowUpRight className="ml-auto size-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
                <DialogFooter showCloseButton />
              </DialogContent>
            </Dialog>
            {!walletDisconnected && (
              <Button size="lg" variant="secondary" onClick={disconnect}>
                Disconnect
              </Button>
            )}
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-2 gap-3 border-t border-border/60 pt-5 sm:grid-cols-4">
          <BalancePill icon="trending-up" label="Lifetime earned" value={lifetimeEarned} tone="cyan" />
          <BalancePill icon="coins" label="Royalties" value={royalty} tone="violet" />
          <BalancePill icon="lock" label="Staked" value={staked} tone="amber" />
          <BalancePill icon="wallet" label="Claimable" value={claimable} tone="rose" />
        </div>
      </div>

      {claimable > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-cyan-400/25 bg-cyan-400/5 p-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
            <Landmark className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              {claimable.toLocaleString()} FIX unlocked & ready to claim
            </p>
            <p className="text-[11px] text-muted-foreground">Breakdown: {breakdown.map((b) => `${b.amount} ${b.label}`).join(" · ")}</p>
          </div>
          {walletDisconnected ? (
            <Button size="sm" onClick={() => setWalletOpen(true)}>
              Connect to claim <ArrowUpRight className="size-3.5" />
            </Button>
          ) : (
            <Button size="sm" onClick={onClaim} disabled={claiming}>
              {claiming ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
              {claiming ? "Claiming…" : `Claim ${claimable.toLocaleString()} FIX`}
            </Button>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Staking */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Verification staking</CardTitle>
                <CardDescription>Back the network, earn yield.</CardDescription>
              </div>
              <TokenBadge value={staked} className="text-amber-300" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-center">
                <p className="text-[11px] text-muted-foreground">APR</p>
                <p className="mt-1 font-heading text-xl font-semibold text-foreground">8.5%</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-center">
                <p className="text-[11px] text-muted-foreground">Yield / mo</p>
                <p className="mt-1 font-heading text-xl font-semibold text-success">
                  {(staked * 0.085 / 12).toFixed(1)}
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
              Your stake helps verify the ~90 new fixes submitted every day. Yield accrues every epoch (24h).
            </div>
            <div className="flex gap-2">
              {isDemoMode ? (
                <Dialog open={stakeOpen} onOpenChange={setStakeOpen}>
                  <DialogTrigger render={<Button size="sm" className="flex-1"><Landmark className="size-3.5" /> Stake</Button>} />
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Stake into confidence pool</DialogTitle>
                      <DialogDescription>
                        Stake FIX to signal confidence in the network and earn 8.5% APR. Demo values only.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-3 gap-2 py-2">
                      {[10, 20, 50].map((a) => (
                        <button
                          key={a}
                          onClick={() => setStakeAmount(a)}
                          className={cn(
                            "rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors",
                            stakeAmount === a
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border text-muted-foreground hover:border-primary/40"
                          )}
                        >
                          {a} FIX
                        </button>
                      ))}
                    </div>
                    <DialogFooter>
                      <DialogClose render={<Button variant="ghost">Cancel</Button>} />
                      <DialogClose
                        render={
                          <Button
                            onClick={() => {
                              stake(stakeAmount);
                              notify.success("Staked", `${stakeAmount} FIX added to the confidence pool.`);
                            }}
                          >
                            Confirm stake
                          </Button>
                        }
                      />
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              ) : (
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => notify.info("Staking not available yet", WEB3_NOTICE)}
                >
                  <Landmark className="size-3.5" /> Stake
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                className="flex-1"
                disabled={staked <= 0}
                onClick={() => {
                  if (!isDemoMode) {
                    notify.info("Staking not available yet", WEB3_NOTICE);
                    return;
                  }
                  unstake(10);
                }}
              >
                <Vault className="size-3.5" /> Unstake 10
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Transactions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent transactions</CardTitle>
                <CardDescription>{isDemoMode ? "On testnet — every move is public." : "Tracked off-chain until web3 claims arrive."}</CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px]">
                <ShieldCheck className="size-3 text-success" /> tx verified
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {transactions.slice(0, 6).map((tx) => (
              <div key={tx.id} className="group flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 p-3 transition-colors hover:border-primary/25">
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-lg border",
                    tx.kind === "credit"
                      ? "border-cyan-300/25 bg-cyan-400/10 text-cyan-300"
                      : "border-amber-300/25 bg-amber-400/10 text-amber-300"
                  )}
                >
                  {tx.kind === "credit" ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">{tx.label}</p>
                  <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="font-mono text-cyan-300/80">{tx.txHash}</span>
                    <ExternalLink className="size-3 opacity-60" />
                    <span className={tx.status === "pending" ? "text-warning" : ""}>
                      · {tx.date} · {tx.status}
                    </span>
                  </p>
                </div>
                <span className={cn("font-heading text-sm font-semibold", tx.kind === "credit" ? "text-cyan-300" : "text-amber-300")}>
                  {tx.kind === "credit" ? "+" : "−"}
                  {tx.amount.toLocaleString()} FIX
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Reward history */}
      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Reward history
        </p>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {history.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/60 p-3.5 ring-1 ring-foreground/5 transition-colors hover:border-primary/25"
            >
              <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg border", TYPE_STYLE[r.type] ?? "border-border bg-muted text-muted-foreground")}>
                <Icon
                  name={
                    r.type === "Staked" ? "lock" : r.type === "Claimed" ? "wallet" : r.type === "Royalty" ? "trending-up" : "coins"
                  }
                  className="size-4"
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">{r.title}</p>
                <p className="text-[10px] text-muted-foreground">{r.type} · {r.date}</p>
              </div>
              <div className="text-right">
                <p className={cn("font-heading text-sm font-semibold", r.type === "Staked" || r.type === "Claimed" ? "text-amber-300" : "text-cyan-300")}>
                  {r.type === "Staked" || r.type === "Claimed" ? "−" : "+"}
                  {r.amount.toLocaleString()} FIX
                </p>
                {r.status === "unlocked" && <p className="text-[10px] text-success">unlocked</p>}
                {r.status === "pending" && <p className="text-[10px] text-warning">pending</p>}
                {r.status === "completed" && <p className="text-[10px] text-muted-foreground">on-chain</p>}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/60 p-4">
        <SparkleIcon />
        <p className="text-xs text-muted-foreground">
          Earning since the {isDemoMode ? "testnet launch" : "verified-outcome launch"}:{" "}
          <span className="font-semibold text-foreground">{lifetimeEarned.toLocaleString()} FIX</span>
          {" · "}
          {isDemoMode ? (
            <>
              Your royalty stream accrued{" "}
              <TrendingUp className="mr-1 inline size-3 text-success" />
              <span className="font-semibold text-success">{royalty.toLocaleString()} FIX</span> from reused fixes alone.
            </>
          ) : (
            <>Royalties are accrued from reused, verified fixes.</>
          )}
        </p>
      </div>
    </div>
  );
}

function SparkleIcon() {
  return <Icon name="sparkles" className="size-5 shrink-0 text-primary" />;
}

function BalancePill({
  icon,
  label,
  value,
  tone,
}: {
  icon: string;
  label: string;
  value: number;
  tone: "cyan" | "violet" | "amber" | "rose";
}) {
  const tones = {
    cyan: "border-cyan-300/25 bg-cyan-400/10 text-cyan-300",
    violet: "border-violet-300/25 bg-violet-500/10 text-violet-300",
    amber: "border-amber-300/25 bg-amber-400/10 text-amber-300",
    rose: "border-rose-300/25 bg-rose-400/10 text-rose-300",
  };
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-background/40 p-3">
      <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg border", tones[tone])}>
        <Icon name={icon} className="size-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="truncate font-heading text-sm font-semibold text-foreground">
          {value.toLocaleString()} <span className="text-[9px] font-medium text-muted-foreground">FIX</span>
        </p>
      </div>
    </div>
  );
}