import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DemoUser } from "@/lib/demo/types";
import { DEMO_CREDENTIALS, DEMO_MODE, DEMO_USER } from "@/lib/demo/users";
import { PERSIST_KEYS, jsonStorage, uid } from "@/lib/state/storage";

interface NewAccount {
  name: string;
  email: string;
  username: string;
  password: string;
}

interface AuthState {
  user: DemoUser | null;
  loginAt: number | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signup: (account: NewAccount) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  patchUser: (patch: Partial<DemoUser>) => void;
}

function buildNewUser(account: NewAccount): DemoUser {
  const handle = account.username.toLowerCase().replace(/^@/, "").replace(/\s+/g, "");
  return {
    id: `user-${handle || uid("u")}`,
    name: account.name.trim() || "New Contributor",
    username: handle || "newbie",
    handle: `@${handle || "newbie"}`,
    email: account.email.trim().toLowerCase(),
    password: account.password,
    role: "Contributor",
    level: "Solver",
    bio: "New to FixMind — diagnosing problems and verifying outcomes.",
    location: "—",
    memberSince: "Sep 2026",
    expertise: [],
    badges: ["Early Solver"],
    reputation: 0,
    reputationNext: 1000,
    verifiedOutcomes: 0,
    contributions: 0,
    successRate: 0,
    casesResolved: 0,
    streak: 0,
    rank: 0,
    avatarInitials: (account.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("") || "FN").toUpperCase(),
    isDemo: true,
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      loginAt: null,

      login: async (email, password) => {
        if (!DEMO_MODE) {
          return {
            ok: false,
            error: "Demo mode is disabled. Hook up a real AuthService before enabling sign-in.",
          };
        }
        const entered = `${email}`.trim().toLowerCase();
        if (entered === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
          set({ user: DEMO_USER, loginAt: Date.now() });
          return { ok: true };
        }
        return {
          ok: false,
          error: "Invalid email or password. Demo account: alex@fixmind.ai / demo1234",
        };
      },

      signup: async (account) => {
        if (!DEMO_MODE) {
          return {
            ok: false,
            error: "Demo mode is disabled. Hook up a real AuthService before enabling sign-up.",
          };
        }
        if (!account.name.trim() || !/^\S+@\S+\.\S+$/.test(account.email)) {
          return { ok: false, error: "Enter a valid name and email address." };
        }
        if (account.password.length < 8) {
          return { ok: false, error: "Password must be at least 8 characters." };
        }
        const user = buildNewUser(account);
        set({ user, loginAt: Date.now() });
        return { ok: true };
      },

      logout: () => set({ user: null, loginAt: null }),

      patchUser: (patch) =>
        set((s) => ({ user: s.user ? { ...s.user, ...patch } : null })),
    }),
    {
      name: PERSIST_KEYS.auth,
      storage: jsonStorage(),
      partialize: (s) => ({ user: s.user, loginAt: s.loginAt }),
    }
  )
);

export function useAuthUser() {
  return useAuthStore((s) => s.user);
}

export function useIsAuthenticated() {
  return useAuthStore((s) => s.user !== null);
}