async def test_reward_summary_empty(api, alice):
    api.set_identity(alice)
    summary = (await api.client.get("/api/v1/rewards/summary")).json()
    assert summary == {"balance": 0, "pending": 0, "claimable": 0, "lifetime_earned": 0, "royalty_earned": 0, "staked_or_reserved": 0}


async def test_reward_summary_after_acceptance(api, alice):
    api.set_identity(alice)
    case = await api.make_scenario()
    from app.db.session import Session
    from app.services.workflows import accept_outcome

    async with Session() as db:
        await accept_outcome(db, case["outcome"]["id"])
        await db.commit()
    summary = (await api.client.get("/api/v1/rewards/summary")).json()
    assert summary["balance"] == 0
    assert summary["claimable"] == 8
    assert summary["lifetime_earned"] == 8
    assert summary["royalty_earned"] == 0
    assert summary["staked_or_reserved"] == 0
    history = (await api.client.get("/api/v1/rewards/history")).json()
    assert history["total"] == 1
    assert history["items"][0]["event_type"] == "verified_outcome"
    assert history["items"][0]["status"] == "claimable"
    claimable = (await api.client.get("/api/v1/rewards/claimable")).json()
    assert claimable["total"] == 1


async def test_reputation_endpoints(api, alice):
    api.set_identity(alice)
    me = (await api.client.get("/api/v1/reputation/me")).json()
    assert me == {"score": 0, "level": "New Solver"}
    case = await api.make_scenario()
    from app.db.session import Session
    from app.services.workflows import accept_outcome

    async with Session() as db:
        await accept_outcome(db, case["outcome"]["id"])
        await db.commit()
    me = (await api.client.get("/api/v1/reputation/me")).json()
    assert me["score"] == 20
    assert me["level"] == "New Solver"
    history = (await api.client.get("/api/v1/reputation/history")).json()
    assert history["total"] == 1
    assert history["items"][0]["points"] == 20


async def test_rewards_isolated_between_users(api, alice, bob):
    api.set_identity(alice)
    case = await api.make_scenario()
    from app.db.session import Session
    from app.services.workflows import accept_outcome

    async with Session() as db:
        await accept_outcome(db, case["outcome"]["id"])
        await db.commit()
    api.set_identity(bob)
    summary = (await api.client.get("/api/v1/rewards/summary")).json()
    assert summary["claimable"] == 0
    assert (await api.client.get("/api/v1/rewards/history")).json()["total"] == 0