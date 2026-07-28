"""Shared test infrastructure for the LLM Red-Teaming CTF backend.

READ THIS BEFORE ADDING TESTS
=============================
`app/services/db_session.py` calls `init_db()` at *import time*. Anything that
imports `app.*` therefore opens and writes a SQLite file the moment it is
imported. If `CTF_DB_PATH` is not already set at that instant, that file is
`ctf_backend/data/ctf_progress.db` -- the live player database. The two test
files that used to live here did exactly that on every run.

So the environment is redirected at *module scope*, before pytest imports any
test module. A fixture would be too late: fixtures run after collection, and
collection has already imported the test modules, which imported `app.*`, which
ran `init_db()`.

The sqlite3.connect tripwire below is a call-site block rather than a checksum,
because the production backend runs under launchd and legitimately writes to
that file while tests run -- a checksum would false-positive.
"""

import json
import os
import sqlite3
import sys
import tempfile
from collections import deque

import pytest

# ---------------------------------------------------------------------------
# 1. Path + environment isolation. MUST run before any `app.*` import.
# ---------------------------------------------------------------------------
_TESTS_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_ROOT = os.path.dirname(_TESTS_DIR)
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)

_TMP_DIR = tempfile.mkdtemp(prefix="ctf-tests-")
os.environ["CTF_DB_PATH"] = os.path.join(_TMP_DIR, "test_progress.db")

# Never sign test flags with the production keys. config.py fails closed, so
# these must exist before `app.core.config` is imported.
os.environ["CTF_FLAG_HMAC_KEY"] = "test-only-flag-key-DO-NOT-USE-IN-PRODUCTION"
os.environ["CTF_CERT_HMAC_KEY"] = "test-only-cert-key-DO-NOT-USE-IN-PRODUCTION"
os.environ["CTF_ADMIN_TOKEN"] = "test-admin-token"
os.environ.pop("CTF_LEGACY_FLAG_HMAC_KEY", None)

# Point the app at a host that cannot resolve. The fake transport intercepts
# everything; this way a missed interception fails loudly instead of hitting the
# real model and burning GPU that belongs to the voice assistant.
os.environ["OLLAMA_BASE_URL"] = "http://ollama.test.invalid:11434"

_PROD_DATA_DIR = os.path.abspath(os.path.join(_BACKEND_ROOT, "data"))
_real_sqlite_connect = sqlite3.connect


def _guarded_connect(database, *args, **kwargs):
    try:
        resolved = os.path.abspath(str(database))
    except Exception:  # noqa: BLE001 - URIs, :memory:, file descriptors
        resolved = ""
    if resolved.startswith(_PROD_DATA_DIR + os.sep):
        raise RuntimeError(
            "BLOCKED: the test process tried to open the production database at "
            "%s. Tests must never touch real player progress. Check that "
            "CTF_DB_PATH is honoured by every module that opens SQLite." % resolved
        )
    return _real_sqlite_connect(database, *args, **kwargs)


sqlite3.connect = _guarded_connect

# ---------------------------------------------------------------------------
# 2. Now it is safe to import the application.
# ---------------------------------------------------------------------------
import httpx  # noqa: E402
from starlette.testclient import TestClient  # noqa: E402

from app.services import db_session as db_session_mod  # noqa: E402

if os.path.abspath(db_session_mod.DB_PATH) != os.path.abspath(os.environ["CTF_DB_PATH"]):
    raise RuntimeError(
        "REFUSING TO RUN: db_session.DB_PATH is %r, expected %r. The CTF_DB_PATH "
        "override is not in effect and this run would write to the live player "
        "database." % (db_session_mod.DB_PATH, os.environ["CTF_DB_PATH"])
    )


@pytest.fixture(autouse=True)
def clean_db():
    """Truncate between tests. init_db() already ran at import time."""
    conn = _real_sqlite_connect(db_session_mod.DB_PATH, timeout=10)
    conn.execute("DELETE FROM sessions")
    conn.execute("DELETE FROM attempts")
    # 18 of 20 levels now write conversation history; without this the table
    # grows across the whole run and a future test that pins a session id would
    # be contaminated.
    conn.execute("DELETE FROM turns")
    conn.commit()
    conn.close()
    yield


# ---------------------------------------------------------------------------
# 3. The fake Ollama.
# ---------------------------------------------------------------------------
# Routing markers, taken from the real system prompts.
JUDGE_MARKER = "CTF scoring classifier"
PREFILTER_MARKER = "input-intent classifier"
REVIEWER_MARKER = "Model B, an output reviewer"

_REAL_ASYNC_CLIENT = httpx.AsyncClient

_DEFAULT_TARGET = "I'm sorry, I can't share that information."
_DEFAULT_JUDGE = "LOSS"
_DEFAULT_PREFILTER = "ALLOW"
_DEFAULT_REVIEWER = "APPROVE"


