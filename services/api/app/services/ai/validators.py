"""Controlled JSON repair and strict schema validation for AI model outputs.

Guarantees malformed model outputs are either safely repaired to conform to schemas
or rejected cleanly with structured errors, preventing corrupted data persistence.
"""
import json
import re
from typing import TypeVar

from pydantic import BaseModel, ValidationError

T = TypeVar("T", bound=BaseModel)

TRAILING_COMMA_PAT = re.compile(r",\s*([\]}])")
MARKDOWN_FENCE_PAT = re.compile(r"^```(?:json)?\s*([\s\S]*?)\s*```$", re.MULTILINE)


def strip_markdown_fences(text: str) -> str:
    """Strips ```json ... ``` code fences if present."""
    stripped = text.strip()
    match = MARKDOWN_FENCE_PAT.search(stripped)
    if match:
        return match.group(1).strip()
    # Check simple prefix/suffix
    if stripped.startswith("```"):
        lines = stripped.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        return "\n".join(lines).strip()
    return stripped


def extract_json_substring(text: str) -> str:
    """Locates the outermost balanced JSON object or array."""
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        return text[first_brace : last_brace + 1]

    first_bracket = text.find("[")
    last_bracket = text.rfind("]")
    if first_bracket != -1 and last_bracket != -1 and last_bracket > first_bracket:
        return text[first_bracket : last_bracket + 1]

    return text


def repair_json_string(raw: str) -> str:
    """Attempts common syntax repairs on slightly malformed JSON strings."""
    cleaned = strip_markdown_fences(raw)
    cleaned = extract_json_substring(cleaned)
    # Remove trailing commas: [1, 2, ] -> [1, 2]
    cleaned = TRAILING_COMMA_PAT.sub(r"\1", cleaned)
    return cleaned


def validate_and_parse(raw_output: str, schema_class: type[T]) -> tuple[T | None, bool, str | None]:
    """Validates raw model output against a Pydantic schema with controlled repair.

    Returns:
        tuple[T | None, bool, str | None]: (parsed_model, was_repaired, error_message)
    """
    if not raw_output or not raw_output.strip():
        return None, False, "EMPTY_MODEL_OUTPUT"

    # Step 1: Direct JSON parsing
    try:
        data = json.loads(raw_output)
        model = schema_class.model_validate(data)
        return model, False, None
    except (json.JSONDecodeError, ValidationError):
        pass

    # Step 2: Controlled repair
    try:
        repaired_str = repair_json_string(raw_output)
        data = json.loads(repaired_str)
        model = schema_class.model_validate(data)
        return model, True, None
    except (json.JSONDecodeError, ValidationError) as exc:
        return None, False, f"VALIDATION_FAILED: {str(exc)}"

