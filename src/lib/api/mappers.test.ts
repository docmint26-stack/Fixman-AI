import { describe, expect, it } from "vitest";

import {
  formatRelativeTime,
  mapCase,
  mapRecommendation,
  mapCaseStatus,
  mapContribution,
  mapLeaderboardEntry,
  mapNotification,
  mapProfile,
  mapRewardItem,
  mapRewardSummary,
  type ApiCaseDetail,
  type ApiContribution,
  type ApiFix,
  type ApiLeaderboardRow,
  type ApiNotification,
  type ApiProfile,
  type ApiProfileStats,
  type ApiRecommendation,
  type ApiRewardLedger,
  type ApiRewardSummary,
} from "@/lib/api/mappers";

const apiFix: ApiFix = {
  id: "fix-1",
  title: "Reinstall the adapter driver",
  summary: "Reinstall the network adapter driver and reboot.",
  instructions: ["Uninstall the driver", "Restart the device"],
  category: "Hardware & Devices",
  risk_level: "medium",
  effort_level: "low",
  source_type: "curated",
  verification_status: "verified",
  success_count: 40,
  failure_count: 5,
  partial_count: 3,
  verified_success_rate: 0.88,
  reuse_count: 12,
  created_at: "2026-01-01T00:00:00Z",
};

const recommendation: ApiRecommendation = {
  id: "rec-1",
  case_id: "case-1",
  diagnosis_run_id: "dx-1",
  fix_id: "fix-1",
  rank: 1,
  ai_confidence: 0.9,
  context_match_score: 0.85,
  explanation: "Matches the reported adapter model.",
  estimated_success_rate: 0.88,
  created_at: "2026-01-01T00:00:00Z",
  fix: apiFix,
  sample_size: 45,
};

const baseCase: ApiCaseDetail = {
  id: "case-1",
  user_id: "user-1",
  title: "Wi-Fi drops every 10 minutes",
  description: "The network adapter resets and the connection drops repeatedly.",
  category: "Network & Wi-Fi",
  severity: "medium",
  status: "needs_review",
  environment: { os: "Windows 11" },
  software_name: "Driver",
  operating_system: "Windows 11",
  device_name: "Dell XPS 15",
  recent_changes: "Updated driver via Windows Update",
  current_diagnosis_id: "dx-1",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:05Z",
  evidence: [{ id: "ev-1", case_id: "case-1", evidence_type: "log", created_at: "2026-01-01T00:00:00Z" }],
  diagnoses: [
    {
      id: "dx-1",
      status: "completed",
      problem_summary: "Driver resets the adapter",
      probable_cause: "Outdated adapter driver",
      confidence: 0.75,
      similar_case_count: 128,
      model_provider: "development_deterministic",
      model_name: "deterministic",
      created_at: "2026-01-01T00:00:02Z",
    },
  ],
  recommendations: [recommendation],
};

const baseProfile: ApiProfile = {
  id: "p-1",
  auth_user_id: "auth-1",
  display_name: "Alex Fine",
  username: null,
  bio: "Solver",
  role: "user",
  reputation_level: "High",
  reputation_score: 420,
  timezone: "UTC",
  created_at: "2026-01-15T00:00:00Z",
  updated_at: "2026-01-15T00:00:00Z",
};

const baseStats: ApiProfileStats = {
  total_cases: 4,
  resolved_count: 3,
  active_cases: 1,
  verified_contributions: 1,
  reputation: 420,
};

