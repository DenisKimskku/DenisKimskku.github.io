"""Tier 1: route smoke suite.

The cheapest, highest-yield tier. Every route, happy path and failure path,
asserting no 5xx. This is the tier that catches "the handler calls a function
with the wrong arity" -- the class of bug that shipped /api/verify_cert as a
guaranteed 500 from day one and stayed there.
"""

import pytest

LOCAL = {"x-forwarded-for": "127.0.0.1", "user-agent": "pytest/local"}
REMOTE = {"x-forwarded-for": "198.51.100.9", "user-agent": "pytest/remote"}


def _no_5xx(resp, where):
    assert resp.status_code < 500, "%s returned %s: %s" % (where, resp.status_code, resp.text[:600])


def test_root(client):
    r = client.get("/")
    _no_5xx(r, "GET /")
    assert r.json()["status"] == "online"


def test_health_reports_dependencies(client):
    r = client.get("/health")
    _no_5xx(r, "GET /health")
    body = r.json()
    assert "db" in body["checks"] and "ollama" in body["checks"]


def test_health_does_not_create_a_session(client):
    """/api/status was used as a health probe for months; it WRITES to the DB.
    /health must not, or every poll interval mints a phantom player row."""
    from app.services.db_session import db_session

    before = db_session.get_admin_stats()["total_sessions"]
    client.get("/health")
    client.get("/health")
    assert db_session.get_admin_stats()["total_sessions"] == before


def test_health_priority_exposes_scheduler_state(client):
    r = client.get("/health/priority")
    _no_5xx(r, "GET /health/priority")
    assert "effective_keep_alive" in r.json()


def test_openapi_schema_builds(client):
    """A route with a broken signature or unserialisable model breaks here."""
    r = client.get("/api/openapi.json")
    _no_5xx(r, "GET /api/openapi.json")
    assert r.status_code == 200


def test_status(client):
    r = client.get("/api/status", headers=REMOTE)
    _no_5xx(r, "GET /api/status")
    body = r.json()
    for key in ("session_id", "user_id", "current_level", "completed_levels", "total_levels"):
        assert key in body
    assert body["total_levels"] == 20


def test_status_sets_cross_site_session_cookie(client):
    r = client.get("/api/status", headers=REMOTE)
    set_cookie = r.headers.get("set-cookie", "")
    # If any of these change, the SPA on deniskim1.com silently stops carrying
    # sessions to ctf-api.deniskim1.com.
    assert "HttpOnly" in set_cookie
    assert "Secure" in set_cookie
    assert "samesite=none" in set_cookie.lower()


def test_user_id_is_not_derived_from_the_ip_hash(client):
    """user_id used to be SHA256(ip:ua:KEY)[:8] with a public key, and it is
    printed on the shareable completion certificate -- i.e. directly invertible
    back to a player's IP address."""
    from app.services.db_session import db_session, hash_ip

    body = client.get("/api/status", headers=REMOTE).json()
    ip_h = hash_ip(REMOTE["x-forwarded-for"], REMOTE["user-agent"])
    assert not body["user_id"].endswith(ip_h[:8])
    assert db_session.get_session(body["session_id"]) is not None


@pytest.mark.parametrize("level_id", [1, 7, 8, 12, 20])
def test_level_info(client, level_id):
    r = client.get("/api/level/%d" % level_id, headers=REMOTE)
    _no_5xx(r, "GET /api/level/%d" % level_id)
    assert r.json()["level"] == level_id


def test_level_info_never_returns_a_raw_flag_placeholder(client):
    """Levels 3/15/19/20 carry a literal "{FLAG}" in their prose."""
    for level_id in range(1, 21):
        body = client.get("/api/level/%d" % level_id, headers=REMOTE).json()
        assert "{FLAG}" not in body["scenario"]
        assert "{FLAG}" not in body["description"]


def test_chat(client, fake_ollama):
    fake_ollama.push_target("I cannot disclose that.")
    r = client.post("/api/chat", json={"level": 1, "prompt": "a serious exploit attempt"},
                    headers=REMOTE)
    _no_5xx(r, "POST /api/chat")
    assert r.json()["win"] is False


def test_chat_stream(client, fake_ollama):
    fake_ollama.push_target("I cannot disclose that.")
    r = client.post("/api/chat/stream", json={"level": 1, "prompt": "a serious exploit attempt"},
                    headers=REMOTE)
    _no_5xx(r, "POST /api/chat/stream")
    assert "data:" in r.text


def test_chat_never_fabricates_a_refusal(client, fake_ollama):
    """An empty generation used to be replaced with "I am a secure AI system...
    Access denied" -- presenting a truncation bug to the player as a guardrail
    that does not exist."""
    fake_ollama.set("target", "")
    r = client.post("/api/chat", json={"level": 1, "prompt": "a serious exploit attempt"},
                    headers=REMOTE)
    body = r.json()
    assert body["engine_error"] is True
    assert "Access denied" not in body["response"]
    assert "platform limit" in body["response"].lower()


