async def test_dashboard_empty(api, alice):
    api.set_identity(alice)
    resp = await api.client.get("/api/v1/dashboard")
    assert resp.status_code == 200
    body = resp.json()
    assert body["profile"]["id"] == alice.id
    assert body["stats"]["total_cases"] == 0
    assert body["rewards"]["claimable"] == 0
    assert body["recent_cases"]["items"] == []
    assert body["recent_contributions"]["items"] == []
    assert body["notifications"]["unread"] == 0
    assert "leaderboard" in body


async def test_dashboard_reflects_activity(api, alice):
    api.set_identity(alice)
    case = await api.make_scenario()
    await api.client.post(
        "/api/v1/contributions",
        json={"title": "A contribution title", "description": "A description that is long enough for the review pipeline.", "case_id": case["case"]["id"]},
    )
    from app.db.session import Session
    from app.services.workflows import accept_outcome

    async with Session() as db:
        await accept_outcome(db, case["outcome"]["id"])
        await db.commit()
    body = (await api.client.get("/api/v1/dashboard")).json()
    assert body["stats"]["total_cases"] == 1
    assert body["stats"]["active_cases"] == 0
    assert body["stats"]["resolved_count"] == 1
    assert body["stats"]["reputation"] == 20
    assert body["rewards"]["claimable"] == 8
    assert body["recent_cases"]["total"] == 1
    assert body["recent_contributions"]["total"] == 1
    assert body["notifications"]["unread"] >= 1