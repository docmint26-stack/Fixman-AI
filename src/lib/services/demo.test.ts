import { beforeEach, describe, expect, it } from "vitest";

import {
  authService,
  diagnosisService,
  caseService,
  rewardService,
  walletService,
  contributionService,
} from "@/lib/services";
import { DEMO_CREDENTIALS } from "@/lib/demo/users";
import {
  rewardHistory as seedHistory,
  rewardSnapshot as seedSnapshot,
  transactions as seedTxs,
} from "@/lib/demo/rewards";
import { useAuthStore } from "@/lib/state/auth";
import { useCaseStore } from "@/lib/state/cases";
import { useRewardStore } from "@/lib/state/rewards";
import { useWalletStore } from "@/lib/state/wallet";
import { useNotificationStore } from "@/lib/state/notifications";
import type { DiagnosisInput } from "@/lib/demo/types";

const baseInput: DiagnosisInput = {
  title: "React hydration mismatch with timestamps",
  description: "The app throws a hydration error because a timestamp renders on the server.",
  category: "Coding Error",
  os: "macOS",
  device: "MacBook Pro",
  version: "Next.js 15",
  recentChange: "Upgraded React",
  evidence: ["text", "log"],
};

beforeEach(() => {
  useAuthStore.setState({ user: null, loginAt: null });
  useCaseStore.setState({ cases: [] });
  useRewardStore.setState({ ...seedSnapshot, history: seedHistory, transactions: seedTxs });
  useWalletStore.getState().disconnect();
  useNotificationStore.setState({ items: [] });
});

describe("auth service", () => {
  it("rejects invalid credentials", async () => {
    const res = await authService.login("nobody@fixmind.ai", "wrong");
    expect(res.ok).toBe(false);
    expect(authService.getUser()).toBeNull();
  });

  it("signs in with the demo account and can log out", async () => {
    const res = await authService.login(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password);
    expect(res.ok).toBe(true);
    expect(authService.getUser()?.email).toBe(DEMO_CREDENTIALS.email);
    authService.logout();
    expect(authService.getUser()).toBeNull();
  });

  it("creates and signs in a new account", async () => {
    const res = await authService.signup({
      name: "Test User",
      email: "test@example.com",
      username: "tester",
      password: "supersecret",
    });
    expect(res.ok).toBe(true);
    expect(authService.getUser()?.handle).toBe("@tester");
  });

  it("enforces signup validation", async () => {
    const res = await authService.signup({ name: "X", email: "bad", username: "x", password: "123" });
    expect(res.ok).toBe(false);
    expect(authService.getUser()).toBeNull();
  });
});

describe("diagnosis service", () => {
  it("maps Wi-Fi problems to the Wi-Fi analysis", () => {
    const result = diagnosisService.analyze({
      ...baseInput,
      title: "Wi-Fi keeps dropping",
      description: "My network adapter resets every 10 minutes after the update.",
    });
    expect(result.likelyCause.toLowerCase()).toContain("wi-fi");
    expect(result.matchedCases).toBeGreaterThan(100);
    expect(result.fixes.length).toBeGreaterThan(0);
  });

  it("falls back to the hydration analysis for unknown problems", () => {
    const result = diagnosisService.analyze(baseInput);
    expect(result.likelyCause.toLowerCase()).toContain("hydration");
  });

  it("creates a suggested case and a notification", () => {
    const c = diagnosisService.startDiagnosis(baseInput);
    expect(c.status).toBe("Suggested");
    expect(c.createdByMe).toBe(true);
    expect(caseService.get(c.id)).toBeDefined();
    expect(useNotificationStore.getState().items.length).toBeGreaterThan(0);
  });
});

describe("case progression + rewards", () => {
  it("moves a case from suggested to verified and unlocks the reward", () => {
    const c = diagnosisService.startDiagnosis(baseInput);
    const fix = c.fixes[0];
    caseService.applyFix(c.id, fix.id);
    expect(caseService.get(c.id)?.status).toBe("Applied");

    caseService.submitOutcome(c.id, "resolved");
    const monitoring = caseService.get(c.id);
    expect(monitoring?.status).toBe("Monitoring");
    expect(monitoring?.rewardStatus).toBe("none");

    const claimableBefore = useRewardStore.getState().claimable;
    const verified = caseService.finalizeVerification(c.id);
    expect(verified?.status).toBe("Verified");
    expect(caseService.get(c.id)?.rewardStatus).toBe("claimable");
    expect(useRewardStore.getState().claimable).toBeGreaterThan(claimableBefore);
  });
});

describe("rewards service", () => {
  it("claims claimable rewards into the balance", () => {
    const { claimable, balance } = rewardService.snapshot();
    expect(claimable).toBeGreaterThan(0);

    const res = rewardService.claim();
    expect(res.claimed).toBe(claimable);

    const after = rewardService.snapshot();
    expect(after.balance).toBe(balance + claimable);
    expect(after.claimable).toBe(0);

    const tx = rewardService.transactions()[0];
    expect(tx.status).toBe("pending");
    rewardService.confirmClaim(tx.id);
    expect(rewardService.transactions()[0].status).toBe("confirmed");
  });

  it("stakes FIX out of the balance and unstakes back", () => {
    const before = rewardService.snapshot();
    rewardService.stake(10);
    const staked = rewardService.snapshot();
    expect(staked.balance).toBe(before.balance - 10);
    expect(staked.staked).toBe(before.staked + 10);

    rewardService.unstake(10);
    expect(rewardService.snapshot().balance).toBe(before.balance);
  });
});

describe("wallet service", () => {
  it("connects, verifies and disconnects", async () => {
    const status = await walletService.connect("MetaMask");
    expect(status).toBe("verified");
    expect(walletService.state().shortAddress).toBeTruthy();
    expect(walletService.state().status).toBe("verified");

    walletService.disconnect();
    expect(walletService.state().status).toBe("disconnected");
  });
});

describe("contribution service", () => {
  it("submits a contribution and updates the contributor", async () => {
    await authService.login(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password);
    const before = authService.getUser()?.contributions ?? 0;

    const res = await contributionService.submit({
      type: "fix",
      title: "Test fix",
      description: "A verified test contribution.",
      steps: [],
      environment: "test",
      stake: 0,
    });

    expect(res.id).toBeTruthy();
    expect(authService.getUser()?.contributions).toBe(before + 1);
  });
});
