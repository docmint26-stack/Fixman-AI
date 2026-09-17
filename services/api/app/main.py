import logging
import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.api.routes import router
from app.core.config import get_settings
from app.core.exceptions import APIError
from app.db.session import Session, engine

logger = logging.getLogger("puvexa")
settings = get_settings()


@asynccontextmanager
async def lifespan(app):
    if settings.app_env == "production" and (not settings.database_url.startswith("postgresql") or not settings.supabase_url or "*" in settings.cors_origins):
        raise RuntimeError("Production requires PostgreSQL, Supabase authentication, and explicit CORS origins.")
    yield
    await engine.dispose()


app = FastAPI(title="Puvexa API", version="0.3.0", lifespan=lifespan, docs_url="/docs" if settings.app_env != "production" else None, redoc_url=None)
app.add_middleware(CORSMiddleware, allow_origins=[x.strip() for x in settings.cors_origins.split(",")], allow_methods=["GET", "POST", "PATCH", "DELETE"], allow_headers=["Authorization", "Content-Type"], allow_credentials=False)


def error(status, code, message, details=None):
    return JSONResponse(status_code=status, content={"error": {"code": code, "message": message, "details": details}})


@app.exception_handler(APIError)
async def api_error(request, exc):
    return error(exc.status, exc.code, exc.message)


@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    # Never echo raw input values, tokens, or evidence in validation errors.
    return error(422, "VALIDATION_ERROR", "Check the submitted fields.", [{"field": ".".join(str(x) for x in e["loc"]), "message": e["msg"]} for e in exc.errors()])


@app.exception_handler(IntegrityError)
async def conflict_error(request, exc):
    return error(409, "CONFLICT", "This operation conflicts with an existing record.")


@app.exception_handler(Exception)
async def unexpected_error(request, exc):
    logger.error("request_failed", extra={"exception_type": type(exc).__name__})
    return error(500, "INTERNAL_ERROR", "The request could not be completed.")


limits = defaultdict(deque)


@app.middleware("http")
async def rate_limit(request: Request, call_next):
    # Single-process baseline. Deploy a gateway limit before using multiple replicas.
    if request.method == "POST":
        key = request.client.host if request.client else "unknown"
        current = time.monotonic()
        if len(limits) > 10000:
            for stale in list(limits):
                if not limits[stale] or limits[stale][-1] < current - 60:
                    del limits[stale]
        bucket = limits[key]
        while bucket and bucket[0] < current - 60:
            bucket.popleft()
        if len(bucket) >= 60:
            return error(429, "RATE_LIMITED", "Too many requests. Try again in a minute.")
        bucket.append(current)
        size = request.headers.get("content-length", "0")
        if size.isdigit() and int(size) > (settings.max_upload_mb + 1) * 1024 * 1024:
            return error(413, "REQUEST_TOO_LARGE", "Request exceeds the upload limit.")
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/health")
async def health():
    try:
        async with Session() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "ok", "environment": settings.app_env, "database": "connected"}
    except Exception:
        return JSONResponse(status_code=503, content={"status": "degraded", "environment": settings.app_env, "database": "unavailable"})


app.include_router(router)