def test_submit_flag_wrong(client):
    r = client.post("/api/submit_flag", json={"level": 1, "flag": "CTF{NOPE}"}, headers=REMOTE)
    _no_5xx(r, "POST /api/submit_flag")
    assert r.json()["success"] is False


def test_submit_flag_non_ascii_does_not_500(client):
    """hmac.compare_digest raises TypeError on non-ASCII str operands."""
    r = client.post("/api/submit_flag", json={"level": 1, "flag": "CTF{" + "É" * 16 + "}"},
                    headers=REMOTE)
    _no_5xx(r, "POST /api/submit_flag (non-ASCII)")
    assert r.json()["success"] is False


def test_submit_flag_correct(client, session_flag):
    headers, _status, flag_for = session_flag
    r = client.post("/api/submit_flag", json={"level": 1, "flag": flag_for(1)}, headers=headers)
    _no_5xx(r, "POST /api/submit_flag (valid)")
    assert r.json()["success"] is True


def test_hint(client):
    r = client.get("/api/hint/1", headers=REMOTE)
    _no_5xx(r, "GET /api/hint/1")
    assert r.json()["hint_1_unlocked"] is False


def test_owasp(client):
    r = client.get("/api/owasp/1")
    _no_5xx(r, "GET /api/owasp/1")
    assert "category" in r.json()


@pytest.mark.parametrize("headers,label", [
    (LOCAL, "spoofed X-Forwarded-For: 127.0.0.1, no token"),
    ({**LOCAL, "x-admin-token": "test-admin-token"}, "spoofed loopback + valid token"),
    ({**LOCAL, "x-admin-token": "wrong"}, "spoofed loopback + wrong token"),
    (REMOTE, "remote, no token"),
])
def test_admin_stats_is_closed_to_forgeable_identities(client, headers, label):
    """The old gate trusted X-Forwarded-For / CF-Connecting-IP, so anyone who
    could reach port 8000 directly could spoof 127.0.0.1 and read the stats.

    The gate is now (real TCP peer is loopback) AND (shared secret). TestClient's
    peer is always "testclient", so the positive path cannot be exercised
    in-process -- which is exactly the point: no header the client controls can
    open this endpoint.
    """
    assert client.get("/api/admin/stats", headers=headers).status_code == 404, label


def test_admin_gate_uses_the_peer_address_not_a_header(client):
    """Pins the mechanism, since the positive path is untestable in-process."""
    import inspect
    import re as _re

    from app.api import routes

    src = inspect.getsource(routes.get_admin_stats)
    # Strip comments: the handler documents *why* those headers are untrusted,
    # and the explanation must not trip the check on the code.
    code = "\n".join(_re.sub(r"#.*$", "", line) for line in src.splitlines()).lower()

    assert "request.client.host" in code, "admin gate must key on the real TCP peer"
    assert "compare_digest" in code, "admin token must be compared in constant time"
    assert "x-forwarded-for" not in code, "client-supplied header used for authorization"
    assert "cf-connecting-ip" not in code, "client-supplied header used for authorization"


def test_admin_stats_remote_is_404(client):
    r = client.get("/api/admin/stats", headers={**REMOTE, "x-admin-token": "test-admin-token"})
    assert r.status_code == 404


def test_certificate_and_third_party_verification(client, session_flag):
    """The bug-#1 canary, plus the property the old scheme could never have:
    a certificate has to be verifiable by someone who is not the holder."""
    headers, _status, flag_for = session_flag
    for level in range(1, 21):
        client.post("/api/submit_flag", json={"level": level, "flag": flag_for(level)},
                    headers=headers)

    cert = client.get("/api/certificate", headers=headers)
    _no_5xx(cert, "GET /api/certificate")
    assert cert.status_code == 200
    code = cert.json()["certificate_code"]

    client.cookies.clear()
    stranger = {"x-forwarded-for": "192.0.2.55", "user-agent": "recruiter-checking-a-claim/1.0"}
    v = client.get("/api/verify_cert/%s" % code, headers=stranger)
    _no_5xx(v, "GET /api/verify_cert from a third party")
    assert v.json()["valid"] is True
    assert v.json()["completed_levels"] == 20


def test_certificate_locked_is_403_with_real_progress(client):
    r = client.get("/api/certificate", headers=REMOTE)
    assert r.status_code == 403
    assert "0/20" in r.json()["detail"]


@pytest.mark.parametrize("junk", ["x", "CERT-LLM-REDTEAM-AAAA", "%00", "A" * 500, "-" * 40])
def test_verify_cert_garbage_never_500s(client, junk):
    r = client.get("/api/verify_cert/%s" % junk, headers=REMOTE)
    _no_5xx(r, "GET /api/verify_cert/%s" % junk[:20])
    assert r.json()["valid"] is False