class FakeOllama:
    """Scriptable stand-in for the local Ollama daemon.

    Routes by request path and system-prompt marker:
      GET  /api/ps                     -> scheduler
      POST /api/generate, no system    -> warmup
      POST /api/generate, judge marker -> the scoring classifier
      POST /api/generate, guard marker -> pre-filter / reviewer
      POST /api/generate, otherwise    -> the target model
    """

    def __init__(self):
        self.reset()

    def reset(self):
        self.queues = {k: deque() for k in ("target", "judge", "prefilter", "reviewer")}
        self.defaults = {
            "target": _DEFAULT_TARGET,
            "judge": _DEFAULT_JUDGE,
            "prefilter": _DEFAULT_PREFILTER,
            "reviewer": _DEFAULT_REVIEWER,
        }
        self.ps_models = []
        self.raise_connect_error = False
        self.http_status = 200
        self.calls = []
        # When set, the fake also returns a `thinking` field, the way qwen3
        # does. Nothing in app/ may ever read it: the model's private reasoning
        # routinely restates the secret while it deliberates about refusing.
        self.thinking = None

    def push(self, role, text):
        self.queues[role].append(text)
        return self

    def set(self, role, text):
        self.defaults[role] = text
        return self

    push_target = lambda self, t: self.push("target", t)  # noqa: E731
    push_judge = lambda self, t: self.push("judge", t)  # noqa: E731

    def calls_for(self, role):
        return [c for c in self.calls if c["role"] == role]

    @property
    def target_calls(self):
        return self.calls_for("target")

    @property
    def judge_calls(self):
        return self.calls_for("judge")

    def _classify(self, path, payload):
        if path == "/api/ps":
            return "ps"
        system = payload.get("system") or ""
        if "system" not in payload:
            return "warmup"
        if JUDGE_MARKER in system:
            return "judge"
        if PREFILTER_MARKER in system:
            return "prefilter"
        if REVIEWER_MARKER in system:
            return "reviewer"
        return "target"

    def handler(self, request):
        if self.raise_connect_error:
            raise httpx.ConnectError("fake ollama: simulated connection failure")

        try:
            payload = json.loads((request.content or b"{}").decode("utf-8"))
        except ValueError:
            payload = {}

        role = self._classify(request.url.path, payload)
        self.calls.append({"role": role, "payload": payload, "stream": bool(payload.get("stream"))})

        if role == "ps":
            return httpx.Response(200, json={"models": self.ps_models})
        if role == "warmup":
            return httpx.Response(200, json={"response": ""})
        if self.http_status != 200:
            return httpx.Response(self.http_status, json={"error": "fake failure"})

        q = self.queues[role]
        text = q.popleft() if q else self.defaults[role]

        if payload.get("stream"):
            chunks = [text[i:i + 8] for i in range(0, len(text), 8)]
            body = b"".join(
                json.dumps({"response": c, "done": False}).encode() + b"\n" for c in chunks
            )
            body += json.dumps({"response": "", "done": True}).encode() + b"\n"
            return httpx.Response(200, content=body)

        body = {"response": text, "done": True}
        if self.thinking is not None:
            body["thinking"] = self.thinking
        return httpx.Response(200, json=body)


_FAKE = FakeOllama()


@pytest.fixture(autouse=True, scope="session")
def _patch_httpx():
    """Redirect every outbound httpx.AsyncClient at the fake.

    Only inject when the caller supplied no transport of its own, so an
    ASGITransport used to drive the app under test is never clobbered.
    """

    class _FakedAsyncClient(_REAL_ASYNC_CLIENT):
        def __init__(self, *args, **kwargs):
            if "transport" not in kwargs and "app" not in kwargs:
                kwargs["transport"] = httpx.MockTransport(_FAKE.handler)
            super().__init__(*args, **kwargs)

    httpx.AsyncClient = _FakedAsyncClient
    try:
        yield
    finally:
        httpx.AsyncClient = _REAL_ASYNC_CLIENT


@pytest.fixture(autouse=True)
def fake_ollama(_patch_httpx):
    _FAKE.reset()
    yield _FAKE
    _FAKE.reset()


@pytest.fixture(autouse=True)
def no_yielding(monkeypatch):
    """The scheduler yields to the voice assistant and to quiet hours.

    Both are real machine state, so without this the whole suite would pass or
    fail depending on the wall clock and whether Jarvis happened to be talking.
    Tests that care about yielding re-enable it explicitly.
    """
    from app.services.scheduler import scheduler

    async def never_yield():
        return None

    monkeypatch.setattr(scheduler, "should_yield", never_yield)


def pytest_addoption(parser):
    parser.addoption("--record", action="store_true", default=False,
                     help="With -m live: re-record the exploit corpus from the real model.")
    parser.addoption("--live-attempts", type=int, default=3,
                     help="With -m live: attempts per exploit (temperature 0.6 makes one a coin flip).")


def pytest_collection_modifyitems(config, items):
    if config.getoption("-m") and "live" in str(config.getoption("-m")):
        return
    skip_live = pytest.mark.skip(reason="live tier: run explicitly with -m live")
    for item in items:
        if "live" in item.keywords:
            item.add_marker(skip_live)


# ---------------------------------------------------------------------------
# 4. HTTP clients.
# ---------------------------------------------------------------------------
@pytest.fixture
def app_obj():
    from app.api import routes as routes_mod
    from app.main import app

    if getattr(app.state, "limiter", None) is not None:
        app.state.limiter.enabled = False
    routes_mod.limiter.enabled = False
    return app


@pytest.fixture
def client(app_obj):
    """Sync TestClient.

    base_url is https because /api/status sets secure=True on the session
    cookie; over http:// the cookie jar silently drops it and every
    cookie-continuity test would fall through to the IP tier and still "pass".

    raise_server_exceptions=False so the smoke suite can *assert* on a 5xx
    rather than erroring out on the first broken route.
    """
    with TestClient(app_obj, base_url="https://testserver", raise_server_exceptions=False) as c:
        yield c


@pytest.fixture
def session_flag(client):
    """(headers, status_json, flag_for_level) for a fresh player."""
    from app.core.security import generate_flag

    headers = {"x-forwarded-for": "203.0.113.77", "user-agent": "pytest/flag"}
    status = client.get("/api/status", headers=headers).json()
    # There is no IP fallback any more: an unrecognised client gets a FRESH
    # session rather than somebody else's. Carry the id like the real UI does.
    headers["x-session-id"] = status["session_id"]
    raw = db_session_mod.db_session.get_session(status["session_id"])

    def flag_for(level_id):
        return generate_flag(raw["user_id"], level_id, raw["flag_seed"])

    return headers, status, flag_for
