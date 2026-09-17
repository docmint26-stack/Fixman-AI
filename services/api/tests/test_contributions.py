async def test_contribution_tasks_empty_by_default(api, alice):
    api.set_identity(alice)
    resp = await api.client.get("/api/v1/contributions/tasks")
    assert resp.status_code == 200
    assert resp.json()["items"] == []


async def test_submit_contribution(api, alice):
    api.set_identity(alice)
    body = {
        "contribution_type": "new_fix",
        "title": "Reinstall the Bluetooth driver stack",
        "description": "A step-by-step guide to roll back and reinstall the Bluetooth driver stack on Windows 11.",
        "evidence_summary": {"os": "Windows 11", "tags": ["bluetooth", "audio"]},
    }
    resp = await api.client.post("/api/v1/contributions", json=body)
    assert resp.status_code == 201, resp.text
    contribution = resp.json()
    assert contribution["status"] == "submitted"
    assert contribution["user_id"] == alice.id
    assert contribution["case_id"] is None
    listing = (await api.client.get("/api/v1/contributions")).json()
    assert listing["total"] == 1
    profile_listing = (await api.client.get("/api/v1/profile/contributions")).json()
    assert profile_listing["total"] == 1


async def test_submit_contribution_linked_to_own_case(api, alice):
    api.set_identity(alice)
    case = await api.create_case()
    body = {"title": "Verified fix contribution", "description": "This contribution is linked to a case the author owns for provenance.", "case_id": case["id"]}
    resp = await api.client.post("/api/v1/contributions", json=body)
    assert resp.status_code == 201
    assert resp.json()["case_id"] == case["id"]


async def test_contribution_case_isolation(api, alice, bob):
    api.set_identity(alice)
    case = await api.create_case()
    body = {"title": "Sneaky contribution", "description": "This must never link to a case the author does not own.", "case_id": case["id"]}
    api.set_identity(bob)
    resp = await api.client.post("/api/v1/contributions", json=body)
    assert resp.status_code == 404


async def test_contribution_validation(api, alice):
    api.set_identity(alice)
    for body in [
        {"title": "this title is short", "description": "x" * 10},
        {"title": "A fine title for a contribution", "description": "A perfectly good description here.", "contribution_type": "not_a_real_type"},
        {"title": "A fine title for a contribution", "description": "A perfectly good description here.", "extra": "forbidden"},
    ]:
        resp = await api.client.post("/api/v1/contributions", json=body)
        assert resp.status_code == 422, resp.text


async def test_patch_contribution(api, alice):
    api.set_identity(alice)
    resp = await api.client.post(
        "/api/v1/contributions",
        json={"title": "A contribution title", "description": "A description that is long enough for the review pipeline."},
    )
    contribution_id = resp.json()["id"]
    updated = await api.client.patch(f"/api/v1/contributions/{contribution_id}", json={"title": "An improved contribution title", "description": "A revised description that stays above the minimum length."})
    assert updated.status_code == 200
    assert updated.json()["title"] == "An improved contribution title"


async def test_patch_contribution_after_review_started(api, alice):
    api.set_identity(alice)
    resp = await api.client.post(
        "/api/v1/contributions",
        json={"title": "A contribution title", "description": "A description that is long enough for the review pipeline."},
    )
    contribution_id = resp.json()["id"]
    from sqlalchemy import update

    from app.db.models import Contribution
    from app.db.session import Session

    async with Session() as db:
        await db.execute(update(Contribution).where(Contribution.id == contribution_id).values(status="accepted"))
        await db.commit()
    updated = await api.client.patch(f"/api/v1/contributions/{contribution_id}", json={"title": "Too late now"})
    assert updated.status_code == 409
    assert updated.json()["error"]["code"] == "REVIEW_STARTED"


async def test_contribution_detail_and_status_filter(api, alice):
    api.set_identity(alice)
    for i in range(3):
        await api.client.post(
            "/api/v1/contributions",
            json={"title": f"Contribution number {i}", "description": f"Description for contribution number {i} that is long enough for validation."},
        )
    listing = (await api.client.get("/api/v1/contributions?status=submitted")).json()
    assert listing["total"] == 3
    one = await api.client.get(f"/api/v1/contributions/{listing['items'][0]['id']}")
    assert one.status_code == 200