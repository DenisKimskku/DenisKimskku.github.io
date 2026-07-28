import base64
import hashlib
import hmac
import time
import uuid
from typing import Any, Dict, Optional

from app.core.config import settings

CERT_VERSION = "v1"
CERT_PREFIX = "CERT-LLM-REDTEAM-"


def _flag_for_key(user_id: str, level_id: int, flag_seed: str, key: str) -> str:
    msg = f"{user_id}:level_{level_id}:{flag_seed}".encode("utf-8")
    sig = hmac.new(key.encode("utf-8"), msg, hashlib.sha256).hexdigest()
    return f"CTF{{{sig[:16].upper()}}}"


def generate_flag(user_id: str, level_id: int, flag_seed: str) -> str:
    """Per-session, per-level flag.

    Unforgeable without flag_seed (uuid4, 122 bits, server-side only) even by
    someone holding FLAG_HMAC_KEY.
    """
    return _flag_for_key(user_id, level_id, flag_seed, settings.FLAG_HMAC_KEY)


def verify_flag(input_flag: str, user_id: str, level_id: int, flag_seed: str) -> bool:
    candidate = (input_flag or "").strip().upper()

    # hmac.compare_digest raises TypeError on non-ASCII str operands, which
    # turned any non-ASCII submission into an unhandled 500 on an endpoint with
    # no rate limit. A flag is 21 ASCII characters, so anything else is
    # definitionally wrong.
    if not candidate or len(candidate) > 64 or not candidate.isascii():
        return False

    matched = False
    for key in (settings.FLAG_HMAC_KEY, settings.LEGACY_FLAG_HMAC_KEY):
        if not key:
            continue
        # No early break: keep the number of comparisons independent of which
        # key matched.
        expected = _flag_for_key(user_id, level_id, flag_seed, key).upper()
        matched |= hmac.compare_digest(candidate, expected)
    return matched


def _b64u(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _b64u_dec(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def generate_certificate(user_id: str, completed_count: int, issued_at: Optional[int] = None) -> str:
    """Self-describing completion token: CERT-LLM-REDTEAM-<payload>.<sig>

    The payload travels inside the token, so verify_certificate recomputes the
    MAC from the token alone. The previous scheme signed the holder's flag_seed,
    which never leaves the server -- meaning no third party could ever verify a
    certificate, which is the entire point of issuing one.
    """
    issued_at = int(time.time() if issued_at is None else issued_at)
    if ":" in user_id:
        raise ValueError("user_id must not contain ':'")
    payload = f"{CERT_VERSION}:{user_id}:{int(completed_count)}:{issued_at}".encode("utf-8")
    sig = hmac.new(settings.CERT_HMAC_KEY.encode("utf-8"), payload, hashlib.sha256).digest()[:16]
    return f"{CERT_PREFIX}{_b64u(payload)}.{_b64u(sig)}"


def verify_certificate(cert_code: str) -> Dict[str, Any]:
    """Verify a certificate from the token alone. Never raises."""
    invalid: Dict[str, Any] = {
        "valid": False,
        "user_id": None,
        "completed_levels": None,
        "issued_at": None,
    }

    code = (cert_code or "").strip()
    if not code.startswith(CERT_PREFIX) or len(code) > 512:
        return invalid

    body = code[len(CERT_PREFIX):]
    if body.count(".") != 1:
        return invalid

    payload_b64, sig_b64 = body.split(".")
    try:
        payload, sig = _b64u_dec(payload_b64), _b64u_dec(sig_b64)
    except Exception:
        return invalid

    expected = hmac.new(
        settings.CERT_HMAC_KEY.encode("utf-8"), payload, hashlib.sha256
    ).digest()[:16]
    if not hmac.compare_digest(sig, expected):
        return invalid

    try:
        version, user_id, completed, issued_at = payload.decode("utf-8").split(":")
        if version != CERT_VERSION:
            return invalid
        return {
            "valid": True,
            "user_id": user_id,
            "completed_levels": int(completed),
            "issued_at": int(issued_at),
        }
    except Exception:
        return invalid


def create_session_id() -> str:
    return str(uuid.uuid4())
