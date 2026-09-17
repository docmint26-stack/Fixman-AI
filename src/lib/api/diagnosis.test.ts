import { afterEach, describe, expect, it, vi } from "vitest";
import { apiGet } from "./client";
import { DiagnosisError, pollDiagnosis } from "./diagnosis";
vi.mock("./client", async importOriginal => ({ ...await importOriginal<typeof import("./client")>(), apiGet: vi.fn() }));
afterEach(() => vi.clearAllMocks());

describe("real diagnosis polling", () => {
  it("emits actual stages and stops when completed", async () => {
    vi.mocked(apiGet).mockResolvedValueOnce({ status: "running", stage: "KNOWLEDGE_RETRIEVAL", stage_percent: 45 })
      .mockResolvedValueOnce({ status: "completed", stage: "COMPLETED", stage_percent: 100 });
    const onStage = vi.fn();
    await pollDiagnosis("dx", "case", "token", { onStage }, 0);
    expect(onStage.mock.calls).toEqual([["KNOWLEDGE_RETRIEVAL", 45], ["COMPLETED", 100]]);
    expect(apiGet).toHaveBeenCalledTimes(2);
  });
  it.each(["AI_PROVIDER_NOT_CONFIGURED", "AI_PROVIDER_TIMEOUT", "AI_PROVIDER_RATE_LIMIT", "AI_PROVIDER_ERROR", "VALIDATION_FAILED", "RETRIEVAL_FAILED"])("maps %s without demo fallback", async code => {
    vi.mocked(apiGet).mockResolvedValue({ status: "failed", stage: "FAILED", error: { code, message: "private provider trace" } });
    await expect(pollDiagnosis("dx", "case", "token", {}, 0)).rejects.toMatchObject({ code, caseId: "case" });
    expect(apiGet).toHaveBeenCalledTimes(1);
  });
  it("reports the honest no-key error for unavailable runs", async () => {
    vi.mocked(apiGet).mockResolvedValue({ status: "unavailable", error: { code: "AI_PROVIDER_NOT_CONFIGURED" } });
    await expect(pollDiagnosis("dx", "case", "token")).rejects.toThrow("AI diagnosis is not configured in this environment.");
  });
  it("bounds polling and supports cancellation", async () => {
    vi.mocked(apiGet).mockResolvedValue({ status: "running", stage: "RECEIVED", stage_percent: 5 });
    await expect(pollDiagnosis("dx", "case", "token", {}, 0, 2)).rejects.toBeInstanceOf(DiagnosisError);
    const controller = new AbortController();
    controller.abort();
    await expect(pollDiagnosis("dx", "case", "token", { signal: controller.signal })).rejects.toThrow();
    expect(apiGet).toHaveBeenCalledTimes(2);
  });
});
