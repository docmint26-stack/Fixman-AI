async def test_create_case(api, alice):
    api.set_identity(alice)
    case = await api.create_case()
    assert case["id"]
    assert case["status"] == "submitted"
    assert case["category"] == "Hardware & Devices"
    assert case["severity"] == "medium"
    assert case["user_id"] == alice.id


async def test_create_case_validation(api, alice):
    api.set_identity(alice)
    cases = [
        {"title": "short", "description": "A description that is comfortably long enough to pass validation here.", "category": "Coding Error"},
        {"title": "A perfectly valid case title", "description": "This description is still way before the minimum length", "category": "Not a Real Category"},
        {"title": "Extra fields are rejected here", "description": "This description is long enough to satisfy the minimum length rule.", "category": "Coding Error", "user_id": "forged-id"},
    ]
    for body in cases:
        resp = await api.client.post("/api/v1/cases", json=body)
        assert resp.status_code == 422, resp.text
        assert resp.json()["error"]["code"] == "VALIDATION_ERROR"


async def test_list_cases_paginated(api, alice):
    api.set_identity(alice)
    for i in range(25):
        await api.create_case(title=f"Bluetooth trouble {i:02d}", description=f"A detailed description number {i:02d} that is long enough for validation.", category="Hardware & Devices")
    resp = await api.client.get("/api/v1/cases?page=1&page_size=10")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 25
    assert len(body["items"]) == 10
    assert body["has_more"] is True
    page2 = (await api.client.get("/api/v1/cases?page=3&page_size=10")).json()
    assert len(page2["items"]) == 5
    assert page2["has_more"] is False


async def test_filter_and_search_cases(api, alice):
    api.set_identity(alice)
    await api.create_case(title="Wifi drops at home", description="The wi-fi network disconnects every evening for a few minutes.", category="Network & Wi-Fi")
    await api.create_case(title="Printer offline", description="The office printer cannot be discovered over the local network.", category="Hardware & Devices")
    r = await api.client.get("/api/v1/cases?category=Network%20%26%20Wi-Fi")
    assert r.json()["total"] == 1
    r = await api.client.get("/api/v1/cases?search=printer")
    assert r.json()["total"] == 1
    r = await api.client.get("/api/v1/cases?sort=oldest")
    assert r.json()["items"][0]["title"] == "Wifi drops at home"


async def test_case_visibility_isolation(api, alice, bob):
    api.set_identity(alice)
    case = await api.create_case()
    api.set_identity(bob)
    resp = await api.client.get(f"/api/v1/cases/{case['id']}")
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "NOT_FOUND"
    api.set_identity(bob)
    listing = (await api.client.get("/api/v1/cases")).json()
    assert listing["total"] == 0


async def test_case_detail_includes_nested_collections(api, alice):
    api.set_identity(alice)
    case = await api.create_case()
    detail = (await api.client.get(f"/api/v1/cases/{case['id']}")).json()
    for key in ["evidence", "diagnoses", "attempts", "outcomes", "recommendations", "rewards"]:
        assert key in detail
    assert detail["evidence"] == []
    assert detail["diagnoses"] == []


async def test_patch_case_fields(api, alice):
    api.set_identity(alice)
    case = await api.create_case(title="Original title", description="The original description which is definitely long enough to pass validation.")
    resp = await api.client.patch(f"/api/v1/cases/{case['id']}", json={"title": "An updated and longer title", "description": "An updated description that is still long enough for the database column."})
    assert resp.status_code == 200
    assert resp.json()["title"] == "An updated and longer title"


async def test_patch_case_status_transition_invalid(api, alice):
    api.set_identity(alice)
    case = await api.create_case()
    resp = await api.client.patch(f"/api/v1/cases/{case['id']}", json={"status": "submitted"})
    assert resp.status_code == 409
    assert resp.json()["error"]["code"] == "INVALID_TRANSITION"


async def test_delete_case_cascades(api, alice):
    api.set_identity(alice)
    case = await api.create_case()
    await api.client.post(f"/api/v1/cases/{case['id']}/evidence", data={"evidence_type": "log", "text_content": "error: connection reset by peer"})
    resp = await api.client.request("DELETE", f"/api/v1/cases/{case['id']}")
    assert resp.status_code == 200
    assert resp.json()["deleted"] is True
    assert (await api.client.get("/api/v1/cases")).json()["total"] == 0
    missing = await api.client.get(f"/api/v1/cases/{case['id']}")
    assert missing.status_code == 404


async def test_cannot_delete_others_case(api, alice, bob):
    api.set_identity(alice)
    case = await api.create_case()
    api.set_identity(bob)
    resp = await api.client.request("DELETE", f"/api/v1/cases/{case['id']}")
    assert resp.status_code == 404