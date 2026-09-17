import type {
  AppCase,
  CaseCategory,
  CaseStatus,
  Contribution,
  EvidenceKind,
  LeaderboardEntry,
  NotificationItem,
  OutcomeState,
  ProbableCause,
  RankingFix,
  RewardItem,
  RewardSnapshot,
  SimilarCaseRef,
  TimelineEvent,
} from "@/lib/demo/types";
import { initialsOf } from "@/lib/format";

/* ------------------------------------------------------------------ */
/* Raw API response shapes (source of truth: services/api routes.py)  */
/* ------------------------------------------------------------------ */

export interface ApiProfile {
  id: string;
  auth_user_id: string;
  display_name: string;
  username?: string | null;
  avatar_url?: string | null;
  bio: string;
  role: string;
  reputation_level: string;
  reputation_score: number;
  country_code?: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface ApiProfileStats {
  total_cases: number;
  resolved_count: number;
  active_cases: number;
  verified_contributions: number;
  reputation: number;
}

export interface ApiFix {
  id: string;
  title: string;
  summary: string;
  instructions: string[];
  category: string;
  risk_level: string;
  effort_level: string;
  source_type: string;
  verification_status: string;
  success_count: number;
  failure_count: number;
  partial_count: number;
  verified_success_rate?: number | null;
  reuse_count: number;
  created_at: string;
}

export interface ApiRecommendation {
  trust_label?: string;
  statistical_status?: string;
  min_success_rate_sample?: number;
  why_it_matches?: string;
  id: string;
  case_id: string;
  diagnosis_run_id: string;
  fix_id: string;
  rank: number;
  ai_confidence?: number | null;
  context_match_score?: number | null;
  explanation?: string | null;
  estimated_success_rate?: number | null;
  created_at: string;
  fix: ApiFix;
  sample_size: number;
}

export interface ApiEvidence {
  id: string;
  case_id: string;
  evidence_type: string;
  original_filename?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  created_at: string;
}

export interface ApiDiagnosis {
  analysis_metadata?: { confidence_breakdown?: Record<string, number> };
  id: string;
  status: string;
  problem_summary?: string | null;
  probable_cause?: string | null;
  confidence?: number | null;
  similar_case_count: number;
  model_provider?: string | null;
  model_name?: string | null;
  created_at: string;
}

export interface ApiAttempt {
  id: string;
  fix_id: string;
  status: string;
  steps_done: number;
  started_at: string;
  completed_at?: string | null;
}

export interface ApiOutcome {
  id: string;
  reported_result: string;
  verification_method: string;
  verification_confidence?: number | null;
  verification_status: string;
  observation_started_at?: string | null;
  observation_ends_at?: string | null;
  verified_at?: string | null;
  created_at: string;
}

export interface ApiRewardLedger {
  id: string;
  event_type: string;
  reason: string;
  amount: number;
  status: string;
  claimable_at?: string | null;
  claimed_at?: string | null;
  created_at: string;
}

export interface ApiCaseDetail {
  sources?: ApiSource[];
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string | null;
  severity: string;
  status: string;
  environment?: Record<string, string>;
  software_name?: string | null;
  software_version?: string | null;
  operating_system?: string | null;
  device_name?: string | null;
  recent_changes?: string | null;
  current_diagnosis_id?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
  evidence?: ApiEvidence[];
  diagnoses?: ApiDiagnosis[];
  attempts?: ApiAttempt[];
  outcomes?: ApiOutcome[];
  recommendations?: ApiRecommendation[];
  rewards?: ApiRewardLedger[];
}

export interface ApiSource {
  id: string;
  source_type: string;
  title?: string;
  source_url?: string | null;
  relevance_score?: number | null;
  usage_type?: string;
}

export interface ApiRewardSummary {
  balance: number;
  pending: number;
  claimable: number;
  lifetime_earned: number;
  royalty_earned: number;
  staked_or_reserved: number;
}

export interface ApiLeaderboardRow {
  id: string;
  display_name: string;
  avatar_url?: string | null;
  reputation_level: string;
  reputation: number;
  rank: number;
  verified_fixes: number;
  verified_outcomes: number;
  success_rate?: number | null;
  knowledge_impact: number;
  badge?: string | null;
  is_current_user: boolean;
}

export interface ApiNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  action_url?: string | null;
  read_at?: string | null;
  created_at: string;
}

