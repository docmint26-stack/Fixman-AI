import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { FixCard } from "./diagnosis-result";
import type { RankingFix } from "@/lib/demo/types";

afterEach(cleanup);
const fix: RankingFix = { id: "fix", rank: 1, title: "Render timestamp after mount", why: "Matches hydration mismatch", successRate: 99, verifiedSuccessRate: null, statisticalStatus: "Insufficient", matchScore: 85, confidence: "High", risk: "Low", effort: "Low", estimatedTime: "—", steps: [], category: "Coding Error", tags: [], verifiedCases: 2, trustLabel: "AI Suggested", sourceType: "ai_generated" };

it("does not render a fake rate for insufficient samples", () => {
  render(<FixCard fix={fix} isTop onTry={() => {}} selected={false} />);
  expect(screen.getByText("Insufficient verified outcome data")).toBeInTheDocument();
  expect(screen.getByText("Based on 2 verified outcome(s)")).toBeInTheDocument();
  expect(screen.queryByText("99%")).not.toBeInTheDocument();
  expect(screen.getByText("AI Suggested")).toBeInTheDocument();
});

it("keeps verified success and Puvexa confidence distinct", () => {
  render(<FixCard fix={{ ...fix, verifiedSuccessRate: 82, verifiedCases: 41 }} isTop onTry={() => {}} selected={false} />);
  expect(screen.getByText("82% verified success across 41 eligible outcomes")).toBeInTheDocument();
  expect(screen.getByText("Puvexa confidence")).toBeInTheDocument();
  expect(screen.getByText("Why Puvexa recommends this")).toBeInTheDocument();
});
