import jwt
import pytest

import app.core.security as security
from app.core.config import get_settings
from app.core.exceptions import APIError


class FakeKey:
    def __init__(self, *_args, **_kwargs):
        self.key = "fake-key"

    def get_signing_key_from_jwt(self, _token):
        return self


def fake_jwks(*_args, **_kwargs):
    return FakeKey()


def test_verify_token_not_configured(monkeypatch):
    monkeypatch.setattr(get_settings(), "supabase_url", "")
    with pytest.raises(APIError) as exc:
        security.verify_token("any-token")
    assert exc.value.status == 503
    assert exc.value.code == "AUTH_NOT_CONFIGURED"


def test_verify_token_jwks_failure(monkeypatch):
    monkeypatch.setattr(get_settings(), "supabase_url", "https://project.supabase.co")

    def boom(_):
        raise jwt.InvalidTokenError("no jwks")

    monkeypatch.setattr(security, "jwks_client", boom)
    with pytest.raises(APIError) as exc:
        security.verify_token("any-token")
    assert exc.value.status == 401
    assert exc.value.code == "INVALID_TOKEN"


def test_verify_token_expired(monkeypatch):
    monkeypatch.setattr(get_settings(), "supabase_url", "https://project.supabase.co")
    monkeypatch.setattr(security, "jwks_client", fake_jwks)
    monkeypatch.setattr(security.jwt, "decode", lambda *a, **k: _raise(jwt.ExpiredSignatureError("expired")))
    with pytest.raises(APIError) as exc:
        security.verify_token("expired-token")
    assert exc.value.status == 401
    assert exc.value.code == "INVALID_TOKEN"


def test_verify_token_bad_signature(monkeypatch):
    monkeypatch.setattr(get_settings(), "supabase_url", "https://project.supabase.co")
    monkeypatch.setattr(security, "jwks_client", fake_jwks)
    monkeypatch.setattr(security.jwt, "decode", lambda *a, **k: _raise(jwt.InvalidSignatureError()))
    with pytest.raises(APIError) as exc:
        security.verify_token("bad-signature")
    assert exc.value.status == 401
    assert exc.value.code == "INVALID_TOKEN"


def test_verify_token_wrong_role(monkeypatch):
    monkeypatch.setattr(get_settings(), "supabase_url", "https://project.supabase.co")
    monkeypatch.setattr(security, "jwks_client", fake_jwks)
    monkeypatch.setattr(security.jwt, "decode", lambda *a, **k: {"sub": "bec045d4-51e6-42c2-9e89-c6a17d1373c8", "role": "anon", "aud": "authenticated", "iss": "https://project.supabase.co/auth/v1", "exp": 9999999999, "iat": 1})
    with pytest.raises(APIError) as exc:
        security.verify_token("anon-token")
    assert exc.value.status == 401
    assert exc.value.code == "INVALID_TOKEN"


def test_verify_token_missing_sub(monkeypatch):
    monkeypatch.setattr(get_settings(), "supabase_url", "https://project.supabase.co")
    monkeypatch.setattr(security, "jwks_client", fake_jwks)
    monkeypatch.setattr(security.jwt, "decode", lambda *a, **k: {"role": "authenticated", "aud": "authenticated", "iss": "https://project.supabase.co/auth/v1", "exp": 9999999999, "iat": 1})
    with pytest.raises(APIError) as exc:
        security.verify_token("no-sub-token")
    assert exc.value.status == 401
    assert exc.value.code == "INVALID_TOKEN"


def test_verify_token_happy_path(monkeypatch):
    monkeypatch.setattr(get_settings(), "supabase_url", "https://project.supabase.co")
    monkeypatch.setattr(security, "jwks_client", fake_jwks)
    monkeypatch.setattr(
        security.jwt,
        "decode",
        lambda *a, **k: {
            "sub": "bec045d4-51e6-42c2-9e89-c6a17d1373c8",
            "role": "authenticated",
            "email": "alice@example.com",
            "user_metadata": {"display_name": "Alice"},
            "aud": "authenticated",
            "iss": "https://project.supabase.co/auth/v1",
            "exp": 9999999999,
            "iat": 1,
        },
    )
    identity = security.verify_token("good-token")
    assert identity.id == "bec045d4-51e6-42c2-9e89-c6a17d1373c8"
    assert identity.email == "alice@example.com"
    assert identity.display_name == "Alice"


def _raise(exc):
    raise exc