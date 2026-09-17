# Phase 4 closeout report

Date: 2026-09-17. **Status: local validation complete; full Phase 4 acceptance remains blocked.**
Phase 5 was not started. The frontend layout and existing application architecture were retained.

LIVE_AI_TEST=BLOCKED_NO_API_KEY

The native retrieval acceptance blocker is an unavailable local Docker/PostgreSQL runtime.
Automatic approval review rejected a broader provider replacement because it would transmit
evidence/images to `api.openai.com` when configured. That replacement was not applied. A safer,
narrower change improved the existing diagnosis/embedding requests and removed mock fallbacks
without adding image transmission. Approval for actual image-provider integration remains pending.
No live AI request ran.
The browser tool also failed to initialize, so HTTP checks and component tests do not constitute
completed visual browser QA.

## Architecture and implementation (requested report items 1–23)

1. **AI architecture:** authenticated FastAPI routes → diagnosis run → background orchestrator
   → redacted evidence → knowledge and normalized outcome retrieval → analysis → FixRanker
   → validated recommendations, confidence and provenance. SQLite is the tested local fallback;
   PostgreSQL uses pgvector. No Firebase or new application architecture was introduced.
2. **Provider abstraction:** `AIProvider`, `MockAIProvider`, `UnconfiguredAIProvider`, and
   `OpenAIProvider`. No-key production requests are honestly unavailable. Existing OpenAI
   diagnosis/embedding methods now use bounded retries, safe errors, schema instructions and
   validated embedding shapes. Logs/code/ranking use labeled local engines. Unsupported image,
   provider-level verification and contribution methods return explicit errors, never mock answers;
   the real application verification/contribution workflows remain available.
3. **Orchestrator:** ten persisted stages from RECEIVED through COMPLETED. Diagnosis and
   deterministic ranking AIRun records, ranking rationale, terminal error states and current
   diagnosis linkage are exercised by the end-to-end tests. Background jobs remain in-process;
   durable recovery after process interruption is not implemented.
4. **Multimodal/evidence:** text/log/code normalization and size limits work. Screenshot upload
   infrastructure exists, but actual image reading is not wired into the orchestrator. Production
   vision replacement is pending approval; do not claim image-understanding acceptance.
5. **Secret redaction:** existing regex-based redaction covers credentials, keys, JWTs, connection
   strings, authentication headers and other supported patterns. It is not a guarantee of removing
   all personal information and cannot sanitize image pixels.
6. **Log processing:** timestamp normalization, duplicate-line reduction, error signatures,
   stack traces and compact diagnostics. Input text is bounded by configuration.
7. **Code processing:** language/static snippet analysis, redaction and truncation. User code is
   not executed. This does not establish that a suggested patch compiles on a user's machine.
8. **Knowledge base:** seven idempotent curated documents with provenance, including all six
   specifically requested examples. Seeding creates no community counts or outcome statistics.
9. **pgvector:** configurable Compose database/user/password/port; loopback port binding;
   pgvector PostgreSQL 16 image and extension migration. Current schema dimensions are 1536.
   Native-array truth-value bugs were corrected. Actual native execution is still unverified.
10. **Similar-case retrieval:** weighted embedding, category, software/OS, error and outcome
    strength signals. The tests seed OutcomeIntelligence and obtain nonzero matches. Shared
    cards expose normalized provenance rather than private evidence.
11. **FixRanker:** source/outcome/context weights and risk/effort penalties. The default context
    score now uses reported-problem lexical overlap instead of a universal 75% match. Destructive
    candidates are removed before recommendations are persisted. Safety filtering is heuristic.
12. **Success rates:** successful eligible outcomes / successful plus unsuccessful eligible
    outcomes. Provisional self-report resolutions no longer count as verified successes in learning.
13. **Minimum sample:** backend `MIN_SUCCESS_RATE_SAMPLE` (default 5) is passed to the client.
    Missing rates and undersized samples stay unavailable; the UI never derives a rate from counts.
    The trusted-review path now uses the configured threshold too.
14. **Confidence:** composite breakdown from evidence, context, retrieval, authority, historical
    outcomes and AI agreement. UI explicitly labels FixMind confidence separately from verified
    success; it is an uncalibrated heuristic, not a guarantee.
15. **Hallucination controls:** grounded context, Pydantic output parsing, bounded repair, safe
    error mapping, explicit unknown/no-key states, and no fabricated recommendation on tested
    provider failure. These controls reduce risk; they do not eliminate hallucinations.
16. **Sources/provenance:** `/diagnoses/{id}/sources` and case detail return public source titles,
    curated URLs and pattern labels. Internal outcome identifiers/raw evidence are not returned
    by this view. The production client fetches sources after completion and refreshes case detail.
17. **Verification strategies:** coding test/build/output, system recurrence, application result
    matching, network diagnostics and lower-confidence manual self-report. Regression cases
    cover failed tests, contradictory evidence, zero-valued Excel output, recurrence, and attachment
    types without positive evidence. Client-supplied signals are not independently authenticated;
    trusted execution/attestation remains a production limitation.