export interface ApiContribution {
  id: string;
  contribution_type: string;
  title: string;
  description: string;
  case_id?: string | null;
  fix_id?: string | null;
  status: string;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/* Time helpers                                                        */
/* ------------------------------------------------------------------ */

const now = () => Date.now();

export function formatRelativeTime(iso?: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Math.max(0, now() - then);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

export function formatMonthYear(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString([], { month: "short", year: "numeric" });
}

/* ------------------------------------------------------------------ */
/* Domain mappers                                                      */
/* ------------------------------------------------------------------ */

const STATUS_MAP: Record<string, CaseStatus> = {
  submitted: "Needs Verification",
  analyzing: "Needs Verification",
  needs_review: "Needs Verification",
  suggested: "Suggested",
  applied: "Applied",
  monitoring: "Monitoring",
  verified: "Verified",
  partially_verified: "Partially Verified",
  failed: "Failed",
};

export function mapCaseStatus(apiStatus: string): CaseStatus {
  return STATUS_MAP[apiStatus] ?? "Needs Verification";
}

const SEVERITY_MAP: Record<string, "Low" | "Medium" | "High" | "Critical"> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const LEVEL_MAP: Record<string, "Low" | "Medium" | "High"> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

function asCategory(value: string): CaseCategory {
  const categories: CaseCategory[] = [
    "Coding Error",
    "Windows / OS",
    "Network & Wi-Fi",
    "Hardware & Devices",
    "Apps & Productivity",
    "Performance",
    "Security",
  ];
  return categories.includes(value as CaseCategory) ? (value as CaseCategory) : "Apps & Productivity";
}

function percent(value: number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Math.round(value * 100);
}

function ciToLevel(value: number | null | undefined): "High" | "Medium" | "Low" {
  const v = value ?? 0;
  if (v >= 0.7) return "High";
  if (v >= 0.4) return "Medium";
  return "Low";
}

export function mapRecommendation(rec: ApiRecommendation): RankingFix {
  const fix = rec.fix;
  const sample = rec.sample_size;
  const verifiedRate =
    fix.verified_success_rate != null && sample >= (rec.min_success_rate_sample ?? 5)
      ? percent(fix.verified_success_rate)
      : null;
  const inferredConfidence = rec.ai_confidence ?? rec.context_match_score ?? 0;
  return {
    id: fix.id,
    rank: rec.rank,
    title: fix.title,
    why: rec.explanation ?? fix.summary,
    successRate: verifiedRate ?? 0,
    verifiedSuccessRate: verifiedRate,
    statisticalStatus: rec.statistical_status ?? "Insufficient verified outcome data",
    trustLabel: ({ "AI Suggestion": "AI Suggested", "Outcome-Backed Fix": "Outcome-Backed" } as Record<string, string>)[rec.trust_label ?? ""] ?? rec.trust_label ?? "Insufficient Evidence",
    sourceType: fix.source_type,
    matchScore: percent(rec.context_match_score ?? inferredConfidence),
    confidence: ciToLevel(inferredConfidence),
    risk: LEVEL_MAP[fix.risk_level] ?? "Medium",
    effort: LEVEL_MAP[fix.effort_level] ?? "Medium",
    estimatedTime: "—",
    steps: Array.isArray(fix.instructions) ? fix.instructions.map(String) : [],
    category: fix.category,
    tags: [fix.category, LEVEL_MAP[fix.risk_level] ?? "Medium", LEVEL_MAP[fix.effort_level] ?? "Medium"],
    verifiedCases: sample,
    isTopPicked: rec.rank === 1,
  };
}

function mapReasoning(diagnoses?: ApiDiagnosis[], fallbackConfidence = 0): ProbableCause[] {
  const latest = diagnoses?.[0];
  if (latest?.probable_cause) {
    return [{ cause: latest.probable_cause, likelihood: percent(latest.confidence ?? fallbackConfidence) }];
  }
  return [];
}

function mapSimilarCases(diagnoses?: ApiDiagnosis[], category = "Coding Error", confidence = 0): SimilarCaseRef[] {
  const count = diagnoses?.[0]?.similar_case_count ?? 0;
  if (count <= 0) return [];
  return [
    {
      title: `${count.toLocaleString()} similar verified cases`,
      category,
      match: confidence,
      outcome: "Verified",
    },
  ];
}

function mapTimeline(caseDetail: ApiCaseDetail): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      id: `tl-created-${caseDetail.id}`,
      label: "Problem submitted",
      detail: caseDetail.title,
      time: formatRelativeTime(caseDetail.created_at),
      tone: "info",
    },
  ];
  const diagnosis = caseDetail.diagnoses?.[0];
  if (diagnosis) {
    events.push({
      id: `tl-dx-${diagnosis.id}`,
      label: "Diagnosis recorded",
      detail:
        diagnosis.model_provider && diagnosis.model_provider !== "development_deterministic"
          ? `Server-side review · ${diagnosis.probable_cause ?? "awaiting review"}`
          : diagnosis.probable_cause ?? "Server analysis matched similar cases",
      time: formatRelativeTime(diagnosis.created_at),
      tone: "violet",
    });
  }
  const attempt = caseDetail.attempts?.[0];
  if (attempt) {
    events.push({
      id: `tl-attempt-${attempt.id}`,
      label: "Fix attempted",
      detail: "Started executing the recommended fix",
      time: formatRelativeTime(attempt.started_at),
      tone: "neutral",
    });
  }
  const outcome = caseDetail.outcomes?.[0];
  if (outcome) {
    events.push({
      id: `tl-outcome-${outcome.id}`,
      label: "Evidence submitted",
      detail: "Outcome + supporting evidence recorded",
      time: formatRelativeTime(outcome.created_at),
      tone: "warning",
    });
  }
  if (caseDetail.status === "verified") {
    events.push({
      id: `tl-verified-${caseDetail.id}`,
      label: "Outcome verified",
      detail: "Verification passed",
      time: formatRelativeTime(caseDetail.resolved_at ?? caseDetail.updated_at),
      tone: "success",
    });
  }
  return events;
}

