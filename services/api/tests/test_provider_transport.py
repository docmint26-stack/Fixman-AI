import json
from unittest.mock import AsyncMock

import httpx
import pytest

from app.core.config import get_settings
from app.core.exceptions import APIError
from app.services.ai.http_transport import provider_post
from app.services.ai.provider import OpenAIProvider


@pytest.mark.parametrize(("status", "code"), [(429, "AI_PROVIDER_RATE_LIMIT"), (503, "AI_PROVIDER_ERROR")])
async def test_transport_retries_and_returns_safe_code(monkeypatch, status, code):
    monkeypatch.setattr(get_settings(), "ai_retry_count", 1)
    post = AsyncMock(return_value=httpx.Response(status, json={"secret": "private-provider-trace"}))
    monkeypatch.setattr(httpx.AsyncClient, "post", post)
    with pytest.raises(APIError) as error:
        await provider_post("https://provider.invalid/test", "unit-test", {}, 1)
    assert error.value.code == code
    assert "private-provider-trace" not in str(error.value)
    assert post.call_count == 2


async def test_transport_timeout_is_bounded(monkeypatch):
    monkeypatch.setattr(get_settings(), "ai_retry_count", 0)
    post = AsyncMock(side_effect=httpx.ReadTimeout("private trace"))
    monkeypatch.setattr(httpx.AsyncClient, "post", post)
    with pytest.raises(APIError) as error:
        await provider_post("https://provider.invalid/test", "unit-test", {}, 1)
    assert error.value.code == "AI_PROVIDER_TIMEOUT"
    assert post.call_count == 1


async def test_production_vision_does_not_fall_back_to_mock():
    with pytest.raises(APIError) as error:
        await OpenAIProvider("test-only").analyze_image(b"test", "image/png")
    assert error.value.code == "AI_PROVIDER_NOT_CONFIGURED"


async def test_production_logs_are_real_local_parser_results():
    result, metrics = await OpenAIProvider("test-only").analyze_logs("ERROR missing module")
    assert result["error_count"] == 1
    assert metrics.provider == "deterministic"


async def test_existing_production_embedding_request_uses_configured_transport(monkeypatch):
    monkeypatch.setattr(get_settings(), "ai_retry_count", 0)
    monkeypatch.setattr(get_settings(), "ai_embedding_dim", 2)
    post = AsyncMock(return_value=httpx.Response(200, json={"data": [{"embedding": [1.0, 0.0]}]}))
    monkeypatch.setattr(httpx.AsyncClient, "post", post)
    vector = await OpenAIProvider("test-only", base_url="https://provider.invalid").generate_embedding("password=private-test-secret")
    assert vector == [1.0, 0.0]
    assert "private-test-secret" not in str(post.call_args.kwargs["json"])


async def test_production_diagnosis_schema_and_redaction_with_mock_http(monkeypatch):
    payload = {"problem_summary": "Missing dependency", "category": "Coding Error", "likely_causes": [
        {"title": "Wrong interpreter", "explanation": "Check the selected environment", "confidence": 0.7}], "confidence": 0.7}
    post = AsyncMock(return_value=httpx.Response(200, json={"choices": [{"message": {"content": json.dumps(payload)}}]}))
    monkeypatch.setattr(httpx.AsyncClient, "post", post)
    result, metrics = await OpenAIProvider("test-only", base_url="https://provider.invalid").analyze_problem(
        title="Python import failure", description="Missing dependency", category="Coding Error",
        environment={"config": "password=private-test-secret"}, evidence=[], grounded_facts=[])
    assert result.confidence == 0.7
    assert metrics.provider == "openai"
    request = post.call_args.kwargs["json"]
    assert "private-test-secret" not in str(request)
    assert "Required JSON schema" in request["messages"][0]["content"]


async def test_production_diagnosis_rejects_malformed_content(monkeypatch):
    post = AsyncMock(return_value=httpx.Response(200, json={"choices": [{"message": {"content": "private invalid response"}}]}))
    monkeypatch.setattr(httpx.AsyncClient, "post", post)
    with pytest.raises(APIError) as error:
        await OpenAIProvider("test-only", base_url="https://provider.invalid").analyze_problem(
            title="Test", description="Test", category="Coding Error", environment={}, evidence=[], grounded_facts=[])
    assert error.value.code == "VALIDATION_FAILED"
    assert "private invalid response" not in str(error.value)
