"""Log preprocessing and diagnostic summarization.

Deduplicates repetitive lines, extracts stack traces, normalizes timestamps,
and isolates unique error signatures from noisy application and system logs.
"""
import re
from collections import Counter
from dataclasses import dataclass, field

# Timestamp regex patterns
TIMESTAMP_PATTERNS = [
    # ISO 8601: 2026-09-17T12:00:00.000Z or 2026-09-17 12:00:00,123
    re.compile(r"\b\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?(?:Z|[+-]\d{2}:?\d{2})?\b"),
    # Syslog: Sep 17 12:00:00
    re.compile(r"\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\b"),
    # Common format: [12:00:00] or [12:00:00.000]
    re.compile(r"\[\d{2}:\d{2}:\d{2}(?:\.\d+)?\]"),
]

# Error and warning levels
LEVEL_ERROR = re.compile(r"\b(ERROR|FATAL|CRITICAL|PANIC|Exception|Error:)\b", re.IGNORECASE)
LEVEL_WARN = re.compile(r"\b(WARN|WARNING)\b", re.IGNORECASE)

# Common error codes (e.g. EADDRINUSE, 500, exit code 1, etc.)
ERROR_CODE_PATTERN = re.compile(r"\b(ERR_[A-Z0-9_]+|E[A-Z0-9_]{3,}|exit code \d+|status (?:code )?[45]\d{2}|HTTP (?:code )?[45]\d{2})\b", re.IGNORECASE)


@dataclass
class LogDiagnosticSummary:
    total_lines: int
    error_count: int
    warning_count: int
    unique_signatures: list[str] = field(default_factory=list)
    stack_traces: list[str] = field(default_factory=list)
    high_frequency_warnings: list[str] = field(default_factory=list)
    timeline_summary: list[str] = field(default_factory=list)
    error_codes: list[str] = field(default_factory=list)
    compact_text: str = ""


def normalize_timestamps(line: str) -> str:
    """Replaces variable timestamps with [TIMESTAMP] token for deduplication."""
    res = line
    for pat in TIMESTAMP_PATTERNS:
        res = pat.sub("[TIMESTAMP]", res)
    return res


def extract_stack_traces(raw_text: str) -> tuple[list[str], str]:
    """Isolates Python, Node.js, and Java stack traces, returning (traces, text_without_traces)."""
    traces: list[str] = []

    # Python stack traces
    python_trace_pat = re.compile(
        r"(Traceback \(most recent call last\):[\s\S]*?(?:^[A-Za-z0-9_.]+(?:Error|Exception|Exit|Interrupt):[^\r\n]*))",
        re.MULTILINE,
    )
    for m in python_trace_pat.finditer(raw_text):
        traces.append(m.group(1).strip())
    cleaned = python_trace_pat.sub("", raw_text)

    # Node.js stack traces
    node_trace_pat = re.compile(
        r"((?:^[A-Za-z0-9_.]*(?:Error|Exception):[^\r\n]*\n)(?:\s+at [^\r\n]+\n?)+)",
        re.MULTILINE,
    )
    for m in node_trace_pat.finditer(cleaned):
        traces.append(m.group(1).strip())
    cleaned = node_trace_pat.sub("", cleaned)

    return traces, cleaned


def process_logs(raw_text: str, max_signatures: int = 15) -> LogDiagnosticSummary:
    """Processes raw log text and returns a compact diagnostic summary."""
    if not raw_text or not raw_text.strip():
        return LogDiagnosticSummary(
            total_lines=0,
            error_count=0,
            warning_count=0,
            compact_text="[Empty log stream]",
        )

    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    total_lines = len(lines)

    # Extract stack traces first
    stack_traces, remaining_text = extract_stack_traces(raw_text)
    remaining_lines = [line.strip() for line in remaining_text.splitlines() if line.strip()]

    error_lines: list[str] = []
    warning_lines: list[str] = []
    info_lines: list[str] = []
    error_codes: set[str] = set()

    for line in remaining_lines:
        norm_line = normalize_timestamps(line)
        for ec in ERROR_CODE_PATTERN.findall(line):
            error_codes.add(ec.upper())

        if LEVEL_ERROR.search(line):
            error_lines.append(norm_line)
        elif LEVEL_WARN.search(line):
            warning_lines.append(norm_line)
        else:
            info_lines.append(norm_line)

    error_counts = Counter(error_lines)
    warning_counts = Counter(warning_lines)

    unique_signatures = [
        f"{sig} (occurred {count}x)" if count > 1 else sig
        for sig, count in error_counts.most_common(max_signatures)
    ]

    high_frequency_warnings = [
        f"{sig} (occurred {count}x)" if count > 1 else sig
        for sig, count in warning_counts.most_common(5)
    ]

    # Timeline: first 2 lines, middle error, last 2 lines
    timeline_summary: list[str] = []
    if lines:
        timeline_summary.append(f"START: {lines[0]}")
        if len(lines) > 2:
            # Pick the first distinct error line or middle line
            first_err = next((line for line in lines if LEVEL_ERROR.search(line)), lines[len(lines) // 2])
            timeline_summary.append(f"EVENT: {first_err}")
            timeline_summary.append(f"END: {lines[-1]}")

    # Build compact text representation for LLM context
    sections: list[str] = []
    sections.append(f"LOG SUMMARY: {total_lines} total lines | {len(error_lines)} errors | {len(warning_lines)} warnings")
    if error_codes:
        sections.append(f"ERROR CODES: {', '.join(sorted(error_codes))}")
    if unique_signatures:
        sections.append("UNIQUE ERROR SIGNATURES:\n" + "\n".join(f"- {s}" for s in unique_signatures))
    if stack_traces:
        # Keep up to 3 distinct stack traces, truncated to 10 lines each
        sections.append("CAPTURED STACK TRACES:")
        for idx, st in enumerate(stack_traces[:3], 1):
            st_lines = st.splitlines()
            if len(st_lines) > 10:
                short_st = "\n".join(st_lines[:6] + ["  ... [truncated] ..."] + st_lines[-3:])
            else:
                short_st = st
            sections.append(f"--- Trace {idx} ---\n{short_st}")
    if high_frequency_warnings:
        sections.append("HIGH-FREQUENCY WARNINGS:\n" + "\n".join(f"- {w}" for w in high_frequency_warnings))

    compact_text = "\n\n".join(sections)

    return LogDiagnosticSummary(
        total_lines=total_lines,
        error_count=len(error_lines) + len(stack_traces),
        warning_count=len(warning_lines),
        unique_signatures=unique_signatures,
        stack_traces=stack_traces[:3],
        high_frequency_warnings=high_frequency_warnings,
        timeline_summary=timeline_summary,
        error_codes=sorted(list(error_codes)),
        compact_text=compact_text,
    )

