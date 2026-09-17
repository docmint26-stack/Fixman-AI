async def test_diagnose_returns_honest_unavailable_status(api, alice):
    api.set_identity(alice)
    case = await api.create_case()
    resp = await api.client.post(f"/api/v1/cases/{case['id']}/diagnose")
    assert resp.status_code == 201, resp.text
    run = resp.json()
    assert run["status"] == "unavailable"
    assert run["model_provider"] == "unconfigured"
    assert run["analysis_metadata"]["code"] == "AI_PROVIDER_NOT_CONFIGURED"
    assert run["problem_summary"] is None
    assert run["input_snapshot"]["title"] == case["title"]
    detail = (await api.client.get(f"/api/v1/cases/{case['id']}")).json()
    assert detail["status"] == "needs_review"
    assert detail["current_diagnosis_id"] == run["id"]


async def test_failed_diagnosis_can_retry_existing_case(api, alice):
    api.set_identity(alice)
    case = await api.create_case()
    first = await api.client.post(f"/api/v1/cases/{case['id']}/diagnose")
    assert first.status_code == 201
    second = await api.client.post(f"/api/v1/cases/{case['id']}/diagnose")
    assert second.status_code == 201
    assert second.json()["status"] == "unavailable"
    assert second.json()["id"] != first.json()["id"]


async def test_diagnose_development_provider(api, alice, monkeypatch):
    from app.core.config import get_settings

    settings = get_settings()
    monkeypatch.setattr(settings, "app_env", "development")
    monkeypatch.setattr(settings, "ai_provider", "development_deterministic")
    api.set_identity(alice)
    case = await api.create_case()
    resp = await api.client.post(f"/api/v1/cases/{case['id']}/diagnose")
    assert resp.status_code == 201
    run = resp.json()
    assert run["status"] == "completed"
    assert run["model_provider"] == "development_deterministic"
    assert run["problem_summary"] == case["description"]
    assert "Development fixture" in run["analysis_metadata"]["message"]


async def test_diagnoses_list_and_detail(api, alice):
    api.set_identity(alice)
    case = await api.create_case()
    await api.client.post(f"/api/v1/cases/{case['id']}/diagnose")
    listing = (await api.client.get(f"/api/v1/cases/{case['id']}/diagnoses")).json()
    assert listing["total"] == 1
    run_id = listing["items"][0]["id"]
    detail = await api.client.get(f"/api/v1/diagnoses/{run_id}")
    assert detail.status_code == 200
    assert detail.json()["id"] == run_id


async def test_diagnosis_isolation(api, alice, bob):
    api.set_identity(alice)
    case = await api.create_case()
    await api.client.post(f"/api/v1/cases/{case['id']}/diagnose")
    listing = (await api.client.get(f"/api/v1/cases/{case['id']}/diagnoses")).json()
    run_id = listing["items"][0]["id"]
    api.set_identity(bob)
    assert (await api.client.get(f"/api/v1/diagnoses/{run_id}")).status_code == 404
    assert (await api.client.post(f"/api/v1/cases/{case['id']}/diagnose")).status_code == 404


async def test_daily_ai_limit_is_enforced(api, alice, monkeypatch):
    from app.core.config import get_settings
    monkeypatch.setattr(get_settings(), "ai_rate_limit_per_day", 1)
    api.set_identity(alice)
    first = await api.create_case()
    assert (await api.client.post(f"/api/v1/cases/{first['id']}/diagnose")).status_code == 201
    second = await api.create_case()
    response = await api.client.post(f"/api/v1/cases/{second['id']}/diagnose")
    assert response.status_code == 429
    assert response.json()["error"]["code"] == "AI_PROVIDER_RATE_LIMIT"