describe("Phase 4 honest diagnosis mapping", () => {
  it("never derives a rate from raw counts or a tiny sample", () => {
    expect(mapRecommendation({ ...recommendation, sample_size: 2 }).verifiedSuccessRate).toBeNull();
    expect(mapRecommendation({ ...recommendation, fix: { ...apiFix, verified_success_rate: null } }).verifiedSuccessRate).toBeNull();
    expect(mapRecommendation({ ...recommendation, min_success_rate_sample: 50 }).verifiedSuccessRate).toBeNull();
  });
  it("maps valid rates and trust labels independently of confidence", () => {
    const fix = mapRecommendation({ ...recommendation, trust_label: "AI Suggestion", statistical_status: "Sufficient" });
    expect(fix.verifiedSuccessRate).toBe(88);
    expect(fix.confidence).toBe("High");
    expect(fix.trustLabel).toBe("AI Suggested");
  });
  it("maps summary, confidence breakdown and safe sources", () => {
    const sources = [{ id: "s", source_type: "knowledge_chunk", title: "Official Documentation" }];
    const result = mapCase({ ...baseCase, sources, diagnoses: [{ ...baseCase.diagnoses![0], analysis_metadata: { confidence_breakdown: { overall: 0.75 } } }] });
    expect(result.confidence).toBe(75);
    expect(result.problemSummary).toBe("Driver resets the adapter");
    expect(result.confidenceBreakdown?.overall).toBe(0.75);
    expect(result.sources).toEqual(sources);
  });
  it("does not multiply an already-percent match score into confidence", () => {
    expect(mapCase({ ...baseCase, diagnoses: [] }).confidence).toBe(0);
  });
});

describe("mapCaseStatus", () => {
  it("maps every backend status to a UI status", () => {
    expect(mapCaseStatus("submitted")).toBe("Needs Verification");
    expect(mapCaseStatus("analyzing")).toBe("Needs Verification");
    expect(mapCaseStatus("needs_review")).toBe("Needs Verification");
    expect(mapCaseStatus("suggested")).toBe("Suggested");
    expect(mapCaseStatus("applied")).toBe("Applied");
    expect(mapCaseStatus("monitoring")).toBe("Monitoring");
    expect(mapCaseStatus("verified")).toBe("Verified");
    expect(mapCaseStatus("partially_verified")).toBe("Partially Verified");
    expect(mapCaseStatus("failed")).toBe("Failed");
    expect(mapCaseStatus("unknown")).toBe("Needs Verification");
  });
});

describe("mapCase", () => {
  it("maps a case detail into an AppCase", () => {
    const c = mapCase(baseCase);
    expect(c.id).toBe("case-1");
    expect(c.status).toBe("Needs Verification");
    expect(c.category).toBe("Network & Wi-Fi");
    expect(c.environment.os).toBe("Windows 11");
    expect(c.matchedCases).toBe(128);
    expect(c.selectedFixId).toBeNull();
    expect(c.reasoning[0].cause).toBe("Outdated adapter driver");
    expect(c.reasoning[0].likelihood).toBe(75);
    expect(c.fixes[0].successRate).toBe(88);
    expect(c.fixes[0].matchScore).toBe(85);
    expect(c.fixes[0].confidence).toBe("High");
    expect(c.fixes[0].steps).toHaveLength(2);
  });

  it("builds a timeline from diagnosis and verify events", () => {
    const c = mapCase(baseCase);
    expect(c.timeline.map((t) => t.label)).toContain("Problem submitted");
    expect(c.timeline.map((t) => t.label)).toContain("Diagnosis recorded");
  });

  it("aggregates reward status and amount from the ledger", () => {
    const rewards: ApiRewardLedger[] = [
      { id: "rw-1", event_type: "verified_outcome", reason: "Verified outcome", amount: 12, status: "claimable", created_at: "2026-01-02T00:00:00Z" },
      { id: "rw-2", event_type: "verified_outcome", reason: "Pending reward", amount: 5, status: "pending", created_at: "2026-01-02T00:00:00Z" },
      { id: "rw-3", event_type: "royalty", reason: "Cancelled", amount: -3, status: "cancelled", created_at: "2026-01-02T00:00:00Z" },
    ];
    const c = mapCase({ ...baseCase, status: "verified", rewards });
    expect(c.rewardStatus).toBe("claimable");
    expect(c.reward).toBe(17);
  });
});

