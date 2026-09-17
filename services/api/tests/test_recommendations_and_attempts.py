async def test_seeded_curated_fixes_available(api, alice):
    api.set_identity(alice)
    resp = await api.client.get("/api/v1/cases/00000000-0000-0000-0000-000000000000/recommendations")
    assert resp.status_code == 404
    await api.create_case()
    listing = (await api.client.get("/api/v1/cases?page_size=1")).json()
    case_id = listing["items"][0]["id"]
    resp = await api.client.get(f"/api/v1/cases/{case_id}/recommendations")
    assert resp.status_code == 200
    assert resp.json() == []


async def test_get_curated_fix(api, alice):
    api.set_identity(alice)
    case = await api.make_scenario()
    resp = await api.client.get(f"/api/v1/fixes/{case['fix_id']}")
    assert resp.status_code == 200
    fix = resp.json()
    assert fix["source_type"] == "curated"
    assert fix["instructions"]


async def test_attempt_requires_recommended_fix(api, alice):
    api.set_identity(alice)
    case = await api.prepare_suggested(diagnose=False)
    for fix in ["00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000002"]:
        resp = await api.client.post(f"/api/v1/cases/{case['case']['id']}/attempts", json={"fix_id": fix})
        assert resp.status_code == 422
        assert resp.json()["error"]["code"] == "FIX_NOT_RECOMMENDED"


async def test_start_attempt_transitions_case(api, alice):
    api.set_identity(alice)
    case = await api.prepare_suggested(diagnose=False)
    resp = await api.client.post(f"/api/v1/cases/{case['case']['id']}/attempts", json={"fix_id": case["fix_id"]})
    assert resp.status_code == 201
    attempt = resp.json()
    assert attempt["status"] == "started"
    assert attempt["case_id"] == case["case"]["id"]
    detail = (await api.client.get(f"/api/v1/cases/{case['case']['id']}")).json()
    assert detail["status"] == "applied"


async def test_patch_attempt(api, alice):
    api.set_identity(alice)
    case = await api.prepare_suggested(diagnose=False)
    resp = await api.client.post(f"/api/v1/cases/{case['case']['id']}/attempts", json={"fix_id": case["fix_id"]})
    attempt_id = resp.json()["id"]
    updated = await api.client.patch(f"/api/v1/attempts/{attempt_id}", json={"notes": "rolled back the driver", "steps_done": 3})
    assert updated.status_code == 200
    assert updated.json()["steps_done"] == 3
    assert updated.json()["notes"] == "rolled back the driver"


async def test_patch_attempt_after_completion(api, alice):
    api.set_identity(alice)
    case = await api.make_scenario()
    updated = await api.client.patch(f"/api/v1/attempts/{case['attempt_id']}", json={"steps_done": 1})
    assert updated.status_code == 409
    assert updated.json()["error"]["code"] == "ATTEMPT_COMPLETE"


async def test_attempt_isolation(api, alice, bob):
    api.set_identity(alice)
    case = await api.prepare_suggested(diagnose=False)
    resp = await api.client.post(f"/api/v1/cases/{case['case']['id']}/attempts", json={"fix_id": case["fix_id"]})
    attempt_id = resp.json()["id"]
    api.set_identity(bob)
    resp = await api.client.patch(f"/api/v1/attempts/{attempt_id}", json={"notes": "nope"})
    assert resp.status_code == 404