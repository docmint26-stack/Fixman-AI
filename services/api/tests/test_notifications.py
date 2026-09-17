async def test_notifications_created_on_create(api, alice):
    api.set_identity(alice)
    await api.create_case()
    resp = await api.client.get("/api/v1/notifications")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert body["unread"] == 1
    assert body["items"][0]["title"] == "Case created"


async def test_mark_read(api, alice):
    api.set_identity(alice)
    await api.create_case()
    listing = (await api.client.get("/api/v1/notifications")).json()
    notification_id = listing["items"][0]["id"]
    read = await api.client.patch(f"/api/v1/notifications/{notification_id}/read")
    assert read.status_code == 200
    assert read.json()["read_at"] is not None
    listing = (await api.client.get("/api/v1/notifications")).json()
    assert listing["unread"] == 0


async def test_read_all(api, alice):
    api.set_identity(alice)
    for i in range(3):
        await api.create_case(title=f"Bluetooth case number {i}", description=f"Description {i} for a notification test that is long enough for the field.")
    resp = await api.client.post("/api/v1/notifications/read-all")
    assert resp.status_code == 200
    listing = (await api.client.get("/api/v1/notifications")).json()
    assert listing["unread"] == 0


async def test_notification_isolation(api, alice, bob):
    api.set_identity(alice)
    await api.create_case()
    listing = (await api.client.get("/api/v1/notifications")).json()
    notification_id = listing["items"][0]["id"]
    api.set_identity(bob)
    assert (await api.client.patch(f"/api/v1/notifications/{notification_id}/read")).status_code == 404
    assert (await api.client.get("/api/v1/notifications")).json()["total"] == 0