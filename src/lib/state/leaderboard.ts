import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LeaderboardEntry } from "@/lib/demo/types";
import { leaderboard as seed } from "@/lib/demo/leaderboard";
import { PERSIST_KEYS, jsonStorage } from "@/lib/state/storage";

interface LeaderboardState {
  entries: LeaderboardEntry[];
  bumpUser: (delta: { reputation: number; verified: number; fixEarned: number }) => void;
}

export const useLeaderboardStore = create<LeaderboardState>()(
  persist(
    (set, get) => ({
      entries: seed,

      bumpUser: (delta) => {
        const me = get().entries.find((e) => e.isYou);
        if (!me) return;
        set({
          entries: get().entries.map((e) =>
            e.isYou
              ? {
                  ...e,
                  reputation: e.reputation + delta.reputation,
                  verified: e.verified + delta.verified,
                  fixEarned: e.fixEarned + delta.fixEarned,
                  impact:
                    delta.verified > 0
                      ? `${(delta.verified * 3).toLocaleString()} cases helped this week`
                      : e.impact,
                  movement: Math.min(e.movement + 1, 3),
                }
              : e
          ),
        });
      },
    }),
    {
      name: PERSIST_KEYS.leaderboard,
      storage: jsonStorage(),
    }
  )
);