18. **Outcome learning:** deterministic hydration fixture verifies, records software/version/context
    and embedding, then participates in future retrieval. Re-verification is idempotent. Raw title
    and description were removed from reusable normalized outcome context.
19. **Duplicate/fraud controls:** semantic near-duplicates, repeated content/evidence hashes,
    one-hour velocity, and repeated weak worked reports. High risk requires manual review;
    the engine does not permanently ban users. Current contribution is excluded from its own
    duplicate check. This is heuristic scoring, not a full adversarial fraud defense.
20. **Prompt injection:** existing system instructions separate untrusted evidence from guidance;
    no user code execution and no chain-of-thought exposure. Existing production diagnosis
    requests now include the actual required schema and redact the assembled context too.
21. **Frontend polling:** service-level polling with stage callback, bounded attempts, terminal
    completed/failed/unavailable handling, cancellation checks and safe error messages. Retry
    reuses the case; backend now permits retry after a failed/unavailable diagnosis.
22. **Diagnosis results:** real summary, likely cause, confidence/breakdown, ranked fixes,
    context match, risk/effort, sample size, statistical status, stored explanation and sources.
    Case detail reload restores the result instead of relying only on a list summary.
23. **Trust UX:** backend labels normalized to AI Suggested and Outcome-Backed; official and
    curated provenance preserved. Insufficient data is explicit. No independent frontend claim
    of verification is synthesized from an AI confidence score.

## Evaluation and validation (items 24–31)

24. **Evaluation harness:** 30 cases over all ten requested domains. Each has expected category,
    cause/fix families, dangerous fixes, and verification strategy. Separate cold-start documents
    are retrieved; the query is not inserted as its own answer. Full per-case output is in
    [evaluation-baseline.json](services/api/evaluation-baseline.json).

    **MOCK/DETERMINISTIC BASELINE** — no live AI quality claim:

    | Metric | Result |
    | --- | ---: |
    | Category accuracy | 46.67% |
    | Root-cause relevance (lexical proxy) | 90.00% |
    | Retrieval precision@3 (lexical/category rubric) | 26.67% |
    | Safe-fix rate (known-danger patterns) | 100.00% |
    | Structured-output validity | 100.00% |
    | Unsupported-claim rate (literal-support proxy) | 56.67% |
    | Fix-ranking relevance (lexical/category rubric) | 76.67% |
    | Verification-strategy accuracy | 46.67% |
    | Sample honesty | 100.00% |

    These proxies need human evaluation. Category labels are not supplied as answers to the mock.
    Evaluation execution succeeds despite low quality scores; passing the harness is not quality approval.
25. **Backend:** 208 tests pass with `python -m pytest -q`, including migration tests, mock pipeline,
    provider failure, verification, anti-abuse, outcome learning and native-array compatibility.
26. **Ruff:** `python -m ruff check .` clean.
27. **Frontend:** 42 tests pass across six files, including polling and component rendering.
28. **Typecheck:** `npm.cmd run typecheck` passes.
29. **Lint:** `npm.cmd run lint` passes. Backend service directories are excluded from frontend ESLint.
30. **Build:** `npm.cmd run build` passes. Landing/demo/login and no-key backend health returned
    HTTP 200. Browser visual verification was blocked by browser-tool initialization failure.
31. **Retrieval smoke:** SQLite migration upgrade, seven-document seed and hydration/Python
    retrieval pass. Native PostgreSQL/pgvector smoke **BLOCKED_NO_LOCAL_RUNTIME**: Docker,
    psql and Podman were not available, and no standard Docker installation was found.
    `python -m app.scripts.smoke_retrieval --require-postgres` is ready and refuses SQLite fallback.

## Limits and next recommendation (items 32–33)

32. **Known limitations:** no API key/live quality evidence; pending image-provider integration;
    screenshot reading not integrated; no native pgvector runtime verification; no visual browser QA;
    low mock evaluation coverage; fixed 1536-dimensional migration; uncalibrated confidence;
    client-provided verification signals; process-local background jobs. `AI_RETRY_COUNT` is
    tested through mocked HTTP and wired into existing production diagnosis/embedding requests.
    Production auth/private storage still require Supabase configuration; local deterministic
    tests and frontend demo do not. A future Supabase project is not a local-development blocker.
33. **Exact next recommendation:** start a local Docker/PostgreSQL runtime and run native validation.
    Approve or decline the separate image-capable OpenAI change; if approved, wire actual image
    evidence and validate with mocked HTTP responses. Run the documented native migration/seed/
    smoke commands, and rerun browser verification when its connection works. Then close Phase 4.
    Keep Phase 5 deferred. Add a real API key only for a separate, explicitly enabled live evaluation.

See [README.md](README.md#phase-4-local-closeout) for exact local commands and the seven-step
future Supabase migration checklist.
