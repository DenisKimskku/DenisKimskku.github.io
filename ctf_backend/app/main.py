import json
import logging
import os
import sqlite3
import sys
import time
import uuid

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.routes import limiter, router
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# One limiter, shared with routes.py. Two separate Limiter objects meant the
# X-RateLimit-* headers reported counters that were not the ones being enforced.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

_PROD_ORIGINS = [
    "https://deniskim1.com",
    "https://www.deniskim1.com",
    "https://ctf.deniskim1.com",
    "https://deniskimskku.github.io",
]
# Dev origins shipped in production alongside allow_credentials=True and a
# SameSite=None cookie: any page served from localhost:3000 could make
# credentialed calls and read the visitor's session_id from /api/status.
_DEV_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]

origins = _PROD_ORIGINS + (_DEV_ORIGINS if os.getenv("CTF_DEV_MODE") == "1" else [])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-Session-ID"],
    max_age=600,
)

# NOT logging.basicConfig(): it is a no-op once handlers exist, and uvicorn
# installs its own logging config that gives the ROOT logger no handler. Records
# from "ctf.*" therefore propagated to a handler-less root and fell through to
# logging.lastResort, which is WARNING-level and silently drops INFO. Net effect:
# the structured access log worked under pytest (where basicConfig ran first)
# and produced nothing at all under uvicorn -- for its entire existence.
#
# Attach an explicit handler to the "ctf" parent and stop propagation, so this
# does not depend on whatever the server did to the root logger.
_ctf_logger = logging.getLogger("ctf")
if not _ctf_logger.handlers:
    _handler = logging.StreamHandler(sys.stdout)
    _handler.setFormatter(logging.Formatter("%(message)s"))
    _ctf_logger.addHandler(_handler)
_ctf_logger.setLevel(logging.INFO)
_ctf_logger.propagate = False

_access_log = logging.getLogger("ctf.access")


class AccessLog(BaseHTTPMiddleware):
    """One JSON object per request, so the log is greppable with jq.

    `jq 'select(.ms > 30000)'` finds every request that would have hit
    Cloudflare's 524.
    """

    async def dispatch(self, request, call_next):
        rid, started = uuid.uuid4().hex[:8], time.monotonic()
        status = 500
        try:
            response = await call_next(request)
            status = response.status_code
            return response
        finally:
            _access_log.info(json.dumps({
                "ts": round(time.time(), 3),
                "rid": rid,
                "method": request.method,
                "path": request.url.path,
                "status": status,
                "ms": round((time.monotonic() - started) * 1000),
                "ip": request.client.host if request.client else None,
            }))


app.add_middleware(AccessLog)
app.include_router(router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    return {"status": "online", "service": settings.PROJECT_NAME, "docs": "/docs"}


@app.get("/health")
async def health():
    """Side-effect-free dependency check.

    /api/status was never a health check: it calls get_or_create_session, which
    WRITES to the database. Polling it every 30s created a phantom player row
    and a WAL write forever.
    """
    from app.services.db_session import DB_PATH
    from app.services.judge import inference_semaphore

    out = {"status": "ok", "checks": {}}

    started = time.monotonic()
    try:
        conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True, timeout=2.0)
        sessions = conn.execute("SELECT count(*) FROM sessions").fetchone()[0]
        conn.close()
        out["checks"]["db"] = {
            "ok": True, "sessions": sessions,
            "ms": round((time.monotonic() - started) * 1000),
        }
    except Exception as exc:
        out["checks"]["db"] = {"ok": False, "error": str(exc)}
        out["status"] = "degraded"

    started = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.get(f"{settings.OLLAMA_BASE_URL}/api/ps")
            loaded = [m.get("name") for m in res.json().get("models", [])]
        out["checks"]["ollama"] = {
            "ok": True,
            "loaded": loaded,
            "target_resident": settings.TARGET_MODEL in loaded,
            "ms": round((time.monotonic() - started) * 1000),
        }
    except Exception as exc:
        out["checks"]["ollama"] = {"ok": False, "error": str(exc)}
        out["status"] = "degraded"

    out["checks"]["inference_slots_free"] = inference_semaphore._value
    return out


@app.get("/health/priority")
async def health_priority():
    """What the scheduler currently thinks, for debugging the yield policy."""
    from app.services.scheduler import scheduler

    reason = await scheduler.should_yield()
    return {
        "yielding": reason is not None,
        "reason": reason,
        "effective_keep_alive": await scheduler.effective_keep_alive(),
        "ctf_keep_alive": settings.CTF_KEEP_ALIVE,
        "resident_models": [m.get("name") for m in await scheduler.get_running_models()],
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.BIND_HOST, port=settings.BIND_PORT, reload=True)
