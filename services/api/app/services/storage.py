from pathlib import PurePath
from uuid import uuid4

import httpx

from app.core.config import get_settings
from app.core.exceptions import APIError

ALLOWED = {".png": {"image/png"}, ".jpg": {"image/jpeg"}, ".jpeg": {"image/jpeg"}, ".webp": {"image/webp"}, ".txt": {"text/plain"}, ".log": {"text/plain", "application/octet-stream"}, ".json": {"application/json", "text/plain"}, ".py": {"text/plain", "application/octet-stream"}, ".js": {"text/plain", "text/javascript", "application/javascript"}, ".ts": {"text/plain", "application/octet-stream"}, ".csv": {"text/csv", "text/plain"}}


async def read_upload(file):
    settings = get_settings()
    filename = (file.filename or "evidence.txt").replace("\\", "/").split("/")[-1]
    extension = PurePath(filename).suffix.lower()
    if extension not in ALLOWED or file.content_type not in ALLOWED[extension]:
        raise APIError(422, "UNSUPPORTED_FILE", "Use PNG, JPEG, WebP, or a supported plain text file.")
    content = await file.read(settings.max_upload_mb * 1024 * 1024 + 1)
    if not content or len(content) > settings.max_upload_mb * 1024 * 1024:
        raise APIError(413, "FILE_SIZE", "File is empty or exceeds the upload limit.")
    signatures = {".png": content.startswith(b"\x89PNG\r\n\x1a\n"), ".jpg": content.startswith(b"\xff\xd8\xff"), ".jpeg": content.startswith(b"\xff\xd8\xff"), ".webp": content.startswith(b"RIFF") and content[8:12] == b"WEBP"}
    if extension in signatures and not signatures[extension]:
        raise APIError(422, "INVALID_FILE", "File contents do not match its image type.")
    if extension not in signatures:
        try:
            content.decode("utf-8")
        except UnicodeDecodeError:
            raise APIError(422, "INVALID_FILE", "Text evidence must use UTF-8 encoding.") from None
    return filename[:200], extension, content


class SupabaseStorage:
    async def request(self, method, path, **kwargs):
        settings = get_settings()
        if not settings.supabase_url or not settings.supabase_service_role_key:
            raise APIError(503, "STORAGE_NOT_CONFIGURED", "Private evidence storage is not configured yet.")
        headers = {"Authorization": f"Bearer {settings.supabase_service_role_key}", "apikey": settings.supabase_service_role_key, **kwargs.pop("headers", {})}
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.request(method, settings.supabase_url.rstrip("/") + "/storage/v1/" + path, headers=headers, **kwargs)
        if response.is_error:
            raise APIError(502, "STORAGE_UNAVAILABLE", "Private storage could not complete this request.")
        return response

    async def upload(self, user_id, case_id, extension, content, mime):
        path = f"users/{user_id}/cases/{case_id}/{uuid4()}{extension}"
        bucket = get_settings().supabase_storage_bucket_evidence
        await self.request("POST", f"object/{bucket}/{path}", content=content, headers={"Content-Type": mime, "x-upsert": "false"})
        return path

    async def signed_url(self, path):
        settings = get_settings()
        response = await self.request("POST", f"object/sign/{settings.supabase_storage_bucket_evidence}/{path}", json={"expiresIn": 60})
        return settings.supabase_url.rstrip("/") + "/storage/v1" + response.json()["signedURL"]

    async def delete(self, paths):
        if paths:
            await self.request("DELETE", f"object/{get_settings().supabase_storage_bucket_evidence}", json={"prefixes": paths})


def get_storage():
    return SupabaseStorage()