function mapObservation(outcome?: ApiOutcome): AppCase["observation"] {
  if (!outcome?.observation_started_at) return undefined;
  const start = new Date(outcome.observation_started_at).getTime();
  const end = outcome.observation_ends_at ? new Date(outcome.observation_ends_at).getTime() : start;
  const hoursTotal = Math.max(1, Math.round((end - start) / 3_600_000));
  const hoursElapsed = Math.max(0, Math.min(hoursTotal, Math.floor((now() - start) / 3_600_000)));
  const complete = outcome.verification_status === "verified" || outcome.verification_status === "failed" || now() >= end;
  return {
    timeLabel: `${hoursElapsed}h / ${hoursTotal}h`,
    hoursElapsed,
    hoursTotal,
    complete,
  };
}

export function mapCase(detail: ApiCaseDetail): AppCase {
  const recommendations = (detail.recommendations ?? []).map(mapRecommendation);
  const topFix = recommendations.find((r) => r.isTopPicked) ?? recommendations[0];
  const attempt = detail.attempts?.[0];
  const outcome = detail.outcomes?.[0];
  const selectedFix = attempt ? recommendations.find((r) => r.id === attempt.fix_id) : undefined;
  const latestDiagnosis = detail.diagnoses?.[0];
  const confidence = latestDiagnosis?.confidence != null ? percent(latestDiagnosis.confidence) : 0;

  let rewardStatus: AppCase["rewardStatus"] = "none";
  let reward = 0;
  for (const entry of detail.rewards ?? []) {
    if (entry.status === "cancelled") continue;
    if (entry.status === "claimable") rewardStatus = "claimable";
    else if (rewardStatus === "none" && (entry.status === "pending" || entry.status === "reserved_for_web3")) {
      rewardStatus = "pending";
    } else if (entry.status === "claimed_offchain") {
      rewardStatus = "claimed";
    }
    if (entry.amount > 0) reward += Number(entry.amount);
  }

  const outcomeMap: Record<string, OutcomeState> = {
    resolved: "resolved",
    partially_resolved: "partial",
    not_resolved: "not-resolved",
  };

  return {
    id: detail.id,
    problemSummary: latestDiagnosis?.problem_summary ?? undefined,
    confidenceBreakdown: latestDiagnosis?.analysis_metadata?.confidence_breakdown,
    sources: detail.sources,
    title: detail.title,
    category: asCategory(detail.category),
    status: mapCaseStatus(detail.status),
    severity: SEVERITY_MAP[detail.severity] ?? "Medium",
    symptom: detail.description,
    description: detail.description,
    environment: {
      os: detail.operating_system ?? "—",
      device: detail.device_name ?? "—",
      version: detail.software_version ?? undefined,
      recentChange: detail.recent_changes ?? undefined,
    },
    tags: [detail.category, detail.subcategory ?? ""].filter(Boolean),
    createdAt: formatRelativeTime(detail.created_at),
    updatedAt: formatRelativeTime(detail.updated_at),
    confidence,
    successRate: topFix?.successRate ?? 0,
    matchedCases: latestDiagnosis?.similar_case_count ?? 0,
    selectedFixId: attempt?.fix_id ?? null,
    selectedFixTitle: selectedFix?.title,
    stepsDone: attempt?.steps_done ?? 0,
    stepsTotal: selectedFix?.steps.length ?? topFix?.steps.length ?? 0,
    reward: Math.round(reward),
    rewardStatus,
    evidence: (detail.evidence ?? []).map(e => e.evidence_type as EvidenceKind),
    outcome: outcome ? outcomeMap[outcome.reported_result] ?? undefined : undefined,
    verificationConfidence: percent(outcome?.verification_confidence ?? latestDiagnosis?.confidence ?? 0),
    observation: mapObservation(outcome),
    contributor: "FixMind",
    contributorInitials: "FM",
    fixes: recommendations,
    reasoning: mapReasoning(detail.diagnoses, topFix?.matchScore),
    similarCases: mapSimilarCases(detail.diagnoses, detail.category, confidence),
    timeline: mapTimeline(detail),
    createdByMe: true,
  };
}

