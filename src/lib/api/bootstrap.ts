import { getAccessToken, getSessionUser, getSupabaseClient } from "@/lib/api/supabase";
import { hydrateWorkspace } from "@/lib/api/services";
import { useAuthStore } from "@/lib/state/auth";
import { useCaseStore } from "@/lib/state/cases";
import { useNotificationStore } from "@/lib/state/notifications";
import { useLeaderboardStore } from "@/lib/state/leaderboard";
import { useRewardStore } from "@/lib/state/rewards";
import { useWalletStore } from "@/lib/state/wallet";

let restoring: Promise<"restored" | "signed-out"> | null = null;

/**
 * Restores a persisted Supabase session during production boot.
 *
 * - If Supabase has a live session, refreshes the auth profile and hydrates
 *   cases, rewards, notifications, leaderboard and contributions.
 * - If there is no session, clears any stale locally-persisted user state so
 *   the auth gate routes the visitor to /login.
 */
export function restoreSession(): Promise<"restored" | "signed-out"> {
  if (restoring) return restoring;
  restoring = (async () => {
    const token = await getAccessToken();
    if (!token) {
      clearWorkspace();
      return "signed-out" as const;
    }
    try {
      await hydrateWorkspace(token);
      return "restored" as const;
    } catch {
      // Session expired or the API is unreachable — fall back to signed-out.
      clearWorkspace();
      return "signed-out" as const;
    }
  })();
  return restoring;
}

/**
 * Subscribes to Supabase auth changes so production stays in sync when the
 * session expires or refreshes elsewhere. Returns an unsubscribe function.
 */
export function watchAuthState(onChanged?: () => void): (() => void) {
  const supabase = getSupabaseClient();
  if (!supabase) return () => {};
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN") {
      void restoreSession().then(() => onChanged?.());
    } else if (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
      if (event === "SIGNED_OUT") {
        clearWorkspace();
        onChanged?.();
      }
    }
  });
  return () => subscription.unsubscribe();
}

export function clearWorkspace(): void {
  useAuthStore.getState().logout();
  useCaseStore.setState({ cases: [] });
  useNotificationStore.setState({ items: [] });
  useLeaderboardStore.setState({ entries: [] });
  useRewardStore.setState({
    balance: 0,
    claimable: 0,
    lifetimeEarned: 0,
    royalty: 0,
    staked: 0,
    stakingApr: 0,
    claimableDetails: "",
    priceUsd: 0,
    network: "FIX",
    breakdown: [],
    history: [],
    transactions: [],
  });
  useWalletStore.getState().disconnect();
}

/** True when a session is available right now (used by the auth gate). */
export async function hasActiveSession(): Promise<boolean> {
  const user = await getSessionUser();
  return user !== null && (await getAccessToken()) !== null;
}