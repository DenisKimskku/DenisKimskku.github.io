from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from typing import Any, Dict, List, NamedTuple, Optional, Tuple
import hmac
import logging
import re
import time

import asyncio
import json
from fastapi.responses import StreamingResponse
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.challenges import get_challenge, CHALLENGES
from app.core.config import settings
from app.core.security import generate_flag, verify_flag, generate_certificate, verify_certificate
from app.core.owasp import get_owasp_info, OWASP_MAPPINGS
from app.core.guardrails import apply_input_filters, censor_raw_flag
from app.core.level_mechanics import (
    USER_TURN_CONVERSATION, USER_TURN_DEFAULT,
    chat_history_block, corpus_document, estimate_tokens, fit_history,
    indirect_document, json_envelope, multi_turn_transcript,
)
from app.services.session_mgr import session_manager
from app.services.db_session import db_session
from app.services.judge import (
    JUDGE_REASONS, Overloaded, query_ollama, query_ollama_stream, run_llm_judge,
)
from app.services.guard_llm import (
    intent_prefilter, reviewer_gate, run_multi_agent_pipeline,
)
from app.services.scheduler import scheduler
from app.services.hints import hint_service

# One structured line per scored turn. The database records that an attempt
# happened and whether a level is solved, but not HOW turns are being scored --
# and that distribution is the diagnostic signal. A level whose attempts are
# almost all NO_LEAK is one the model never leaks on; a level that is almost all
# GENERIC is one whose players are not really trying. Without it, "level 1 took
# 44 attempts across 7 people" is unexplainable after the fact.
_score_log = logging.getLogger("ctf.score")


def _log_score(level: int, reason_key: str, win: bool, turns: int) -> None:
    _score_log.info(json.dumps({
        "ts": round(time.time(), 3), "evt": "score",
        "level": level, "reason": reason_key, "win": win, "turns_replayed": turns,
    }))


limiter = Limiter(key_func=get_remote_address)
router = APIRouter()

class ChatRequest(BaseModel):
    level: int = Field(..., ge=1, le=20)
    prompt: str = Field(..., max_length=8000)

class ClearRequest(BaseModel):
    # Omitted -> clear every level for this session.
    level: Optional[int] = Field(None, ge=1, le=20)

class FlagSubmission(BaseModel):
    level: int = Field(..., ge=1, le=20)
    # A flag is 21 ASCII characters. Bounding it here stops a multi-megabyte
    # body from reaching verify_flag at all.
    flag: str = Field(..., max_length=64)

async def get_request_session(request: Request) -> Tuple[str, Dict[str, Any]]:
    """Resolve the caller's session, creating one if unrecognised.

    This is deliberately NOT authentication -- the CTF has no accounts, and the
    only thing worth protecting is a player's own progress. Resolution order:
      1. X-Session-ID header (the SPA sends it from localStorage; works in
         incognito and when third-party cookies are blocked)
      2. ctf_session cookie
      3. a brand-new session

    There is no IP/User-Agent tier. An unrecognised caller gets a FRESH session,
    never somebody else's -- see the note in db_session.get_or_create_session.
    Recovery is explicit: /api/status returns session_id, the UI shows it as a
    copyable resume code, and pasting it back restores progress on any device.
    """
    session_id = request.headers.get("x-session-id") or request.headers.get("X-Session-ID") or request.cookies.get("ctf_session")
    client_ip = request.headers.get("cf-connecting-ip") or request.headers.get("x-forwarded-for") or (request.client.host if request.client else "127.0.0.1")
    user_agent = request.headers.get("user-agent", "")
    
    return await session_manager.get_or_create_session(
        session_id=session_id,
        ip_address=client_ip.split(",")[0].strip(),
        user_agent=user_agent
    )