export function mapProfile(profile: ApiProfile, stats: ApiProfileStats): {
  id: string;
  name: string;
  username: string;
  handle: string;
  email: string;
  password: string;
  role: string;
  level: string;
  bio: string;
  location: string;
  memberSince: string;
  expertise: string[];
  badges: string[];
  reputation: number;
  reputationNext: number;
  verifiedOutcomes: number;
  contributions: number;
  successRate: number;
  casesResolved: number;
  streak: number;
  rank: number;
  avatarInitials: string;
  isDemo: boolean;
} {
  const username = profile.username ?? profile.display_name.toLowerCase().replace(/\s+/g, "");
  return {
    id: profile.id,
    name: profile.display_name,
    username,
    handle: `@${username}`,
    email: "",
    password: "",
    role: profile.role === "user" ? "Contributor" : profile.role,
    level: profile.reputation_level,
    bio: profile.bio || "New to FixMind — diagnosing problems and verifying outcomes.",
    location: profile.country_code ? `Global · ${profile.country_code}` : "—",
    memberSince: formatMonthYear(profile.created_at),
    expertise: [],
    badges: ["Verified"],
    reputation: profile.reputation_score,
    reputationNext: 0,
    verifiedOutcomes: stats.resolved_count,
    contributions: stats.verified_contributions,
    successRate: stats.total_cases > 0 ? Math.round((stats.resolved_count / stats.total_cases) * 100) : 0,
    casesResolved: stats.resolved_count,
    streak: 0,
    rank: 0,
    avatarInitials: initialsOf(profile.display_name),
    isDemo: false,
  };
}

