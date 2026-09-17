async def test_evidence_requires_content(api, alice):
    api.set_identity(alice)
    case = await api.create_case()
    resp = await api.client.post(f"/api/v1/cases/{case['id']}/evidence", data={"evidence_type": "log"})
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "EMPTY_EVIDENCE"


async def test_text_evidence(api, alice):
    api.set_identity(alice)
    case = await api.create_case()
    resp = await api.client.post(f"/api/v1/cases/{case['id']}/evidence", data={"evidence_type": "log", "text_content": "error: connection reset by peer"})
    assert resp.status_code == 201, resp.text
    evidence = resp.json()
    assert evidence["evidence_type"] == "log"
    assert evidence["text_content"] == "error: connection reset by peer"
    assert evidence["file_path"] is None
    listing = (await api.client.get(f"/api/v1/cases/{case['id']}/evidence")).json()
    assert listing["total"] == 1
    detail = (await api.client.get(f"/api/v1/cases/{case['id']}")).json()
    assert len(detail["evidence"]) == 1


async def test_evidence_type_must_be_valid(api, alice):
    api.set_identity(alice)
    case = await api.create_case()
    resp = await api.client.post(f"/api/v1/cases/{case['id']}/evidence", data={"evidence_type": "movie", "text_content": "nope"})
    assert resp.status_code == 422


async def test_text_evidence_too_large(api, alice):
    api.set_identity(alice)
    case = await api.create_case()
    resp = await api.client.post(f"/api/v1/cases/{case['id']}/evidence", data={"evidence_type": "log", "text_content": "x" * 100001})
    assert resp.status_code == 422


async def test_download_text_evidence(api, alice):
    api.set_identity(alice)
    case = await api.create_case()
    resp = await api.client.post(f"/api/v1/cases/{case['id']}/evidence", data={"evidence_type": "output", "text_content": "exit code 1"})
    evidence_id = resp.json()["id"]
    dl = await api.client.get(f"/api/v1/evidence/{evidence_id}/download")
    assert dl.status_code == 200
    assert dl.json()["text_content"] == "exit code 1"


async def test_evidence_download_isolation(api, alice, bob):
    api.set_identity(alice)
    case = await api.create_case()
    resp = await api.client.post(f"/api/v1/cases/{case['id']}/evidence", data={"evidence_type": "output", "text_content": "exit code 1"})
    evidence_id = resp.json()["id"]
    api.set_identity(bob)
    dl = await api.client.get(f"/api/v1/evidence/{evidence_id}/download")
    assert dl.status_code == 404
    deleted = await api.client.request("DELETE", f"/api/v1/evidence/{evidence_id}")
    assert deleted.status_code == 404


async def test_file_upload_ok(api, alice):
    api.set_identity(alice)
    api.set_storage(api.fake_storage)
    case = await api.create_case()
    resp = await api.client.post(
        f"/api/v1/cases/{case['id']}/evidence",
        data={"evidence_type": "log"},
        files={"file": ("trace.log", b"line one\nline two", "text/plain")},
    )
    assert resp.status_code == 201, resp.text
    evidence = resp.json()
    assert evidence["file_path"].startswith(f"users/{case['user_id']}/cases/{case['id']}/")
    assert evidence["mime_type"] == "text/plain"
    assert evidence["size_bytes"] == 17
    assert evidence["original_filename"] == "trace.log"
    assert len(api.fake_storage.paths) == 1


async def test_file_upload_png_magic_bytes(api, alice):
    api.set_identity(alice)
    api.set_storage(api.fake_storage)
    case = await api.create_case()
    resp = await api.client.post(
        f"/api/v1/cases/{case['id']}/evidence",
        data={"evidence_type": "screenshot"},
        files={"file": ("shot.png", b"this is not a real png at all!", "image/png")},
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "INVALID_FILE"


async def test_file_upload_png_ok(api, alice):
    api.set_identity(alice)
    api.set_storage(api.fake_storage)
    case = await api.create_case()
    png = b"\x89PNG\r\n\x1a\n" + b"payload"
    resp = await api.client.post(
        f"/api/v1/cases/{case['id']}/evidence",
        data={"evidence_type": "screenshot"},
        files={"file": ("shot.png", png, "image/png")},
    )
    assert resp.status_code == 201
    dl = await api.client.get(f"/api/v1/evidence/{resp.json()['id']}/download")
    assert dl.json()["url"].startswith("https://storage.example/")
    assert dl.json()["expires_in"] == 60


async def test_file_upload_unsupported_extension(api, alice):
    api.set_identity(alice)
    api.set_storage(api.fake_storage)
    case = await api.create_case()
    resp = await api.client.post(
        f"/api/v1/cases/{case['id']}/evidence",
        data={"evidence_type": "document"},
        files={"file": ("malware.exe", b"MZ....", "application/octet-stream")},
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "UNSUPPORTED_FILE"


async def test_file_upload_wrong_mime_for_extension(api, alice):
    api.set_identity(alice)
    api.set_storage(api.fake_storage)
    case = await api.create_case()
    resp = await api.client.post(
        f"/api/v1/cases/{case['id']}/evidence",
        data={"evidence_type": "log"},
        files={"file": ("trace.txt", b"hello", "image/png")},
    )
    assert resp.status_code == 422


async def test_file_upload_invalid_utf8(api, alice):
    api.set_identity(alice)
    api.set_storage(api.fake_storage)
    case = await api.create_case()
    resp = await api.client.post(
        f"/api/v1/cases/{case['id']}/evidence",
        data={"evidence_type": "log"},
        files={"file": ("trace.log", b"\xff\xfe\x00 broken", "text/plain")},
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "INVALID_FILE"


async def test_file_upload_over_limit(api, alice, monkeypatch):
    from app.core.config import get_settings

    monkeypatch.setattr(get_settings(), "max_upload_mb", 1)
    api.set_identity(alice)
    api.set_storage(api.fake_storage)
    case = await api.create_case()
    resp = await api.client.post(
        f"/api/v1/cases/{case['id']}/evidence",
        data={"evidence_type": "log"},
        files={"file": ("big.log", b"a" * (1024 * 1024 + 1), "text/plain")},
    )
    assert resp.status_code == 413
    assert resp.json()["error"]["code"] == "FILE_SIZE"


async def test_delete_evidence(api, alice):
    api.set_identity(alice)
    api.set_storage(api.fake_storage)
    case = await api.create_case()
    resp = await api.client.post(
        f"/api/v1/cases/{case['id']}/evidence",
        data={"evidence_type": "log"},
        files={"file": ("trace.log", b"hello world", "text/plain")},
    )
    evidence_id = resp.json()["id"]
    deleted = await api.client.request("DELETE", f"/api/v1/evidence/{evidence_id}")
    assert deleted.status_code == 200
    listing = (await api.client.get(f"/api/v1/cases/{case['id']}/evidence")).json()
    assert listing["total"] == 0