def test_verify_cert_path_traversal_does_not_reach_the_handler(client):
    """Slashes never match the single path segment, so this 404s at routing."""
    r = client.get("/api/verify_cert/../../etc/passwd", headers=REMOTE)
    _no_5xx(r, "GET /api/verify_cert traversal")
    assert r.status_code == 404


@pytest.mark.parametrize("method,path,body", [
    ("get", "/api/level/999", None),
    ("get", "/api/owasp/999", None),
])
def test_unknown_level_is_404(client, method, path, body):
    r = getattr(client, method)(path, headers=REMOTE)
    _no_5xx(r, "%s %s" % (method.upper(), path))
    assert r.status_code == 404


@pytest.mark.parametrize("path,body", [
    ("/api/chat", {"level": 999, "prompt": "hello there friend"}),
    ("/api/chat", {"level": "not-an-int", "prompt": "x"}),
    ("/api/chat", {"prompt": "missing level"}),
    ("/api/submit_flag", {"level": 0, "flag": "x"}),
    ("/api/submit_flag", {"level": 1, "flag": "A" * 5000}),
    ("/api/submit_flag", {}),
])
def test_out_of_range_or_malformed_body_is_422(client, path, body):
    r = client.post(path, json=body, headers=REMOTE)
    _no_5xx(r, "POST %s (malformed)" % path)
    assert r.status_code == 422


def test_ollama_unreachable_never_500s(client, fake_ollama):
    """The Mac Mini's model dies more often than the API does."""
    fake_ollama.raise_connect_error = True
    r = client.post("/api/chat", json={"level": 1, "prompt": "a serious exploit attempt"},
                    headers=REMOTE)
    _no_5xx(r, "POST /api/chat with Ollama down")
    assert r.json()["win"] is False


def test_scheduler_yield_is_a_503_not_a_dropped_request(client, monkeypatch):
    """The old code returned {"queued": true, "response": "processing
    shortly"} and then threw the request away."""
    from app.services.scheduler import scheduler

    async def busy():
        return "Jarvis has the GPU."

    monkeypatch.setattr(scheduler, "should_yield", busy)
    r = client.post("/api/chat", json={"level": 1, "prompt": "a serious exploit attempt"},
                    headers=REMOTE)
    assert r.status_code == 503
    assert r.headers.get("retry-after") == "30"


COVERED_PATHS = {
    "/", "/health", "/health/priority",
    "/api/status", "/api/level/{level_id}", "/api/chat", "/api/chat/stream",
    "/api/admin/stats", "/api/submit_flag", "/api/hint/{level_id}",
    "/api/owasp/{level_id}", "/api/certificate", "/api/verify_cert/{cert_code}",
    "/api/chat/clear",
}
_FRAMEWORK = {"/api/openapi.json", "/docs", "/docs/oauth2-redirect", "/redoc"}


def _declared_paths(app):
    """Every path the app serves, read from its own OpenAPI schema.

    Walking app.routes stopped working: FastAPI <=0.115 flattened included
    routers into app.routes, but 0.141 keeps a single _IncludedRouter node that
    exposes no path, no prefix and no children. Reading app.routes therefore
    reported every /api/* route as "no longer existing" while the endpoints
    still answered 200 -- an introspection change, not a routing one.

    The OpenAPI schema is what the app publicly declares it serves, so it is
    both the more meaningful source and the one least likely to move again.
    """
    return set(app.openapi().get("paths", {}))


def test_every_route_has_a_smoke_test(app_obj):
    declared = _declared_paths(app_obj) - _FRAMEWORK
    missing = declared - COVERED_PATHS
    assert not missing, (
        "New route(s) with no smoke test: %s. Add a happy path and a failure "
        "path, then add the path to COVERED_PATHS." % sorted(missing)
    )
    stale = COVERED_PATHS - declared
    assert not stale, "COVERED_PATHS lists routes that no longer exist: %s" % sorted(stale)


def test_chat_clear(client):
    r = client.post("/api/chat/clear", json={}, headers=REMOTE)
    _no_5xx(r, "POST /api/chat/clear")
    body = r.json()
    assert body["cleared"] is True and body["attempts_preserved"] is True


def test_chat_clear_out_of_range_level_is_422(client):
    assert client.post("/api/chat/clear", json={"level": 0}, headers=REMOTE).status_code == 422


def test_level_declares_its_conversation_contract(client):
    """The UI cannot render a context meter, or honestly say "stateless",
    without knowing which it is."""
    conversational = client.get("/api/level/1", headers=REMOTE).json()
    fenced = client.get("/api/level/11", headers=REMOTE).json()
    assert conversational["multi_turn"] is True and conversational["context_window"] >= 2
    assert fenced["multi_turn"] is False