const REWARD_TYPE_MAP: Record<string, RewardItem["type"]> = {
  verified_outcome: "Verified Outcome",
  verified_fix: "Useful Fix",
  useful_fix: "Useful Fix",
  new_fix: "Useful Fix",
  fix_improvement: "Reward Share",
  correction: "Crowd Verification",
  royalty: "Royalty",
  crowd_verification: "Crowd Verification",
  reward_share: "Reward Share",
  staked: "Staked",
  claimed: "Claimed",
  earned: "Earned",
};

const REWARD_STATUS_MAP: Record<string, RewardItem["status"]> = {
  claimable: "unlocked",
  pending: "pending",
  reserved_for_web3: "pending",
  claimed_offchain: "completed",
  completed: "completed",
  cancelled: "completed",
};

export function mapRewardItem(entry: ApiRewardLedger): RewardItem {
  return {
    id: entry.id,
    type: REWARD_TYPE_MAP[entry.event_type] ?? "Earned",
    title: entry.reason,
    amount: Math.round(Number(entry.amount) * 100) / 100,
    date: formatRelativeTime(entry.created_at),
    status: REWARD_STATUS_MAP[entry.status] ?? "pending",
  };
}

export function mapRewardSummary(summary: ApiRewardSummary): RewardSnapshot {
  const breakdown: { label: string; amount: number }[] = [];
  if (summary.claimable > 0) breakdown.push({ label: "Claimable", amount: summary.claimable });
  if (summary.pending > 0) breakdown.push({ label: "Pending verification", amount: summary.pending });
  if (summary.staked_or_reserved > 0) breakdown.push({ label: "Reserved for web3", amount: summary.staked_or_reserved });
  return {
    balance: Math.round(summary.balance * 100) / 100,
    claimable: Math.round(summary.claimable * 100) / 100,
    lifetimeEarned: Math.round(summary.lifetime_earned * 100) / 100,
    royalty: Math.round(summary.royalty_earned * 100) / 100,
    staked: Math.round(summary.staked_or_reserved * 100) / 100,
    stakingApr: 0,
    claimableDetails: summary.claimable > 0 ? "Rewards unlocked for verified outcomes" : "No claimable rewards yet",
    priceUsd: 0,
    network: "FIX",
    breakdown,
  };
}

export function mapLeaderboardEntry(row: ApiLeaderboardRow): LeaderboardEntry {
  return {
    rank: row.rank,
    name: row.display_name,
    handle: "",
    initials: initialsOf(row.display_name),
    title: row.reputation_level,
    reputation: row.reputation,
    verified: row.verified_outcomes,
    successRate: row.success_rate ?? 0,
    impact: `${row.knowledge_impact.toLocaleString()} cases helped`,
    fixEarned: row.knowledge_impact,
    movement: 0,
    streak: 0,
    badge: row.badge ?? row.reputation_level,
    isYou: row.is_current_user,
  };
}

export function mapNotification(item: ApiNotification): NotificationItem {
  const kind: NotificationItem["kind"] = /reward/i.test(item.type) ? "reward" : /case/i.test(item.type) ? "case" : "system";
  return {
    id: item.id,
    title: item.title,
    body: item.message,
    time: formatRelativeTime(item.created_at),
    kind,
    unread: !item.read_at,
    actionHref: item.action_url ?? undefined,
  };
}

export function mapContribution(c: ApiContribution): Contribution {
  return {
    id: c.id,
    caseId: c.case_id ?? c.id,
    title: c.title,
    category: "Apps & Productivity",
    fix: c.description,
    reward: 0,
    royalty: 0,
    reuseCount: 0,
    verifiedAt: formatRelativeTime(c.reviewed_at ?? c.created_at),
    outcome: "Needs Verification",
    status: c.status === "accepted" ? "Verified" : "Pending Review",
  };
}
