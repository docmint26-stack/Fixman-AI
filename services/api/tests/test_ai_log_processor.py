"""Unit tests for log preprocessing, deduplication, and signature extraction."""
from app.services.ai.log_processor import normalize_timestamps, process_logs


def test_normalize_timestamps():
    line1 = "2026-09-17T12:00:00.123Z [ERROR] Failed to connect to socket"
    line2 = "2026-09-17 12:05:30 [ERROR] Failed to connect to socket"
    norm1 = normalize_timestamps(line1)
    norm2 = normalize_timestamps(line2)
    assert "[TIMESTAMP] [ERROR] Failed to connect to socket" == norm1
    assert "[TIMESTAMP] [ERROR] Failed to connect to socket" == norm2


def test_log_deduplication_and_signature_extraction():
    # Simulate 500 repetitive lines
    lines = []
    for i in range(250):
        lines.append(f"2026-09-17T12:{i % 60:02d}:00Z [INFO] Heartbeat check alive")
    for i in range(250):
        lines.append(f"2026-09-17T12:{i % 60:02d}:01Z [ERROR] ConnectionRefusedError: [Errno 111] Connection refused")

    raw_logs = "\n".join(lines)
    summary = process_logs(raw_logs)

    assert summary.total_lines == 500
    assert summary.error_count == 250
    # Deduplication collapses 250 identical error lines into 1 signature with frequency counter
    assert len(summary.unique_signatures) == 1
    assert "ConnectionRefusedError" in summary.unique_signatures[0]
    assert "250x" in summary.unique_signatures[0]
    assert len(summary.compact_text) < 1500


def test_stack_trace_extraction():
    raw_logs = """2026-09-17 10:00:00 [INFO] Server started on port 8000
Traceback (most recent call last):
  File "app/main.py", line 42, in handle_request
    result = compute_metrics(data)
  File "app/utils.py", line 15, in compute_metrics
    return 100 / total
ZeroDivisionError: division by zero
2026-09-17 10:00:05 [INFO] Request cycle ended"""

    summary = process_logs(raw_logs)
    assert len(summary.stack_traces) == 1
    assert "ZeroDivisionError: division by zero" in summary.stack_traces[0]
    assert "compute_metrics" in summary.stack_traces[0]

