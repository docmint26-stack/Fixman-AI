from app.core.config import get_settings


async def test_error_envelope_shape(api, alice, bob):
    api.set_identity(alice)
    case = await api.create_case()
    api.set_identity(bob)
    resp = await api.client.get(f"/api/v1/cases/{case['id']}")
    assert resp.status_code == 404
    body = resp.json()
    assert set(body.keys()) == {"error"}
    assert set(body["error"].keys()) == {"code", "message", "details"}
    assert body["error"]["code"] == "NOT_FOUND"


async def test_validation_error_never_echoes_input(api, alice):
    api.set_identity(alice)
    payload = {
        "title": "Extra fields are rejected",
        "description": "This description is long enough to pass validation for the field.",
        "category": "Coding Error",
        "secret_forged_flag": {"__proto__": "polluted"},
        "user_id": "injected-token",
    }
    resp = await api.client.post("/api/v1/cases", json=payload)
    assert resp.status_code == 422
    text = resp.text
    assert "__proto__" not in text
    assert "injected-token" not in text
    details = resp.json()["error"]["details"]
    assert all("field" in d and "message" in d for d in details)


async def test_malformed_json_is_validation_error(api, alice):
    api.set_identity(alice)
    resp = await api.client.post("/api/v1/cases", content="{this is not json", headers={"content-type": "application/json"})
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "VALIDATION_ERROR"


async def test_rate_limit_post_burst(api, alice):
    api.set_identity(alice)
    responses = []
    for i in range(61):
        resp = await api.client.post(
            "/api/v1/cases",
            json={"title": f"Rate limit burst case {i:03d}", "description": "A very long description for a rate limit test that easily clears validation.", "category": "Coding Error"},
        )
        responses.append(resp.status_code)
    assert responses.count(429) >= 1
    assert responses[:60].count(429) == 0
    assert responses[-1] == 429


async def test_request_too_large(api, alice, monkeypatch):
    monkeypatch.setattr(get_settings(), "max_upload_mb", 1)
    api.set_identity(alice)
    resp = await api.client.post("/api/v1/cases", content=b"x" * (2 * 1024 * 1024 + 1), headers={"content-type": "application/json"})
    assert resp.status_code == 413
    assert resp.json()["error"]["code"] == "REQUEST_TOO_LARGE"