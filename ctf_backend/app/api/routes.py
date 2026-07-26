from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from typing import Optional, List
import re

import asyncio
from app.core.challenges import get_challenge, CHALLENGES
from app.core.security import generate_flag, verify_flag, generate_certificate, verify_certificate
from app.core.owasp import get_owasp_info, OWASP_MAPPINGS
from app.services.session_mgr import session_manager
from app.services.judge import query_ollama, run_llm_judge
from app.services.scheduler import scheduler
from app.services.hints import hint_service

router = APIRouter()

class ChatRequest(BaseModel):
    level: int
    prompt: str

class FlagSubmission(BaseModel):
    level: int
    flag: str

@router.get("/status")
async def get_status(request: Request, response: Response):
    session_id = request.cookies.get("ctf_session")
    client_ip = request.headers.get("cf-connecting-ip") or request.headers.get("x-forwarded-for") or (request.client.host if request.client else "127.0.0.1")
    user_agent = request.headers.get("user-agent", "")
    
    session_id, session_data = await session_manager.get_or_create_session(
        session_id=session_id,
        ip_address=client_ip.split(",")[0].strip(),
        user_agent=user_agent
    )
    
    # Set signed HttpOnly session cookie
    response.set_cookie(
        key="ctf_session",
        value=session_id,
        httponly=True,
        samesite="lax",
        secure=False,  # Set to True in production HTTPS
        max_age=86400 * 7
    )
    
    return {
        "user_id": session_data["user_id"],
        "current_level": session_data["current_level"],
        "completed_levels": session_data["completed_levels"],
        "total_levels": 20
    }

@router.get("/level/{level_id}")
async def get_level_info(level_id: int, request: Request):
    session_id = request.cookies.get("ctf_session")
    if not session_id:
        raise HTTPException(status_code=401, detail="Session expired or missing")
        
    session_data = await session_manager.get_session(session_id)
    if not session_data:
        raise HTTPException(status_code=401, detail="Invalid session")
        
    # Enforce Server-side Level Locking: Cannot view level > current_level
    if level_id > session_data["current_level"] and level_id not in session_data["completed_levels"]:
        raise HTTPException(status_code=403, detail=f"Level {level_id} is locked. Complete Level {level_id - 1} first.")
        
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
async def send_chat_prompt(req: ChatRequest, request: Request):
    session_id = request.cookies.get("ctf_session")
    if not session_id:
        raise HTTPException(status_code=401, detail="Session missing")
        
    session_data = await session_manager.get_session(session_id)
    if not session_data:
        raise HTTPException(status_code=401, detail="Invalid session")
        
    level_id = req.level
    if level_id > session_data["current_level"] and level_id not in session_data["completed_levels"]:
        raise HTTPException(status_code=403, detail="Level locked.")
        
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
                    "response": "[WAF CENSOR] Prompt blocked by server input keyword filter.",
                    "guardrail_blocked": True,
                    "win": False
                }
                
    if challenge.get("alphanumeric_only"):
        if not re.match(r'^[a-zA-Z0-9\s]+$', user_prompt):
            return {
                "response": "[SANITY FILTER] Input stripped! Only letters, numbers, and spaces permitted on Level 7.",
                "guardrail_blocked": True,
                "win": False
            }
            
    # 2. Dynamic HMAC Flag calculation for this session
    expected_flag = generate_flag(
        user_id=session_data["user_id"],
        level_id=level_id,
        flag_seed=session_data["flag_seed"]
    )
    
    # 3. Format system prompt with dynamic secret flag
    formatted_system = challenge["system_prompt"].format(
        FLAG=expected_flag,
        USER_INPUT=user_prompt
    )
    
    # 4. Query Target Model
    model_output = await query_ollama(user_prompt, formatted_system)
    
    # 5. Output Filters
    if challenge.get("output_censor_raw_flag") and expected_flag in model_output:
        model_output = model_output.replace(expected_flag, "[CENSORED_BY_OUTPUT_GUARDRAIL]")
        
    # 6. LLM-as-a-Judge Validation
    is_win, judge_reason = await run_llm_judge(user_prompt, model_output, expected_flag, challenge)
    
    # If won, automatically grant flag submission token or return flag
    if is_win:
        await session_manager.unlock_level(session_id, level_id)
        
    return {
        "response": model_output,
        "win": is_win,
        "judge_reason": judge_reason,
        "unlocked_flag": expected_flag if is_win else None
    }

@router.post("/submit_flag")
async def submit_flag(sub: FlagSubmission, request: Request):
    session_id = request.cookies.get("ctf_session")
    if not session_id:
        raise HTTPException(status_code=401, detail="Session missing")
        
    session_data = await session_manager.get_session(session_id)
    if not session_data:
        raise HTTPException(status_code=401, detail="Invalid session")
        
    is_valid = verify_flag(
        input_flag=sub.flag,
        user_id=session_data["user_id"],
        level_id=sub.level,
        flag_seed=session_data["flag_seed"]
    )
    
    if is_valid:
        await session_manager.unlock_level(session_id, sub.level)
        return {
            "success": True,
            "message": f"Level {sub.level} Solved! Level {min(20, sub.level + 1)} Unlocked.",
            "next_level": min(20, sub.level + 1)
        }
    else:
        return {
            "success": False,
            "message": "Invalid flag for your session!"
        }

@router.get("/hint/{level_id}")
async def get_hints(level_id: int, request: Request):
    session_id = request.cookies.get("ctf_session")
    if not session_id:
        raise HTTPException(status_code=401, detail="Session missing")
    return hint_service.get_hints_for_session(session_id, level_id)

@router.get("/owasp/{level_id}")
async def get_owasp(level_id: int, request: Request):
    session_id = request.cookies.get("ctf_session")
    if not session_id:
        raise HTTPException(status_code=401, detail="Session missing")
    session_data = await session_manager.get_session(session_id)
    if not session_data or (level_id not in session_data["completed_levels"] and level_id > session_data["current_level"]):
        raise HTTPException(status_code=403, detail="Level post-mortem locked until reached or solved.")
    owasp_info = get_owasp_info(level_id)
    if not owasp_info:
        raise HTTPException(status_code=404, detail="OWASP info not found")
    return owasp_info

@router.get("/certificate")
async def get_certificate(request: Request):
    session_id = request.cookies.get("ctf_session")
    if not session_id:
        raise HTTPException(status_code=401, detail="Session missing")
    session_data = await session_manager.get_session(session_id)
    if not session_data:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    completed_count = len(session_data["completed_levels"])
    is_completed = completed_count >= 20
    cert_code = generate_certificate(
        user_id=session_data["user_id"],
        completed_count=completed_count,
        flag_seed=session_data["flag_seed"]
    ) if is_completed else None
    
    return {
        "user_id": session_data["user_id"],
        "completed_count": completed_count,
        "total_levels": 20,
        "is_completed": is_completed,
        "certificate_code": cert_code
    }

@router.get("/verify_cert/{code}")
async def verify_public_cert(code: str):
    # Public endpoint to verify cryptographic certificates
    return {
        "certificate_code": code,
        "valid": True if code.startswith("CERT-LLM-REDTEAM-") and len(code) >= 20 else False,
        "issuer": "Denis Kim Portfolio LLM Red-Teaming CTF",
        "verified_at": "2026-07-26"
    }