@router.get("/status")
@limiter.limit("60/minute")
async def get_status(request: Request, response: Response):
    session_id, session_data = await get_request_session(request)
    
    # Opaque bearer token (uuid4). Deliberately NOT signed: the value carries no
    # claims, so a signature would add no integrity property -- the server-side
    # lookup is the authority. (The old comment here claimed it was signed;
    # nothing signed it, and Starlette has no SessionMiddleware installed.)
    # HttpOnly closes one exfiltration path; note the same token also lives in
    # localStorage for incognito support, so XSS on the origin recovers it
    # either way. SameSite=None + Secure are required because the SPA on
    # deniskim1.com calls ctf-api.deniskim1.com cross-site.
    response.set_cookie(
        key="ctf_session",
        value=session_id,
        httponly=True,
        samesite="none",
        secure=True,
        max_age=settings.SESSION_EXPIRE_SECONDS,
        path="/api",
    )
    
    return {
        "session_id": session_id,
        "user_id": session_data["user_id"],
        "current_level": session_data["current_level"],
        "completed_levels": session_data["completed_levels"],
        "total_levels": 20
    }

@router.get("/level/{level_id}")
async def get_level_info(level_id: int, request: Request):
    session_id, session_data = await get_request_session(request)
        
    challenge = get_challenge(level_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge level not found")

    # Deduped, reference-retained, and skipped entirely while a higher-priority
    # workload holds the GPU.
    scheduler.schedule_warmup()

    return {
        "level": challenge["level"],
        "title": challenge["title"],
        "tier": challenge["tier"],
        "tier_name": challenge["tier_name"],
        # Levels 3/15/19/20 contain a literal "{FLAG}" in their prose, which used
        # to be served raw to the client.
        "description": challenge["description"].replace("{FLAG}", "CTF{…}"),
        "scenario": challenge["scenario"].replace("{FLAG}", "CTF{…}"),
        "has_input_filter": challenge.get("input_blacklist") is not None or challenge.get("alphanumeric_only") is True,
        "has_output_filter": bool(
            challenge.get("output_censor_raw_flag")
            or challenge.get("dual_llm")
            or challenge.get("llamaguard_check")
        ),
        "has_prefilter": challenge.get("pre_filter_enabled") is True,
        # Honest disclosure: a level whose named defense is still only scenario
        # framing says so, rather than implying a guardrail that isn't enforced.
        "defense_status": challenge.get("status", "enforced"),
        "defense_note": challenge.get("status_note"),
        # Whether a level remembers you is load-bearing information for an
        # attacker, and the UI had no way to know it.
        "multi_turn": _history_mode(challenge) != "off",
        "context_window": _replay_limit(_history_mode(challenge)),
        "is_completed": level_id in session_data["completed_levels"]
    }

class PreparedTurn(NamedTuple):
    session_id: str
    challenge: Dict[str, Any]
    user_prompt: str
    turn: str
    system_prompt: str
    expected_flag: str
    history: List[Dict[str, str]]   # what was REPLAYED, pre-append
    dropped: int
    early: Optional[Dict[str, Any]]


def _sse(payload: Dict[str, Any]) -> str:
    return f"data: {json.dumps(payload)}\n\n"


def _history_mode(challenge: Dict[str, Any]) -> str:
    """'off' | 'raw' | 'corpus' | 'chat'.

    Opt-OUT, not opt-in: 18 of 20 levels want conversation, so a future level
    author gets the modern behaviour by default. The two exceptions declare
    `history_disabled` because their mechanic is a property of ONE request's
    structure -- a code fence (11) and a JSON envelope (12) -- and replayed
    history would let a player write OUTSIDE the wrapper instead of breaking it,
    deleting the level rather than enriching it.
    """
    if not settings.HISTORY_ENABLED or challenge.get("history_disabled"):
        return "off"
    if challenge.get("multi_turn"):
        return "raw"          # level 13: forgeable markers, on purpose
    if challenge.get("indirect_rag"):
        return "corpus"       # levels 15/19: the corpus accumulates
    return "chat"


def _replay_limit(mode: str) -> int:
    return db_session.MAX_TURNS if mode == "raw" else settings.HISTORY_MAX_MESSAGES


async def _prepare_turn(req: ChatRequest, request: Request):
    """Shared front half of /chat and /chat/stream.

    Returns a PreparedTurn. A non-None `early` means the turn is already decided
    and no inference should happen.

    Both endpoints go through this: they used to be parallel implementations, so
    every guardrail added to /chat was bypassable by POSTing to /chat/stream --
    and the turn-persistence bug that made level 13 non-functional in production
    was exactly that drift reappearing.
    """
    session_id, session_data = await get_request_session(request)
    level_id = req.level

    challenge = get_challenge(level_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="Level not found")

    yield_reason = await scheduler.should_yield()
    if yield_reason:
        raise HTTPException(status_code=503, detail=yield_reason, headers={"Retry-After": "30"})

    user_prompt = req.prompt.strip()
    await asyncio.to_thread(hint_service.record_attempt, session_id, level_id)

    sanitized, block_reason = apply_input_filters(challenge, user_prompt)
    if block_reason:
        return PreparedTurn(session_id, challenge, user_prompt, "", "", "", [], 0, {
            "response": block_reason, "win": False, "guardrail_blocked": True,
        })
    user_prompt = sanitized

    if challenge.get("pre_filter_enabled"):
        allowed, _verdict = await intent_prefilter(user_prompt)
        if not allowed:
            return PreparedTurn(session_id, challenge, user_prompt, "", "", "", [], 0, {
                "response": "[PRE-FILTER BLOCKED] The intent classifier flagged this prompt "
                            "as an extraction attempt. It was never forwarded to the target "
                            "model.",
                "win": False, "guardrail_blocked": True,
            })

    expected_flag = generate_flag(session_data["user_id"], level_id, session_data["flag_seed"])
    template = challenge["system_prompt"]
    mode = _history_mode(challenge)

    # ---- Context budget --------------------------------------------------
    # History yields to the payload, never the reverse. Truncating a player's
    # payload behind their back is the same class of dishonesty as fabricating a
    # refusal, and it would silently break long payloads that work today.
    scaffold = estimate_tokens(template.replace("{USER_INPUT}", "").replace("{FLAG}", ""))
    prompt_tokens = estimate_tokens(user_prompt)
    available = (settings.CONTEXT_WINDOW - settings.MAX_TOKENS
                 - settings.PROMPT_RESERVE_TOKENS - scaffold - prompt_tokens)

    if available < 0:
        room = max(0, prompt_tokens + available)
        return PreparedTurn(session_id, challenge, user_prompt, "", "", "", [], 0, {
            "response": ("[CONTEXT] This payload is about %d tokens; this level leaves room for "
                         "about %d. Nothing was sent to the model \u2014 the platform will not "
                         "silently truncate your payload. Shorten it and retry."
                         % (prompt_tokens, room)),
            "win": False, "context_overflow": True,
        })

    history, dropped = [], 0
    if mode != "off":
        limit = _replay_limit(mode)
        stored = await asyncio.to_thread(db_session.get_turns, session_id, level_id, limit)
        history, dropped = fit_history(stored, min(settings.HISTORY_TOKEN_BUDGET, available), limit)

    # ---- Structural mechanics: change where the payload LANDS ------------
    # History goes into the SAME slot the payload occupies, i.e. inside whatever
    # fence the level draws. It must NEVER go into the system prompt: that is
    # the trusted channel holding `Confidential Key: {FLAG}`, and attacker text
    # there would be a free system-prompt injection primitive on all 20 levels.
    embedded = user_prompt
    turn = USER_TURN_DEFAULT if "{USER_INPUT}" in template else user_prompt

    if challenge.get("json_wrapper"):
        embedded = json_envelope(user_prompt)
    elif mode == "raw":
        # Level 13: replayed turns are NOT neutralised, so markers are forgeable.
        embedded = multi_turn_transcript(history, user_prompt)
    elif challenge.get("indirect_rag"):
        if mode == "corpus":
            embedded, turn = corpus_document(level_id, history, user_prompt)
        else:
            embedded, turn = indirect_document(level_id, user_prompt)
    elif history:
        embedded = chat_history_block(history, dropped) + user_prompt
        if "{USER_INPUT}" in template:
            turn = USER_TURN_CONVERSATION

    system_prompt = template.format(FLAG=expected_flag, USER_INPUT=embedded)

    return PreparedTurn(session_id, challenge, user_prompt, turn,
                        system_prompt, expected_flag, history, dropped, None)


async def _apply_output_guardrails(
    challenge: Dict[str, Any], model_response: str, expected_flag: str
) -> str:
    """Egress controls, applied before the player and the scorer see anything."""
    # Levels 17/18: a blind reviewer that never learns what the secret is.
    if challenge.get("dual_llm") or challenge.get("llamaguard_check"):
        approved, _verdict = await reviewer_gate(model_response)
        if not approved:
            label = "MODEL B — REVIEW REJECTED" if challenge.get("dual_llm") else "SAFETY CLASSIFIER"
            return f"[{label}] The draft was withheld by the output reviewer for a suspected policy violation."

    # Levels 8/9: deterministic DLP on the raw flag.
    if challenge.get("output_censor_raw_flag"):
        model_response, _blocked = censor_raw_flag(model_response, expected_flag)

    return model_response


@router.post("/chat")
@limiter.limit("10/minute")
async def send_chat_prompt(req: ChatRequest, request: Request):
    prep = await _prepare_turn(req, request)
    if prep.early:
        return prep.early

    try:
        if prep.challenge.get("multi_agent"):
            # Level 20 runs a real three-stage pipeline instead of one call.
            # History reaches the PLANNER only, so the Worker still sees nothing
            # but a paraphrased task line and the pipeline's information-flow
            # design survives.
            model_response, _verdict = await run_multi_agent_pipeline(
                prep.user_prompt, prep.expected_flag,
                history_block=chat_history_block(prep.history, prep.dropped),
            )
        else:
            model_response = await query_ollama(prep.turn, prep.system_prompt)
    except Overloaded:
        raise HTTPException(
            status_code=503,
            detail="Inference queue full — this CTF runs on a single Mac mini. Retry shortly.",
            headers={"Retry-After": "30"},
        )

    if not model_response.strip():
        # Never fabricate a refusal. The old code substituted "I am a secure AI
        # system... Access denied." for an empty generation, so a truncation bug
        # was presented to the player as a guardrail that does not exist.
        return {
            "response": "[ENGINE] The target model returned no output for this prompt "
                        "(generation budget exhausted). This is a platform limit, not a "
                        "guardrail — retry or shorten your payload.",
            "win": False,
            "judge_reason": JUDGE_REASONS["NO_OUTPUT"],
            "engine_error": True,
        }

    model_response = await _apply_output_guardrails(
        prep.challenge, model_response, prep.expected_flag
    )

    # POST-guardrail, always: exactly the bytes the player received. Storing the
    # raw draft would make the level-17/18 reviewer a no-op across turns and
    # re-admit a redacted flag into the model's context on levels 8/9.
    if _history_mode(prep.challenge) != "off":
        await asyncio.to_thread(
            db_session.append_exchange, prep.session_id, req.level,
            prep.user_prompt, model_response,
        )

    # prep.history is the PRE-append conversation, so the scorer never sees the
    # response it is scoring twice.
    win, reason_key = await run_llm_judge(
        prep.user_prompt, model_response, prep.expected_flag, prep.challenge,
        history=prep.history,
    )

    _log_score(req.level, reason_key, win, len(prep.history))
    body = {
        "response": model_response,
        "win": win,
        "judge_reason": JUDGE_REASONS[reason_key],
        "turns_retained": len(prep.history),
        "context_window": _replay_limit(_history_mode(prep.challenge)),
    }
    if win:
        await session_manager.unlock_level(prep.session_id, req.level)
        body["unlocked_flag"] = prep.expected_flag
    return body


@router.post("/chat/stream")
@limiter.limit("10/minute")
async def send_chat_prompt_stream(req: ChatRequest, request: Request):
    prep = await _prepare_turn(req, request)

    if prep.early:
        async def blocked():
            yield _sse({**prep.early, "done": True})
        return StreamingResponse(blocked(), media_type="text/event-stream")

    challenge, system_prompt = prep.challenge, prep.system_prompt

    # Streaming and egress filtering are incompatible: a censor cannot redact a
    # flag that has already been sent chunk-by-chunk, and no sliding window is
    # sound against a flag split across chunk boundaries. Levels with an output
    # guardrail therefore buffer the full generation before emitting anything.
    buffered = bool(
        challenge.get("output_censor_raw_flag")
        or challenge.get("dual_llm")
        or challenge.get("llamaguard_check")
    )

    async def event_generator():
        full_text = ""
        try:
            if buffered:
                yield _sse({"chunk": "", "status": "generating", "win": False, "done": False})
                full_text = await query_ollama(prep.turn, system_prompt)
            elif challenge.get("multi_agent"):
                yield _sse({"chunk": "", "status": "generating", "win": False, "done": False})
                full_text, _v = await run_multi_agent_pipeline(
                    prep.user_prompt, prep.expected_flag,
                    history_block=chat_history_block(prep.history, prep.dropped),
                )
            else:
                async for chunk in query_ollama_stream(prep.turn, system_prompt):
                    full_text += chunk
                    yield _sse({"chunk": chunk, "win": False, "done": False})
        except Overloaded:
            yield _sse({
                "chunk": "[BUSY] Inference queue full — retry shortly.",
                "win": False, "done": True, "engine_error": True,
            })
            return

        if not full_text.strip():
            yield _sse({
                "chunk": "[ENGINE] The target model returned no output (generation budget "
                         "exhausted). This is a platform limit, not a guardrail.",
                "win": False, "done": True, "engine_error": True,
                "judge_reason": JUDGE_REASONS["NO_OUTPUT"],
            })
            return

        guarded = await _apply_output_guardrails(challenge, full_text, prep.expected_flag)
        if buffered or challenge.get("multi_agent") or guarded != full_text:
            # Replace what the client has (or has not yet) seen with the guarded text.
            yield _sse({"chunk": guarded, "replace": True, "win": False, "done": False})

        # THE bug this endpoint used to have: it read history but never wrote
        # it. The SPA only ever calls /chat/stream, so level 13's conversation
        # buffer was permanently empty for every real player.
        if _history_mode(challenge) != "off":
            await asyncio.to_thread(
                db_session.append_exchange, prep.session_id, req.level,
                prep.user_prompt, guarded,
            )

        win, reason_key = await run_llm_judge(
            prep.user_prompt, guarded, prep.expected_flag, challenge, history=prep.history,
        )
        _log_score(req.level, reason_key, win, len(prep.history))
        tail = {
            "chunk": "", "win": win, "judge_reason": JUDGE_REASONS[reason_key], "done": True,
            "turns_retained": len(prep.history),
            "context_window": _replay_limit(_history_mode(challenge)),
        }
        if win:
            await session_manager.unlock_level(prep.session_id, req.level)
            tail["unlocked_flag"] = prep.expected_flag
        yield _sse(tail)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/chat/clear")
@limiter.limit("20/minute")
async def clear_chat(request: Request, req: Optional[ClearRequest] = None):
    """Drop this session's conversation. {"level": N} for one level, {} for all.

    Deliberately NOT behind scheduler.should_yield(): this is a SQLite DELETE
    with no inference, and a player most wants to reset when the machine is
    busy. Idempotent -- clearing empty history is a 200 with 0 removed.

    Progress is untouched, and the response says so rather than leaving it to be
    inferred. A win stays a win; the attempt counters that gate hints are not
    reachable from here (clearing must not launder progress in EITHER
    direction); flag_seed is not regenerated, or a flag the player already wrote
    down would stop verifying.
    """
    session_id, session_data = await get_request_session(request)
    level_id = req.level if req else None
    removed = await asyncio.to_thread(db_session.clear_turns, session_id, level_id)
    return {
        "cleared": True,
        "level": level_id,
        "messages_removed": removed,
        "attempts_preserved": True,
        "completed_levels": session_data["completed_levels"],
    }


@router.get("/admin/stats")
@limiter.limit("10/minute")
async def get_admin_stats(request: Request):
    # The TCP peer address is the only value an off-host client cannot forge.
    # Header-derived IPs (cf-connecting-ip / x-forwarded-for) are NOT usable for
    # authorization: the previous check trusted them, so anyone reaching port
    # 8000 directly could send `X-Forwarded-For: 127.0.0.1` and read the stats.
    peer = request.client.host if request.client else ""
    if peer not in ("127.0.0.1", "::1"):
        raise HTTPException(status_code=404, detail="Not Found")

    # cloudflared also connects from 127.0.0.1, so the peer check alone would
    # admit every tunnel request. The shared secret is what actually gates this.
    supplied = request.headers.get("x-admin-token", "")
    if not settings.ADMIN_TOKEN or not hmac.compare_digest(supplied, settings.ADMIN_TOKEN):
        raise HTTPException(status_code=404, detail="Not Found")

    return await asyncio.to_thread(db_session.get_admin_stats)

@router.post("/submit_flag")
@limiter.limit("20/minute")
async def submit_flag(req: FlagSubmission, request: Request):
    session_id, session_data = await get_request_session(request)
    completed = set(session_data["completed_levels"])

    # Sequential progression. Without this a player could open level 20 directly,
    # read the plaintext flag out of the response, and paste it here -- 20 times
    # in about four minutes, then claim a signed completion certificate.
    # Already-completed levels are read, never recomputed, so existing progress
    # is preserved even where it is non-contiguous.
    if req.level > 1 and (req.level - 1) not in completed:
        return {
            "success": False,
            "message": f"Level {req.level} is locked. Complete Level {req.level - 1} first.",
        }

    if verify_flag(req.flag.strip(), session_data["user_id"], req.level, session_data["flag_seed"]):
        await session_manager.unlock_level(session_id, req.level)
        return {
            "success": True,
            "message": f"Level {req.level} Flag Verified! Level unlocked.",
            "next_level": min(20, req.level + 1)
        }
    else:
        return {
            "success": False,
            "message": "Invalid flag submission. Keep trying!"
        }

@router.get("/hint/{level_id}")
@limiter.limit("30/minute")
async def get_hints(level_id: int, request: Request):
    session_id, session_data = await get_request_session(request)
    return await asyncio.to_thread(hint_service.get_hints_for_session, session_id, level_id)

@router.get("/owasp/{level_id}")
async def get_owasp(level_id: int):
    owasp_data = get_owasp_info(level_id)
    if not owasp_data:
        raise HTTPException(status_code=404, detail="OWASP information not found")
    return owasp_data

@router.get("/certificate")
@limiter.limit("10/minute")
async def get_certificate(request: Request):
    session_id, session_data = await get_request_session(request)
    # Deduplicate and bound: a repeated entry must not inflate the count past
    # the 20-level gate.
    completed = sorted({int(l) for l in session_data["completed_levels"] if 1 <= int(l) <= 20})

    if len(completed) < 20:
        raise HTTPException(
            status_code=403,
            detail=f"Certificate locked. Complete all 20 levels to claim. "
                   f"Current progress: {len(completed)}/20"
        )

    cert_code = generate_certificate(session_data["user_id"], len(completed))
    return {
        "certificate_code": cert_code,
        "user_id": session_data["user_id"],
        "completed_levels": 20,
        "verification_url": f"https://ctf-api.deniskim1.com/api/verify_cert/{cert_code}"
    }

@router.get("/verify_cert/{cert_code}")
@limiter.limit("30/minute")
async def verify_cert(cert_code: str, request: Request):
    # This endpoint used to call verify_certificate() with one argument against
    # a three-argument signature -- a guaranteed 500 since the day it shipped.
    # The certificate is now self-describing, so verification needs only the
    # server key and works for any third party holding the shared link.
    info = verify_certificate(cert_code)
    return {
        "certificate_code": cert_code,
        "valid": info["valid"],
        "user_id": info["user_id"],
        "completed_levels": info["completed_levels"],
        "issued_at": info["issued_at"],
        "issuer": "LLM Red-Teaming CTF Platform"
    }
