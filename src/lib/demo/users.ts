import type { DemoUser } from "./types";

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export const DEMO_CREDENTIALS = {
  email: "alex@puvexa.ai",
  password: "demo1234",
};

export const DEMO_USER: DemoUser = {
  id: "user-alex",
  name: "Alex Morgan",
  username: "alex",
  handle: "@alexmorgan",
  email: "alex@puvexa.ai",
  password: "demo1234",
  role: "Contributor",
  level: "Expert Solver",
  bio: "Full-stack developer who verifies what actually works. I dig into React, Python and Windows issues and share evidence-backed fixes.",
  location: "San Francisco, US",
  memberSince: "Jan 2026",
  expertise: ["React", "Python", "Windows", "Networking"],
  badges: ["Early Solver", "High Accuracy", "Code Expert", "Outcome Verifier", "Top Contributor"],
  reputation: 4820,
  reputationNext: 5000,
  verifiedOutcomes: 42,
  contributions: 31,
  successRate: 91,
  casesResolved: 28,
  streak: 12,
  rank: 18,
  avatarInitials: "AM",
  isDemo: true,
};

export function publicUser(u: DemoUser) {
  const { password, ...rest } = u;
  void password;
  return rest;
}