import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PERSIST_KEYS, jsonStorage } from "@/lib/state/storage";

interface TourState {
  seen: boolean;
  active: boolean;
  start: () => void;
  complete: () => void;
  end: () => void;
}

export const useTourStore = create<TourState>()(
  persist(
    (set) => ({
      seen: false,
      active: false,
      start: () => set({ seen: true, active: true }),
      complete: () => set({ active: false, seen: true }),
      end: () => set({ active: false, seen: true }),
    }),
    {
      name: PERSIST_KEYS.tour,
      storage: jsonStorage(),
    }
  )
);