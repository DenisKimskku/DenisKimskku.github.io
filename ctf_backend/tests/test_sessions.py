"""Tier 4: session resolution, isolation, concurrency, and the scheduler policy.

Session resolution deliberately never returns 401 -- a reasonable trade for a
public CTF with no accounts -- but every tier of it is a way for one player's
progress to land on another player's screen. These tests pin the behaviour so a
"small" change to header handling cannot silently merge two players.
"""

import json
import sqlite3
import threading

import pytest

from app.core.security import generate_flag, verify_flag
from app.services.db_session import DB_PATH, db_session
from app.services.scheduler import _parse_expiry, scheduler

A = {"x-forwarded-for": "198.51.100.10", "user-agent": "player-a/1.0"}
B = {"x-forwarded-for": "203.0.113.20", "user-agent": "player-b/1.0"}


def test_header_session_id_wins_over_ip(client):
    a = client.get("/api/status", headers=A).json()
    client.cookies.clear()
    roaming = dict(B, **{"x-session-id": a["session_id"]})
    resumed = client.get("/api/status", headers=roaming).json()
    assert resumed["session_id"] == a["session_id"]


def test_cookie_resolves_session(client):
    a = client.get("/api/status", headers=A).json()
    resumed = client.get("/api/status", headers=B).json()
    assert resumed["session_id"] == a["session_id"]


def test_no_ip_fallback_strangers_never_share_a_session(client):
    """Two players behind one NAT with the same browser build used to collide
    onto a single row and therefore share its flag_seed -- i.e. share flags."""
    first = client.get("/api/status", headers=A).json()
    client.cookies.clear()
    second = client.get("/api/status", headers=A).json()   # same IP + UA, no cookie
    assert second["session_id"] != first["session_id"], (
        "an unrecognised client inherited an existing session by IP+UA"
    )


def test_resume_code_restores_a_session_on_another_device(client):
    """The replacement for the IP heuristic: /api/status returns the session id,
    the UI surfaces it as a resume code, and pasting it back works anywhere."""
    a = client.get("/api/status", headers=A).json()
    client.cookies.clear()
    elsewhere = dict(B, **{"x-session-id": a["session_id"]})
    assert client.get("/api/status", headers=elsewhere).json()["user_id"] == a["user_id"]


def test_unknown_session_id_falls_back_instead_of_401(client):
    r = client.get("/api/status", headers=dict(A, **{"x-session-id": "not-a-real-session"}))
    assert r.status_code == 200
    assert r.json()["session_id"] != "not-a-real-session"


def test_two_players_do_not_cross_contaminate(client):
    a = client.get("/api/status", headers=A).json()
    client.cookies.clear()
    b = client.get("/api/status", headers=B).json()
    client.cookies.clear()

    assert a["session_id"] != b["session_id"]
    assert a["user_id"] != b["user_id"]

    raw_a = db_session.get_session(a["session_id"])
    raw_b = db_session.get_session(b["session_id"])
    assert raw_a["flag_seed"] != raw_b["flag_seed"]

    flag_a1 = generate_flag(raw_a["user_id"], 1, raw_a["flag_seed"])
    flag_b1 = generate_flag(raw_b["user_id"], 1, raw_b["flag_seed"])
    assert flag_a1 != flag_b1, "flags are shareable between players"
    assert verify_flag(flag_a1, raw_b["user_id"], 1, raw_b["flag_seed"]) is False


def test_flags_are_level_scoped(client, session_flag):
    """Cross-level replay must fail: level_N is inside the HMAC message."""
    headers, _status, flag_for = session_flag
    client.post("/api/submit_flag", json={"level": 1, "flag": flag_for(1)}, headers=headers)
    client.cookies.clear()
    r = client.post("/api/submit_flag", json={"level": 2, "flag": flag_for(1)}, headers=headers)
    assert r.json()["success"] is False


def test_progression_gate_blocks_level_skipping(client, session_flag):
    """Without this a player could open level 20 directly, read the plaintext
    flag out of the response, and paste it here -- 20 times in four minutes,
    then claim a signed completion certificate."""
    headers, _status, flag_for = session_flag
    r = client.post("/api/submit_flag", json={"level": 5, "flag": flag_for(5)}, headers=headers)
    assert r.json()["success"] is False
    assert "locked" in r.json()["message"].lower()


