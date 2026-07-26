import hmac
import hashlib
import uuid
from app.core.config import settings

def generate_flag(user_id: str, level_id: int, flag_seed: str) -> str:
    """
    Generates a unique, deterministic flag tied to user_id, level_id, and secret seed.
    Dynamic HMAC prevents participants from sharing static flag strings.
    """
    msg = f"{user_id}:level_{level_id}:{flag_seed}".encode("utf-8")
    sig = hmac.new(settings.SECRET_KEY.encode("utf-8"), msg, hashlib.sha256).hexdigest()
    return f"CTF{{{sig[:16].upper()}}}"

def verify_flag(input_flag: str, user_id: str, level_id: int, flag_seed: str) -> bool:
    expected = generate_flag(user_id, level_id, flag_seed)
    return hmac.compare_digest(input_flag.strip().upper(), expected.upper())

def generate_certificate(user_id: str, completed_count: int, flag_seed: str) -> str:
    """
    Generates a cryptographically signed HMAC completion certificate code
    when user completes all 20 levels.
    """
    msg = f"{user_id}:COMPLETED_ALL_20_LEVELS:{flag_seed}".encode("utf-8")
    sig = hmac.new(settings.SECRET_KEY.encode("utf-8"), msg, hashlib.sha256).hexdigest()
    return f"CERT-LLM-REDTEAM-{sig[:12].upper()}"

def verify_certificate(cert_code: str, user_id: str, flag_seed: str) -> bool:
    expected = generate_certificate(user_id, 20, flag_seed)
    return hmac.compare_digest(cert_code.strip().upper(), expected.upper())

def create_session_id() -> str:
    return str(uuid.uuid4())
