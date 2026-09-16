import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RewardItem, RewardSnapshot, Transaction } from "@/lib/demo/types";
import { rewardHistory as seedHistory, rewardSnapshot as seed, transactions as seedTxs } from "@/lib/demo/rewards";
import { PERSIST_KEYS, jsonStorage, uid } from "@/lib/state/storage";

interface RewardState extends RewardSnapshot {
  history: RewardItem[];
  transactions: Transaction[];
  addEarned: (item: { type: "Verified Outcome" | "Useful Fix" | "Crowd Verification" | "Reward Share"; title: string; amount: number }) => void;
  addRoyalty: (title: string, amount: number) => void;
  claim: () => { claimed: number; balanceAfter: number };
  confirmClaim: (txId: string) => void;
  stake: (amount: number) => void;
  unstake: (amount: number) => void;
}

function timeLabel() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export const useRewardStore = create<RewardState>()(
  persist(
    (set, get) => ({
      balance: seed.balance,
      claimable: seed.claimable,
      lifetimeEarned: seed.lifetimeEarned,
      royalty: seed.royalty,
      staked: seed.staked,
      stakingApr: seed.stakingApr,
      claimableDetails: seed.claimableDetails,
      priceUsd: seed.priceUsd,
      network: seed.network,
      breakdown: seed.breakdown,
      history: seedHistory,
      transactions: seedTxs,

      addEarned: ({ type, title, amount }) => {
        const s = get();
        set({
          claimable: s.claimable + amount,
          lifetimeEarned: s.lifetimeEarned + amount,
          breakdown: [...s.breakdown, { label: type, amount }],
          history: [
            { id: uid("rw"), type, title, amount, date: `Now · ${timeLabel()}`, status: "unlocked" },
            ...s.history,
          ],
        });
      },

      addRoyalty: (title, amount) => {
        const s = get();
        set({
          claimable: s.claimable + amount,
          royalty: s.royalty + amount,
          lifetimeEarned: s.lifetimeEarned + amount,
          breakdown: [...s.breakdown, { label: "Royalty", amount }],
          history: [
            { id: uid("rw"), type: "Royalty", title, amount, date: `Now · ${timeLabel()}`, status: "unlocked" },
            ...s.history,
          ],
        });
      },

      claim: () => {
        const s = get();
        const claimed = s.claimable > 0 ? s.claimable : 0;
        if (claimed === 0) return { claimed: 0, balanceAfter: s.balance };
        const txId = uid("tx");
        set({
          balance: s.balance + claimed,
          claimable: 0,
          breakdown: [],
          history: [
            { id: uid("rw"), type: "Claimed", title: "Claimed to wallet", amount: -claimed, date: `Now · ${timeLabel()}`, status: "completed" },
            ...s.history.map((h) => (h.status === "unlocked" ? { ...h, status: "completed" as const } : h)),
          ],
          transactions: [
            { id: txId, label: `Claim — ${claimed} FIX rewards`, amount: claimed, kind: "credit", date: "Pending · demo", txHash: "0x" + Math.random().toString(16).slice(2, 10) + "…", status: "pending" },
            ...s.transactions,
          ],
        });
        return { claimed, balanceAfter: s.balance + claimed };
      },

      confirmClaim: (txId) => {
        set({
          transactions: get().transactions.map((t) =>
            t.id === txId ? { ...t, status: "confirmed" as const, date: "Just now" } : t
          ),
        });
      },

      stake: (amount) => {
        const s = get();
        if (amount <= 0 || amount > s.balance) return;
        set({
          balance: s.balance - amount,
          staked: s.staked + amount,
          history: [
            { id: uid("rw"), type: "Staked", title: `Staked ${amount} FIX into confidence pool`, amount: -amount, date: `Now · ${timeLabel()}`, status: "completed" },
            ...s.history,
          ],
          transactions: [
            { id: uid("tx"), label: `Staked to confidence pool`, amount, kind: "debit", date: "Just now", txHash: "0x" + Math.random().toString(16).slice(2, 10) + "…", status: "confirmed" },
            ...s.transactions,
          ],
        });
      },

      unstake: (amount) => {
        const s = get();
        const a = Math.min(amount, s.staked);
        if (a <= 0) return;
        set({
          balance: s.balance + a,
          staked: s.staked - a,
          transactions: [
            { id: uid("tx"), label: `Unstaked from confidence pool`, amount: a, kind: "credit", date: "Just now", txHash: "0x" + Math.random().toString(16).slice(2, 10) + "…", status: "confirmed" },
            ...s.transactions,
          ],
        });
      },
    }),
    {
      name: PERSIST_KEYS.rewards,
      storage: jsonStorage(),
    }
  )
);

export function rewardSnapshot(): RewardSnapshot {
  const s = useRewardStore.getState();
  return {
    balance: s.balance,
    claimable: s.claimable,
    lifetimeEarned: s.lifetimeEarned,
    royalty: s.royalty,
    staked: s.staked,
    stakingApr: s.stakingApr,
    claimableDetails: s.claimableDetails,
    priceUsd: s.priceUsd,
    network: s.network,
    breakdown: s.breakdown,
  };
}