def test_sequential_progression_still_works(client, session_flag):
    headers, _status, flag_for = session_flag
    for level in range(1, 21):
        client.cookies.clear()
        body = client.post("/api/submit_flag", json={"level": level, "flag": flag_for(level)},
                           headers=headers).json()
        assert body["success"] is True, "level %d rejected in a legitimate run" % level
    client.cookies.clear()
    assert client.get("/api/certificate", headers=headers).status_code == 200


def test_attempt_counters_are_per_player_and_per_level(client, fake_ollama):
    a = dict(A, **{"x-session-id": client.get("/api/status", headers=A).json()["session_id"]})
    client.cookies.clear()
    b = dict(B, **{"x-session-id": client.get("/api/status", headers=B).json()["session_id"]})
    client.cookies.clear()
    from app.core.config import settings

    # Level 1 is conversational, so a grooming sequence must not auto-unlock.
    for _ in range(settings.HINT_1_AFTER):
        client.post("/api/chat", json={"level": 1, "prompt": "a genuine exploit attempt"},
                    headers=a)
    assert client.get("/api/hint/1", headers=a).json()["hint_1_unlocked"] is True
    assert client.get("/api/hint/2", headers=a).json()["hint_1_unlocked"] is False
    assert client.get("/api/hint/1", headers=b).json()["hint_1_unlocked"] is False


def test_single_turn_levels_keep_the_original_hint_thresholds(client, fake_ollama):
    """On level 11 one prompt really is one attempt, so 3/5 still describes
    reality. Raising it there would just make the level tedious."""
    from app.core.config import settings

    hdrs = dict(A, **{"x-session-id": client.get("/api/status", headers=A).json()["session_id"]})
    for _ in range(settings.HINT_1_AFTER_SINGLE_TURN):
        client.post("/api/chat", json={"level": 11, "prompt": "a genuine fence escape"},
                    headers=hdrs)
    assert client.get("/api/hint/11", headers=hdrs).json()["hint_1_unlocked"] is True


def _completed(session_id):
    conn = sqlite3.connect(DB_PATH, timeout=10)
    row = conn.execute("SELECT completed_levels FROM sessions WHERE session_id = ?",
                       (session_id,)).fetchone()
    conn.close()
    return sorted(json.loads(row[0]))


def test_concurrent_unlocks_do_not_lose_completions(client):
    """unlock_level was a read-modify-write with no transaction: 20 concurrent
    unlocks left exactly 1 completion recorded. A player with two browser tabs
    is enough to trigger it."""
    session_id = client.get("/api/status", headers=A).json()["session_id"]

    errors = []
    barrier = threading.Barrier(20)

    def worker(level_id):
        try:
            barrier.wait(timeout=10)
            db_session.unlock_level(session_id, level_id)
        except Exception as exc:  # noqa: BLE001
            errors.append(repr(exc))

    threads = [threading.Thread(target=worker, args=(lvl,)) for lvl in range(1, 21)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=30)

    assert not errors, "unlock_level raised under concurrency: %s" % errors[:3]
    assert _completed(session_id) == list(range(1, 21))


def test_repeated_unlocks_are_idempotent(client):
    session_id = client.get("/api/status", headers=A).json()["session_id"]
    for _ in range(5):
        db_session.unlock_level(session_id, 3)
    assert _completed(session_id) == [3]


def test_unlock_never_regresses_current_level(client):
    session_id = client.get("/api/status", headers=A).json()["session_id"]
    db_session.unlock_level(session_id, 10)
    db_session.unlock_level(session_id, 1)
    assert db_session.get_session(session_id)["current_level"] == 11


@pytest.mark.parametrize("bad", [0, 21, -1, 999])
def test_unlock_rejects_out_of_range_levels(client, bad):
    session_id = client.get("/api/status", headers=A).json()["session_id"]
    assert db_session.unlock_level(session_id, bad) is False


def test_unlock_on_unknown_session_is_a_noop():
    assert db_session.unlock_level("no-such-session", 5) is False


def test_ip_hash_index_exists():
    """Without it the tier-2 lookup is a full table scan, run on the single
    event-loop thread, on every request that is not a cookie/header hit."""
    conn = sqlite3.connect(DB_PATH, timeout=10)
    names = {r[1] for r in conn.execute("PRAGMA index_list(sessions)")}
    conn.close()
    assert "idx_sessions_ip_hash" in names


