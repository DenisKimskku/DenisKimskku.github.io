from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from typing import Optional, List, Tuple, Dict, Any
import re

import asyncio
import json
from fastapi.responses import StreamingResponse
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.challenges import get_challenge, CHALLENGES
from app.core.security import generate_flag, verify_flag, generate_certificate, verify_certificate
from app.core.owasp import get_owasp_info, OWASP_MAPPINGS
from app.services.session_mgr import session_manager
from app.services.db_session import db_session
from app.services.judge import query_ollama, query_ollama_stream, run_llm_judge
from app.services.scheduler import scheduler
from app.services.hints import hint_service

limiter = Limiter(key_func=get_remote_address)
router = APIRouter()

class ChatRequest(BaseModel):
    level: int
    prompt: str

class FlagSubmission(BaseModel):
    level: int
    flag: str

async def get_request_session(request: Request) -> Tuple[str, Dict[str, Any]]:
    """
    Robust 3-Tier Session Resolution:
    1. Read 'X-Session-ID' Header (for Private Browsing / Incognito mode)
    2. Read 'ctf_session' Cookie
    3. Auto-Create/Restore persistent session by Client IP Hash SHA256(client_ip + salt)
    Guarantees that requests NEVER fail with 401 Unauthorized errors!
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
async def get_status(request: Request, response: Response):
    session_id, session_data = await get_request_session(request)
    
    # Set signed HttpOnly session cookie with SameSite=None; Secure for cross-subdomain compatibility
    response.set_cookie(
        key="ctf_session",
        value=session_id,
        httponly=True,
        samesite="none",
        secure=True,
        max_age=86400 * 7
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

    # Async pre-fetch warm up target model in background so cold-start happens while user reads prompt!
    asyncio.create_task(scheduler.warmup_target_model_async())
        
    return {
        "level": challenge["level"],
        "title": challenge["title"],
        "tier": challenge["tier"],
        "tier_name": challenge["tier_name"],
        "description": challenge["description"],
        "scenario": challenge["scenario"],
        "has_input_filter": challenge.get("input_blacklist") is not None or challenge.get("alphanumeric_only") is True,
        "has_output_filter": challenge.get("output_censor_raw_flag") is True,
        "is_completed": level_id in session_data["completed_levels"]
    }

@router.post("/chat")
@limiter.limit("10/minute")
async def send_chat_prompt(req: ChatRequest, request: Request):
    session_id, session_data = await get_request_session(request)
    level_id = req.level
        
    challenge = get_challenge(level_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="Level not found")

    # Priority Queue Check: If external agent or local workload is running, yield priority & queue back
    if await scheduler.is_external_agent_active():
        return {
            "response": "Request queued — processing shortly. Please wait a moment...",
            "win": False,
            "guardrail_blocked": True,
            "queued": True
        }
        
    user_prompt = req.prompt.strip()
    
    # Record attempt for progressive hint unlocking
    hint_service.record_attempt(session_id, level_id)
    
    # 1. Server-side Input Blacklist / Filter
    if challenge.get("input_blacklist"):
        for pattern in challenge["input_blacklist"]:
            if re.search(pattern, user_prompt):
                return {
                    "response": "[WAF BLOCKED] Input prompt contains forbidden keywords blocked by regex WAF.",
                    "win": False,
                    "guardrail_blocked": True
                }
                
    # Alphanumeric filter test (Level 7)
    if challenge.get("alphanumeric_only"):
        sanitized = re.sub(r'[^a-zA-Z0-9\s]', '', user_prompt)
        user_prompt = sanitized

    # Generate dynamic flag tied to user session seed
    expected_flag = generate_flag(session_data["user_id"], level_id, session_data["flag_seed"])
    system_prompt = challenge["system_prompt"].format(FLAG=expected_flag, USER_INPUT=user_prompt)

    # 2. Query Local Target Model
    model_response = await query_ollama(user_prompt, system_prompt)

    # 3. LLM-as-a-Judge Evaluation
    win, judge_reason = await run_llm_judge(user_prompt, model_response, expected_flag, challenge)

    if win:
        await session_manager.unlock_level(session_id, level_id)
        return {
            "response": model_response,
            "win": True,
            "judge_reason": judge_reason,
            "unlocked_flag": expected_flag
        }
    else:
        fallback_text = model_response if model_response.strip() else f"I am a secure AI system protecting Level {level_id} policy directives. Access denied.\n({judge_reason})"
        return {
            "response": fallback_text,
            "win": False,
            "judge_reason": judge_reason
        }

@router.post("/chat/stream")
@limiter.limit("10/minute")
async def send_chat_prompt_stream(req: ChatRequest, request: Request):
    session_id, session_data = await get_request_session(request)
    level_id = req.level
    challenge = get_challenge(level_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="Level not found")
        
    user_prompt = req.prompt.strip()
    hint_service.record_attempt(session_id, level_id)
    
    if challenge.get("input_blacklist"):
        for pattern in challenge["input_blacklist"]:
            if re.search(pattern, user_prompt):
                async def filter_event():
                    yield f"data: {json.dumps({'chunk': '[WAF BLOCKED] Input prompt contains forbidden keywords.', 'win': False, 'done': True})}\n\n"
                return StreamingResponse(filter_event(), media_type="text/event-stream")
                
    if challenge.get("alphanumeric_only"):
        user_prompt = re.sub(r'[^a-zA-Z0-9\s]', '', user_prompt)
        
    expected_flag = generate_flag(session_data["user_id"], level_id, session_data["flag_seed"])
    system_prompt = challenge["system_prompt"].format(FLAG=expected_flag, USER_INPUT=user_prompt)

    async def event_generator():
        full_text = ""
        async for chunk in query_ollama_stream(user_prompt, system_prompt):
            if "</think>" in chunk:
                chunk = chunk.replace("</think>", "").replace("<think>", "")
            full_text += chunk
            yield f"data: {json.dumps({'chunk': chunk, 'win': False, 'done': False})}\n\n"
            
        win, judge_reason = await run_llm_judge(user_prompt, full_text, expected_flag, challenge)
        if win:
            await session_manager.unlock_level(session_id, level_id)
            yield f"data: {json.dumps({'chunk': '', 'win': True, 'judge_reason': judge_reason, 'unlocked_flag': expected_flag, 'done': True})}\n\n"
        else:
            yield f"data: {json.dumps({'chunk': '', 'win': False, 'judge_reason': judge_reason, 'done': True})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.get("/admin/stats")
async def get_admin_stats(request: Request):
    client_ip = request.headers.get("cf-connecting-ip") or request.headers.get("x-forwarded-for") or (request.client.host if request.client else "127.0.0.1")
    client_ip = client_ip.split(",")[0].strip()
    
    # Restrict admin stats to local loopback (127.0.0.1 / ::1 / localhost)
    if client_ip not in ["127.0.0.1", "::1", "localhost"]:
        raise HTTPException(status_code=403, detail="Access denied. Local inspection only.")
        
    stats = db_session.get_admin_stats()
    return stats

@router.post("/submit_flag")
async def submit_flag(req: FlagSubmission, request: Request):
    session_id, session_data = await get_request_session(request)
    
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
async def get_hints(level_id: int, request: Request):
    session_id, session_data = await get_request_session(request)
    hints = hint_service.get_hints_for_session(session_id, level_id)
    return hints

@router.get("/owasp/{level_id}")
async def get_owasp(level_id: int):
    owasp_data = get_owasp_info(level_id)
    if not owasp_data:
        raise HTTPException(status_code=404, detail="OWASP information not found")
    return owasp_data

@router.get("/certificate")
async def get_certificate(request: Request):
    session_id, session_data = await get_request_session(request)
    max_completed = len(session_data["completed_levels"])
    
    if max_completed < 20:
        raise HTTPException(
            status_code=403, 
            detail=f"Certificate locked. Complete all 20 levels to claim. Current progress: {max_completed}/20"
        )
        
    cert_code = generate_certificate(session_data["user_id"], max_completed, session_data["flag_seed"])
    return {
        "certificate_code": cert_code,
        "user_id": session_data["user_id"],
        "completed_levels": 20,
        "verification_url": f"https://ctf-api.deniskim1.com/api/verify_cert/{cert_code}"
    }

@router.get("/verify_cert/{cert_code}")
async def verify_cert(cert_code: str):
    is_valid = verify_certificate(cert_code)
    return {
        "certificate_code": cert_code,
        "valid": is_valid,
        "issuer": "LLM Red-Teaming CTF Platform"
    }
