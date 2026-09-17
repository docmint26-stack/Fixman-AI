from app.db.session import Session
from app.services.workflows import accept_outcome


async def test_leaderboard_excludes_opt_out(api, alice, bob):
    api.set_identity(alice)
    case = await api.make_scenario()
    await api.client.patch("/api/v1/settings", json={"leaderboard_opt_in": True})
    async with Session() as db:
        await accept_outcome(db, case["outcome"]["id"])
        await db.commit()
    api.set_identity(bob)
    resp = await api.client.get("/api/v1/leaderboard")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    entry = body["items"][0]
    assert entry["reputation"] == 20
    assert entry["rank"] == 1
    assert entry["verified_outcomes"] == 1
    assert entry["badge"] == "New Solver"
    assert entry["is_current_user"] is False
    assert body["current_user_rank"] is None


async def test_leaderboard_includes_opted_in_zero(api, alice, bob):
    api.set_identity(alice)
    await api.client.patch("/api/v1/settings", json={"leaderboard_opt_in": True})
    api.set_identity(bob)
    resp = await api.client.get("/api/v1/leaderboard?period=all_time")
    assert resp.status_code == 200
    body = resp.json()
    ids = [entry["id"] for entry in body["items"]]
    assert alice.id in ids
    assert bob.id not in ids


async def test_leaderboard_current_user_flag(api, alice):
    api.set_identity(alice)
    await api.client.patch("/api/v1/settings", json={"leaderboard_opt_in": True})
    case = await api.make_scenario()
    async with Session() as db:
        await accept_outcome(db, case["outcome"]["id"])
        await db.commit()
    resp = await api.client.get("/api/v1/leaderboard")
    entry = resp.json()["items"][0]
    assert entry["id"] == alice.id
    assert entry["is_current_user"] is True