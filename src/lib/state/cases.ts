import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AnalysisResult,
  AppCase,
  DiagnosisInput,
  OutcomeState,
  TimelineEvent,
} from "@/lib/demo/types";
import { cases as seedCases } from "@/lib/demo/cases";
import { PERSIST_KEYS, jsonStorage, uid } from "@/lib/state/storage";

const nowLabel = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

interface CaseState {
  cases: AppCase[];
  createDiagnosis: (input: DiagnosisInput, analysis: AnalysisResult) => AppCase;
  applyFix: (caseId: string, fixId: string, title: string, stepsTotal: number) => void;
  setStepsDone: (caseId: string, done: number) => void;
  submitOutcome: (caseId: string, outcome: OutcomeState, confidence: number) => void;
  completeVerification: (caseId: string) => AppCase | undefined;
  markFailed: (caseId: string) => void;
}

function pushEvent(c: AppCase, label: string, detail: string | undefined, tone: TimelineEvent["tone"]) {
  c.timeline = [
    ...c.timeline,
    { id: uid("ev"), label, detail, time: `Now · ${nowLabel()}`, tone },
  ];
}

export const useCaseStore = create<CaseState>()(
  persist(
    (set, get) => ({
      cases: seedCases,

      createDiagnosis: (input, analysis) => {
        const id = `case-${Date.now().toString(36)}`;
        const newest = get().cases;
        const c: AppCase = {
          id,
          title: input.title,
          category: (input.category === "System" ? "Windows / OS" : input.category),
          status: "Suggested",
          severity: "Medium",
          symptom: input.description,
          description: input.description,
          environment: {
            os: input.os || "—",
            device: input.device || "—",
            version: input.version || undefined,
            recentChange: input.recentChange || undefined,
          },
          tags: [input.category, ...(input.os ? [input.os] : [])],
          createdAt: "Just now",
          updatedAt: "Just now",
          confidence: analysis.confidence,
          successRate: analysis.fixes[0]?.successRate ?? 70,
          matchedCases: analysis.matchedCases,
          selectedFixId: null,
          stepsDone: 0,
          stepsTotal: analysis.fixes[0]?.steps.length ?? 3,
          reward: 8,
          rewardStatus: "none",
          evidence: input.evidence,
          contributor: "Alex Morgan",
          contributorInitials: "AM",
          fixes: analysis.fixes,
          reasoning: analysis.reasoning,
          similarCases: analysis.similarCases,
          createdByMe: true,
          timeline: [
            { id: uid("ev"), label: "Problem submitted", detail: input.title, time: `Now · ${nowLabel()}`, tone: "info" },
            { id: uid("ev"), label: "AI analysis complete", detail: `${analysis.matchedCases.toLocaleString()} similar cases matched`, time: `Now · ${nowLabel()}`, tone: "violet" },
          ],
        };
        set({ cases: [c, ...newest] });
        return c;
      },

      applyFix: (caseId, fixId, title, stepsTotal) => {
        set({
          cases: get().cases.map((c) => {
            if (c.id !== caseId) return c;
            const next = { ...c, selectedFixId: fixId, selectedFixTitle: title, status: "Applied" as const, stepsDone: 0, stepsTotal, updatedAt: "Just now" };
            pushEvent(next, "Fix recommended", `Selected: ${title}`, "info");
            pushEvent(next, "Fix attempted", "Started executing the fix steps", "violet");
            return next;
          }),
        });
      },

      setStepsDone: (caseId, done) => {
        set({
          cases: get().cases.map((c) => (c.id === caseId ? { ...c, stepsDone: done, updatedAt: "Just now" } : c)),
        });
      },

      submitOutcome: (caseId, outcome, confidence) => {
        set({
          cases: get().cases.map((c) => {
            if (c.id !== caseId) return c;
            const next = {
              ...c,
              outcome,
              status: "Monitoring" as const,
              verificationConfidence: confidence,
              observation: { timeLabel: "0h / 24h", hoursElapsed: 0, hoursTotal: 24, complete: false },
              updatedAt: "Just now",
            };
            pushEvent(next, "Evidence submitted", "Outcome + supporting evidence recorded", "neutral");
            pushEvent(next, "Monitoring outcome", "Observation window opened (24h)", "warning");
            return next;
          }),
        });
      },

      completeVerification: (caseId) => {
        let verified: AppCase | undefined;
        set({
          cases: get()
            .cases.map((c) => {
              if (c.id !== caseId) return c;
              verified = {
                ...c,
                status: "Verified",
                rewardStatus: "claimable",
                verificationConfidence: c.verificationConfidence ?? 96,
                observation: c.observation
                  ? { ...c.observation, timeLabel: "24h / 24h", hoursElapsed: 24, hoursTotal: 24, complete: true }
                  : undefined,
                updatedAt: "Just now",
              };
              pushEvent(verified, "Outcome verified", "Verification passed — reward unlocked", "success");
              return verified;
            }),
        });
        return verified;
      },

      markFailed: (caseId) => {
        set({
          cases: get().cases.map((c) => {
            if (c.id !== caseId) return c;
            const next = { ...c, status: "Failed" as const, updatedAt: "Just now" };
            pushEvent(next, "Outcome not resolved", "Verification did not pass", "danger");
            return next;
          }),
        });
      },
    }),
    {
      name: PERSIST_KEYS.cases,
      storage: jsonStorage(),
    }
  )
);

export function getCaseById(id: string): AppCase | undefined {
  return useCaseStore.getState().cases.find((c) => c.id === id);
}