describe("mapProfile", () => {
  it("combines profile + stats into a DemoUser", () => {
    const p = mapProfile({ ...baseProfile, username: "alexfine" }, baseStats);
    expect(p.name).toBe("Alex Fine");
    expect(p.handle).toBe("@alexfine");
    expect(p.memberSince).toBe("Jan 2026");
    expect(p.verifiedOutcomes).toBe(3);
    expect(p.contributions).toBe(1);
    expect(p.successRate).toBe(75);
    expect(p.casesResolved).toBe(3);
    expect(p.reputation).toBe(420);
    expect(p.isDemo).toBe(false);
    expect(p.avatarInitials).toBe("AF");
  });
});

describe("mapRewardSummary + mapRewardItem", () => {
  it("maps the summary to a snapshot", () => {
    const summary: ApiRewardSummary = {
      balance: 100,
      pending: 5,
      claimable: 20,
      lifetime_earned: 125,
      royalty_earned: 8,
      staked_or_reserved: 10,
    };
    const s = mapRewardSummary(summary);
    expect(s.claimable).toBe(20);
    expect(s.staked).toBe(10);
    expect(s.lifetimeEarned).toBe(125);
    expect(s.royalty).toBe(8);
    expect(s.breakdown.map((b) => b.label)).toEqual(["Claimable", "Pending verification", "Reserved for web3"]);
  });

  it("maps a ledger row to a reward item", () => {
    const row: ApiRewardLedger = {
      id: "rw-1",
      event_type: "verified_outcome",
      reason: "Verified outcome",
      amount: 12.5,
      status: "claimable",
      created_at: "2026-01-02T00:00:00Z",
    };
    const item = mapRewardItem(row);
    expect(item.type).toBe("Verified Outcome");
    expect(item.status).toBe("unlocked");
    expect(item.amount).toBe(12.5);
  });
});

describe("mapLeaderboardEntry + mapNotification + mapContribution", () => {
  it("maps a leaderboard row", () => {
    const row: ApiLeaderboardRow = {
      id: "p-2",
      display_name: "Sam Rye",
      reputation_level: "High",
      reputation: 900,
      rank: 2,
      verified_fixes: 3,
      verified_outcomes: 8,
      success_rate: null,
      knowledge_impact: 1200,
      badge: "High",
      is_current_user: true,
    };
    const entry = mapLeaderboardEntry(row);
    expect(entry.rank).toBe(2);
    expect(entry.isYou).toBe(true);
    expect(entry.impact).toBe("1,200 cases helped");
  });

  it("marks a notification unread until read_at is set", () => {
    const unread: ApiNotification = {
      id: "n-1",
      type: "case_updated",
      title: "Diagnosis ready",
      message: "Ranked fixes are ready.",
      created_at: "2026-01-02T00:00:00Z",
    };
    expect(mapNotification(unread).unread).toBe(true);
    expect(mapNotification({ ...unread, read_at: "2026-01-02T01:00:00Z" }).unread).toBe(false);
  });

  it("maps an accepted contribution as verified", () => {
    const c: ApiContribution = {
      id: "con-1",
      contribution_type: "new_fix",
      title: "Fix for driver resets",
      description: "Reinstall and disable auto-update.",
      status: "accepted",
      reviewed_at: "2026-01-03T00:00:00Z",
      created_at: "2026-01-02T00:00:00Z",
      updated_at: "2026-01-03T00:00:00Z",
    };
    const m = mapContribution(c);
    expect(m.status).toBe("Verified");
    expect(m.fix).toBe("Reinstall and disable auto-update.");
  });
});

describe("formatRelativeTime", () => {
  it("returns an em dash for missing timestamps", () => {
    expect(formatRelativeTime(null)).toBe("—");
    expect(formatRelativeTime(undefined)).toBe("—");
  });
});
