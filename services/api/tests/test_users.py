async def test_endpoints_require_auth(api):
    protected = [
        ("GET", "/api/v1/auth/me"),
        ("GET", "/api/v1/profile"),
        ("PATCH", "/api/v1/profile"),
        ("GET", "/api/v1/profile/stats"),
        ("POST", "/api/v1/cases"),
        ("GET", "/api/v1/cases"),
        ("GET", "/api/v1/cases/00000000-0000-0000-0000-000000000000"),
        ("POST", "/api/v1/cases/00000000-0000-0000-0000-000000000000/evidence"),
        ("GET", "/api/v1/cases/00000000-0000-0000-0000-000000000000/evidence"),
        ("POST", "/api/v1/cases/00000000-0000-0000-0000-000000000000/diagnose"),
        ("POST", "/api/v1/contributions"),
        ("GET", "/api/v1/contributions"),
        ("GET", "/api/v1/rewards/summary"),
        ("GET", "/api/v1/rewards/history"),
        ("GET", "/api/v1/reputation/me"),
        ("GET", "/api/v1/leaderboard"),
        ("GET", "/api/v1/notifications"),
        ("GET", "/api/v1/settings"),
        ("PATCH", "/api/v1/settings"),
        ("GET", "/api/v1/dashboard"),
        ("POST", "/api/v1/account/deletion-request"),
    ]
    for method, path in protected:
        resp = await api.client.request(method, path)
        assert resp.status_code == 401, f"{method} {path} -> {resp.status_code}"
        body = resp.json()
        assert body["error"]["code"] == "AUTH_REQUIRED", f"{method} {path}"


async def test_profile_auto_created_from_identity(api, alice):
    api.set_identity(alice)
    resp = await api.client.get("/api/v1/auth/me")
    assert resp.status_code == 200
    profile = resp.json()
    assert profile["id"] == alice.id
    assert profile["auth_user_id"] == alice.id
    assert profile["display_name"] == "Alice"
    assert profile["reputation_score"] == 0
    assert profile["reputation_level"] == "New Solver"


async def test_profile_auto_create_is_idempotent(api, alice):
    api.set_identity(alice)
    first = (await api.client.get("/api/v1/profile")).json()
    second = (await api.client.get("/api/v1/profile")).json()
    assert first["id"] == second["id"]
    assert first["created_at"] == second["created_at"]


async def test_two_users_are_isolated(api, alice, bob):
    api.set_identity(alice)
    alice_profile = (await api.client.get("/api/v1/profile")).json()
    api.set_identity(bob)
    bob_profile = (await api.client.get("/api/v1/profile")).json()
    assert alice_profile["id"] != bob_profile["id"]
    assert bob_profile["id"] == bob.id


async def test_settings_auto_created_with_defaults(api, alice):
    api.set_identity(alice)
    resp = await api.client.get("/api/v1/settings")
    assert resp.status_code == 200
    settings = resp.json()
    assert settings["user_id"] == alice.id
    assert settings["theme"] == "dark"
    assert settings["leaderboard_opt_in"] is False
    assert settings["email_notifications"] is True


async def test_patch_profile_updates_only_that_user(api, alice, bob):
    api.set_identity(alice)
    resp = await api.client.patch("/api/v1/profile", json={"display_name": "Alicia", "username": "alicia_93"})
    assert resp.status_code == 200
    assert resp.json()["display_name"] == "Alicia"
    assert resp.json()["username"] == "alicia_93"
    api.set_identity(bob)
    bob_profile = (await api.client.get("/api/v1/profile")).json()
    assert bob_profile["display_name"] == "Bob"
    assert bob_profile["username"] is None


async def test_patch_profile_invalid_username(api, alice):
    api.set_identity(alice)
    resp = await api.client.patch("/api/v1/profile", json={"username": "Bad Name!"})
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "VALIDATION_ERROR"


async def test_patch_profile_extra_fields_forbidden(api, alice):
    api.set_identity(alice)
    resp = await api.client.patch("/api/v1/profile", json={"display_name": "Alicia", "is_admin": True})
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "VALIDATION_ERROR"


async def test_profile_stats(api, alice):
    api.set_identity(alice)
    before = (await api.client.get("/api/v1/profile/stats")).json()
    assert before["total_cases"] == 0
    await api.create_case()
    stats = (await api.client.get("/api/v1/profile/stats")).json()
    assert stats["total_cases"] == 1
    assert stats["active_cases"] == 1
    assert stats["resolved_count"] == 0
    assert stats["verified_contributions"] == 0
    assert stats["reputation"] == 0


async def test_delete_account_request(api, alice):
    api.set_identity(alice)
    resp = await api.client.post("/api/v1/account/deletion-request", json={"confirmation": "DELETE MY ACCOUNT"})
    assert resp.status_code == 202
    first = resp.json()
    assert first["status"] == "pending"
    again = await api.client.post("/api/v1/account/deletion-request", json={"confirmation": "DELETE MY ACCOUNT"})
    assert again.status_code == 202
    assert again.json()["id"] == first["id"]


async def test_delete_account_requires_exact_confirmation(api, alice):
    api.set_identity(alice)
    resp = await api.client.post("/api/v1/account/deletion-request", json={"confirmation": "delete my account"})
    assert resp.status_code == 422