def test_user_agent_is_truncated_before_hashing():
    """User-Agent is attacker-controlled and unbounded; without a cap it can be
    used to mint unlimited distinct session rows from one IP."""
    from app.services.db_session import hash_ip

    assert hash_ip("1.2.3.4", "x" * 120) == hash_ip("1.2.3.4", "x" * 5000)


# ---------------------------------------------------------------------------
# The shared-GPU priority policy
# ---------------------------------------------------------------------------
def test_expiry_parsing_handles_real_ollama_timestamps():
    assert _parse_expiry("") is None
    assert _parse_expiry("garbage") is None
    v = _parse_expiry("2099-01-01T00:00:00.75185+09:00")
    assert v is not None and v > 0


async def test_keep_alive_is_short_when_nothing_is_resident(fake_ollama):
    """The CTF must never be the reason a model sits in VRAM all day."""
    from app.core.config import settings

    fake_ollama.ps_models = []
    scheduler._ps_cache = (0.0, [])
    assert await scheduler.effective_keep_alive() == settings.CTF_KEEP_ALIVE


async def test_keep_alive_never_shortens_another_workloads_residency(fake_ollama):
    """Jarvis runs the SAME qwen3:8b and pins it for 24h on purpose, because
    re-prefilling its ~4400-token tool prompt costs ~22s. keep_alive is global
    per model, so a naive short lease from the CTF would evict it."""
    import time as _time

    scheduler._ps_cache = (
        _time.monotonic(),
        [{"name": "qwen3:8b", "expires_at": "2099-01-01T00:00:00+09:00"}],
    )
    try:
        ka = await scheduler.effective_keep_alive()
        assert ka.endswith("s")
        assert int(ka[:-1]) > 3600, "CTF would have shortened a long-lived residency"
    finally:
        scheduler._ps_cache = (0.0, [])


async def test_yields_when_a_foreign_model_holds_the_gpu(fake_ollama, monkeypatch):
    import time as _time

    monkeypatch.undo()  # restore the real should_yield
    monkeypatch.setattr(scheduler, "_jarvis_recently_active", lambda: False)
    monkeypatch.setattr(scheduler, "_in_quiet_hours", lambda: False)
    scheduler._ps_cache = (_time.monotonic(), [{"name": "some-other-model:70b"}])
    try:
        reason = await scheduler.should_yield()
        assert reason and "some-other-model:70b" in reason
    finally:
        scheduler._ps_cache = (0.0, [])


def test_session_less_calls_each_mint_a_session(client):
    """Documents WHY the client must serialise its first request.

    Every endpoint calling get_request_session mints a session when the caller
    presents none -- correct, and deliberate: an unrecognised caller must get a
    FRESH session, never somebody else's. There is no IP fallback to collapse
    them any more, because that fallback shared flag_seed between strangers
    behind one NAT.

    The consequence is a client concern: on a first visit the arena fired
    /api/status, /api/level and /api/hint within milliseconds of each other with
    empty localStorage, and each minted its own session -- observed in
    production as two rows written in the same second from one page load. Worse
    than untidy: /api/level returned is_completed for a session the UI then
    discarded, and /api/hint recorded an attempt against it.

    ctfApi.ctfFetch now awaits a single bootstrap /api/status before any other
    call. If this test ever starts returning 1, the server contract changed and
    that client serialisation may no longer be needed.
    """
    before = db_session.get_admin_stats()["total_sessions"]
    for path in ("/api/status", "/api/hint/1"):
        client.get(path, headers=A)
        client.cookies.clear()
    minted = db_session.get_admin_stats()["total_sessions"] - before
    assert minted == 2, (
        "expected each session-less call to mint its own session (got %d) -- if "
        "this changed, revisit the client-side bootstrap in ctfApi.ts" % minted
    )

    # /level is deliberately NOT in that list any more. It is the page-load
    # endpoint -- unauthenticated, hit before the player has done anything, and
    # it was the only session-touching route with no rate limit. Minting there
    # gave an anonymous caller an unmetered INSERT against a SQLite file nothing
    # prunes. It now resolves an existing session or reports is_completed=false,
    # and it carries 60/minute.
    before = db_session.get_admin_stats()["total_sessions"]
    for _ in range(3):
        client.get("/api/level/1", headers=A)
        client.cookies.clear()
    assert db_session.get_admin_stats()["total_sessions"] == before, (
        "/api/level must never create a session"
    )
