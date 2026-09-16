import type { RewardItem, RewardSnapshot, Transaction } from "./types";

export const rewardSnapshot: RewardSnapshot = {
  balance: 125,
  claimable: 24,
  lifetimeEarned: 284,
  royalty: 36,
  staked: 20,
  stakingApr: 8.5,
  claimableDetails: "1 verified outcome + 1 useful fix + accrued royalties",
  priceUsd: 0.42,
  network: "FIX Demo · Testnet",
  breakdown: [
    { label: "Verified Outcome", amount: 8 },
    { label: "Useful Fix", amount: 10 },
    { label: "Royalty", amount: 6 },
  ],
};

export const rewardHistory: RewardItem[] = [
  { id: "rw-claimable-3", type: "Royalty", title: "Reused fix royalties — hydration timestamp fix", amount: 6, date: "Now", status: "unlocked" },
  { id: "rw-claimable-2", type: "Useful Fix", title: "Crowd-verified workaround — Excel XLOOKUP issue", amount: 10, date: "Ready", status: "unlocked" },
  { id: "rw-claimable-1", type: "Verified Outcome", title: "Verified outcome — React hydration fix", amount: 8, date: "Ready", status: "unlocked" },
  { id: "rw-1", type: "Verified Outcome", title: "Verified fix — Wi-Fi driver rollback (Windows 11)", amount: 120, date: "2w ago", status: "completed" },
  { id: "rw-2", type: "Royalty", title: "Reused X23 — Wi-Fi driver rollback fix", amount: 90, date: "1w ago", status: "completed" },
  { id: "rw-3", type: "Verified Outcome", title: "Verified fix — Python venv interpreter mismatch", amount: 14, date: "1w ago", status: "completed" },
  { id: "rw-4", type: "Royalty", title: "Reused X11 — Python interpreter fix", amount: 11, date: "3w ago", status: "completed" },
  { id: "rw-5", type: "Verified Outcome", title: "Verified fix — Git merge conflict runbook", amount: 9, date: "2w ago", status: "completed" },
  { id: "rw-6", type: "Crowd Verification", title: "Audited 3 Bluetooth interference cases", amount: 6, date: "1mo ago", status: "completed" },
  { id: "rw-7", type: "Reward Share", title: "Referral share — 3 new diagnoses", amount: 10, date: "5w ago", status: "completed" },
  { id: "rw-8", type: "Claimed", title: "Claimed to wallet", amount: -120, date: "2w ago", status: "completed" },
];

export const transactions: Transaction[] = [
  { id: "tx-1", label: "Royalty — reused Wi-Fi driver rollback fix", amount: 90, kind: "credit", date: "1w ago", txHash: "0x8c71…2d3f", status: "confirmed" },
  { id: "tx-2", label: "Reward — Python venv interpreter fix", amount: 14, kind: "credit", date: "1w ago", txHash: "0x4f2a…91bc", status: "confirmed" },
  { id: "tx-3", label: "Claim to wallet — verified fix rewards", amount: 120, kind: "credit", date: "2w ago", txHash: "0xe302…a71f", status: "confirmed" },
  { id: "tx-4", label: "Reward — Git merge conflict runbook", amount: 9, kind: "credit", date: "2w ago", txHash: "0xd91b…c04e", status: "confirmed" },
  { id: "tx-5", label: "Crowd verification batch — 3 cases", amount: 6, kind: "credit", date: "1mo ago", txHash: "0x9d54…e02c", status: "confirmed" },
  { id: "tx-6", label: "Staked to confidence pool", amount: 20, kind: "debit", date: "1mo ago", txHash: "0x1a9e…44bd", status: "confirmed" },
  { id: "tx-7", label: "Withdrawal to external wallet", amount: 800, kind: "debit", date: "2mo ago", txHash: "0x5c20…77aa", status: "confirmed" },
];