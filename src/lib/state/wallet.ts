import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WalletProvider, WalletState } from "@/lib/demo/types";
import { PERSIST_KEYS, jsonStorage } from "@/lib/state/storage";

const DEMO_ADDRESS = "0x72A391fD0d3c8b45E7F90a2B4cC1e89d6A5041F".toLowerCase();
const DEMO_SHORT = "0x72A...91F";

type Status = WalletState["status"];

interface WalletStore extends WalletState {
  connect: (provider: WalletProvider) => Promise<Status>;
  disconnect: () => void;
  simulateNetworkMismatch: () => void;
  markVerified: () => void;
  fail: (message: string) => void;
}

export const useWalletStore = create<WalletStore>()(
  persist(
    (set) => ({
      status: "disconnected",
      provider: null,
      address: null,
      shortAddress: null,
      network: "FIX Demo · Testnet",
      lastError: undefined,

      connect: async (provider) => {
        set({ status: "connecting", provider, lastError: undefined });
        await delay(700);
        set({ status: "connected", address: DEMO_ADDRESS, shortAddress: DEMO_SHORT, network: "FIX Demo · Testnet" });
        await delay(500);
        set({ status: "verifying" });
        await delay(500);
        set({ status: "verified" });
        return "verified" as Status;
      },

      disconnect: () =>
        set({
          status: "disconnected",
          provider: null,
          address: null,
          shortAddress: null,
          network: "FIX Demo · Testnet",
          lastError: undefined,
        }),

      simulateNetworkMismatch: () => set({ status: "wrong-network" }),

      markVerified: () => set({ status: "verified" }),

      fail: (message) => set({ status: "error", lastError: message }),
    }),
    {
      name: PERSIST_KEYS.wallet,
      storage: jsonStorage(),
      partialize: (s) => ({
        status: s.status,
        provider: s.provider,
        address: s.address,
        shortAddress: s.shortAddress,
        network: s.network,
        lastError: s.lastError,
      }),
    }
  )
);

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}