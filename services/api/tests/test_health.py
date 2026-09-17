from httpx import ASGITransport, AsyncClient

from app.main import app


async def test_health_ok(migrated_db):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        resp = await client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["database"] == "connected"
    assert body["environment"] == "development"


async def test_security_headers(migrated_db):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        resp = await client.get("/health")
    assert resp.headers.get("x-content-type-options") == "nosniff"
    assert resp.headers.get("cache-control") == "no-store"


async def test_unknown_route_is_not_found(migrated_db):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        resp = await client.get("/api/v1/does-not-exist")
    assert resp.status_code == 404