import { beforeEach, expect, it, vi } from "vitest";
import { apiGet, apiPost } from "./client";
import { ApiDiagnosisService } from "./services";
import type { ApiCaseDetail } from "./mappers";

vi.mock("./supabase", () => ({ getAccessToken: vi.fn().mockResolvedValue("test-token") }));
vi.mock("./client", async original => ({ ...await original<typeof import("./client")>(), apiGet: vi.fn(), apiPost: vi.fn() }));
const input = { title: "Hydration mismatch", description: "Server and client render different dates", category: "Coding Error" as const, os: "Windows", device: "PC", version: "16", recentChange: "Upgrade", evidence: ["text" as const] };
const detail: ApiCaseDetail = { id: "case", user_id: "user", title: input.title, description: input.description, category: input.category, severity: "medium", status: "suggested", created_at: "2026-01-01", updated_at: "2026-01-01" };
beforeEach(() => vi.clearAllMocks());

it("creates a case, polls completion, and maps diagnosis and sources", async () => {
  vi.mocked(apiPost).mockResolvedValueOnce({ id: "case" }).mockResolvedValueOnce({ id: "dx" });
  vi.mocked(apiGet).mockImplementation(async path => {
    if (path.endsWith("/status")) return { status: "completed", stage: "COMPLETED", stage_percent: 100 };
    if (path.endsWith("/sources")) return [{ id: "source", source_type: "knowledge_chunk", title: "Hydration documentation" }];
    if (path.endsWith("/recommendations")) return [];
    if (path === "/api/v1/diagnoses/dx") return { id: "dx", status: "completed", problem_summary: "Timestamp mismatch", confidence: 0.86, similar_case_count: 1, created_at: "2026-01-01" };
    return { ...detail };
  });
  const onStage = vi.fn();
  const result = await new ApiDiagnosisService().startDiagnosis(input, { onStage });
  expect(result.confidence).toBe(86);
  expect(result.problemSummary).toBe("Timestamp mismatch");
  expect(result.sources?.[0].title).toBe("Hydration documentation");
  expect(result.status).toBe("Suggested");
  expect(onStage).toHaveBeenCalledWith("COMPLETED", 100);
});

it("retries the existing case and does not create fabricated results on failure", async () => {
  vi.mocked(apiPost).mockResolvedValue({ id: "dx" });
  vi.mocked(apiGet).mockResolvedValue({ status: "unavailable", error: { code: "AI_PROVIDER_NOT_CONFIGURED" } });
  await expect(new ApiDiagnosisService().startDiagnosis(input, { caseId: "case" })).rejects.toMatchObject({ code: "AI_PROVIDER_NOT_CONFIGURED", caseId: "case" });
  expect(apiPost).toHaveBeenCalledTimes(1);
  expect(apiPost).toHaveBeenCalledWith("/api/v1/cases/case/diagnose", undefined, "test-token");
  expect(apiGet).toHaveBeenCalledTimes(1);
});
