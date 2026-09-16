import type { InsightCardData, Kpi } from "./types";

export const kpis: Kpi[] = [
  { id: "k-1", label: "Cases Resolved", value: 28, delta: "+3 this week", trend: "up", icon: "circle-check", href: "/cases" },
  { id: "k-2", label: "FIX Balance", value: 125, suffix: " FIX", delta: "24 claimable", trend: "up", icon: "coins", href: "/rewards" },
  { id: "k-3", label: "Claimable", value: 24, suffix: " FIX", delta: "Unlocks now", trend: "up", icon: "wallet", href: "/rewards" },
  { id: "k-4", label: "Verified Contributions", value: 16, delta: "+2 this month", trend: "up", icon: "shield-check", href: "/profile" },
  { id: "k-5", label: "Success Rate", value: 91, suffix: "%", delta: "+2.1%", trend: "up", icon: "gauge", href: "/leaderboard" },
  { id: "k-6", label: "Leaderboard Rank", value: 18, delta: "↑ 3 this week", trend: "up", icon: "trophy", href: "/leaderboard" },
];

export const nextActions = [
  {
    id: "a-1",
    title: "Start a diagnosis",
    description: "Describe a problem and get ranked, verified fixes.",
    action: "New Diagnosis",
    href: "/diagnose",
    icon: "stethoscope",
    tone: "primary" as const,
  },
  {
    id: "a-2",
    title: "Verify pending outcomes",
    description: "2 outcomes are waiting for evidence signatures.",
    action: "Review",
    href: "/contribute",
    icon: "shield-check",
    tone: "accent" as const,
  },
  {
    id: "a-3",
    title: "Claim your rewards",
    description: "24 FIX is unlocked and ready to claim.",
    action: "Claim",
    href: "/rewards",
    icon: "coins",
    tone: "success" as const,
  },
];

export const intelligenceImpact = {
  casesHelpedThisWeek: 37,
  weeksTopContribution: {
    title: "React hydration mismatch caused by client-only timestamp",
    successRate: 89,
    used: 14,
    royalty: 6.4,
    href: "/cases/case-hydration",
  },
  phrases: [
    "37 people benefited from your contributed fixes.",
    "Your knowledge earned 14 FIX this week.",
    "2 outcomes are waiting for verification.",
  ],
  insightCards: [
    {
      id: "ins-1",
      title: "Your fixes are compounding",
      description: "Your top-rated fix resurfaced for 37 similar problems this week.",
      impact: "+37 uses",
      href: "/profile",
      actionLabel: "View impact",
    },
    {
      id: "ins-2",
      title: "First-attempt resolution",
      description: "89% of users who followed your hydration fix resolved their issue at once.",
      impact: "89%",
      href: "/leaderboard",
      actionLabel: "Compare",
    },
    {
      id: "ins-3",
      title: "Rewards are compounding",
      description: "Your knowledge earned 14 FIX this week across 3 verified fixes.",
      impact: "+14 FIX",
      href: "/rewards",
      actionLabel: "View rewards",
    },
  ] satisfies InsightCardData[],
};