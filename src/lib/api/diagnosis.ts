import { apiGet, ApiError } from "./client";

export const DIAGNOSIS_STAGES = {
  RECEIVED: "Understanding your problem...",
  EVIDENCE_PROCESSING: "Processing evidence...",
  CONTEXT_NORMALIZATION: "Understanding your environment...",
  KNOWLEDGE_RETRIEVAL: "Searching trusted knowledge...",
  SIMILAR_CASE_RETRIEVAL: "Finding similar cases...",
  ROOT_CAUSE_ANALYSIS: "Comparing verified outcomes...",
  FIX_GENERATION: "Preparing possible fixes...",
  FIX_RANKING: "Ranking possible fixes...",
  VALIDATION: "Checking recommendation safety...",
  COMPLETED: "Preparing diagnosis...",
} as const;

export type StageCallback = (stage: string, progress: number) => void;
export interface DiagnosisOptions {
  onStage?: StageCallback;
  caseId?: string;
  signal?: AbortSignal;
}
const ERRORS: Record<string, string> = {
  AI_PROVIDER_NOT_CONFIGURED: "AI diagnosis is not configured in this environment.",
  AI_PROVIDER_TIMEOUT: "The AI provider timed out. Please retry.",
  AI_PROVIDER_RATE_LIMIT: "The AI provider is busy. Please retry later.",
  AI_PROVIDER_ERROR: "The AI provider could not complete this diagnosis.",
  VALIDATION_FAILED: "The diagnosis did not pass safety and output validation.",
  RETRIEVAL_FAILED: "Trusted knowledge could not be retrieved. Please retry.",
};
export class DiagnosisError extends ApiError {
  constructor(code: string, public caseId: string) {
    super(502, code, ERRORS[code] ?? "Diagnosis could not be completed. Please retry.");
  }
}

export async function pollDiagnosis(id: string, caseId: string, token: string, options: DiagnosisOptions = {}, interval = 1000, maxPolls = 180) {
  for (let attempt = 0; attempt < maxPolls; attempt++) {
    options.signal?.throwIfAborted();
    const status = await apiGet<{
      status: string; stage: string; stage_percent: number; error?: { code?: string } | null;
    }>(`/api/v1/diagnoses/${id}/status`, token);
    options.onStage?.(status.stage, Math.max(0, Math.min(100, status.stage_percent ?? 0)));
    if (status.status === "completed") return;
    if (status.status === "failed" || status.status === "unavailable") {
      throw new DiagnosisError(status.error?.code ?? "AI_PROVIDER_ERROR", caseId);
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new DiagnosisError("AI_PROVIDER_TIMEOUT", caseId);
}
