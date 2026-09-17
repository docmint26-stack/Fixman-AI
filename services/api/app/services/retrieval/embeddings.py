"""Embedding normalization and vector utilities for Puvexa AI.

Extracts structured, anonymized features (symptoms, environment, error codes)
free of private user data (paths, emails, personal names) to produce reproducible embeddings.
"""
import math
import re
from typing import Any

from app.services.ai.redactor import redact_secrets

PRIVATE_PATH_PAT = re.compile(r"[A-Za-z]:\\[^\s\r\n]+\b|/(?:home|Users|usr|var|tmp)/[^\s\r\n]+\b")


def sanitize_embedding_input(text: str) -> str:
    """Removes personal paths, usernames, and secrets before embedding generation."""
    sanitized, _ = redact_secrets(text)
    sanitized = PRIVATE_PATH_PAT.sub("[PATH]", sanitized)
    return sanitized.strip()


def build_case_embedding_text(
    title: str,
    description: str,
    category: str,
    environment: dict[str, Any] | None = None,
    error_signatures: list[str] | None = None,
) -> str:
    """Constructs a normalized, privacy-preserving text representation of a case for embedding."""
    clean_title = sanitize_embedding_input(title)
    clean_desc = sanitize_embedding_input(description[:400])

    env = environment or {}
    os_name = env.get("os") or env.get("operating_system") or "Unknown OS"
    software = env.get("software") or env.get("software_name") or ""

    parts = [
        f"CATEGORY: {category}",
        f"PROBLEM: {clean_title}",
        f"DETAILS: {clean_desc}",
        f"ENVIRONMENT: {os_name} {software}".strip(),
    ]

    if error_signatures:
        clean_sigs = [sanitize_embedding_input(s) for s in error_signatures[:5]]
        parts.append(f"SIGNATURES: {'; '.join(clean_sigs)}")

    return " | ".join(parts)


def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """Computes cosine similarity between two float vectors in Python (for SQLite/test fallback)."""
    if vec_a is None or vec_b is None or len(vec_a) == 0 or len(vec_b) == 0 or len(vec_a) != len(vec_b):
        return 0.0

    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a, b in zip(vec_a, vec_b)))
    norm_b = math.sqrt(sum(b * b for a, b in zip(vec_a, vec_b)))

    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0

    return max(0.0, min(1.0, dot / (norm_a * norm_b)))
