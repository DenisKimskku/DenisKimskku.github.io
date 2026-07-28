import os
import sys


def _require(name: str) -> str:
    """Fail closed. A missing signing key must stop the server, not silently
    fall back to a value that is public in this repository's history."""
    value = os.getenv(name)
    if not value:
        sys.exit(
            "FATAL: {0} is not set.\n"
            "  Generate one:  python3 -c 'import secrets; print(secrets.token_hex(32))'\n"
            "  Then add it to ~/Library/LaunchAgents/com.deniskim.ctf-backend.plist\n"
            "  under EnvironmentVariables, and export it for manual runs.\n".format(name)
        )
    return value


class Settings:
    PROJECT_NAME: str = "LLM Red-Teaming CTF Backend"
    API_V1_STR: str = "/api"

    # --- Signing keys -----------------------------------------------------
    # Previously one hardcoded literal served three incompatible purposes.
    # Splitting them is what makes rotation possible at all.

    # Re-derived on every /chat, so rotating this only invalidates flag strings
    # a player has already written down. Cheap to rotate.
    FLAG_HMAC_KEY: str = _require("CTF_FLAG_HMAC_KEY")

    # Accepted by verify_flag only, never by generate_flag. Set this to the old
    # key for a week after rotating, then delete the variable.
    LEGACY_FLAG_HMAC_KEY: str = os.getenv("CTF_LEGACY_FLAG_HMAC_KEY", "")

    # No certificate was ever successfully issued (the verify endpoint 500'd
    # from day one), so this rotates freely with no compatibility concern.
    CERT_HMAC_KEY: str = _require("CTF_CERT_HMAC_KEY")

    # NOT a secret and NOT rotatable. It salts sessions.ip_hash, a stored column
    # that cannot be recomputed because the raw ip/user-agent are never
    # persisted. Pinned to the historical value so existing session rows still
    # resolve. Retire it together with the ip_hash lookup itself.
    SESSION_HASH_SALT: str = os.getenv(
        "CTF_SESSION_HASH_SALT",
        "super-secret-ctf-hmac-key-change-in-production-2026",
    )

    # Shared secret for /api/admin/stats. Empty means the endpoint stays closed.
    ADMIN_TOKEN: str = os.getenv("CTF_ADMIN_TOKEN", "")

    # --- Network ----------------------------------------------------------
    # Loopback only: cloudflared connects over 127.0.0.1, so binding 0.0.0.0
    # exposed the unauthenticated API directly, bypassing Cloudflare entirely.
    BIND_HOST: str = os.getenv("CTF_BIND_HOST", "127.0.0.1")
    BIND_PORT: int = int(os.getenv("CTF_BIND_PORT", "8000"))

    SESSION_EXPIRE_SECONDS: int = 86400 * 7  # 7 days

    # --- Ollama local inference ------------------------------------------
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    TARGET_MODEL: str = os.getenv("TARGET_MODEL", "qwen3:8b")
    # Same model as the target ON PURPOSE. qwen3:8b is the only model installed,
    # and Jarvis (den-assistant) already holds it resident -- reusing it costs
    # zero extra VRAM, whereas a second model would force a second load and
    # evict Jarvis's warm context.
    JUDGE_MODEL: str = os.getenv("JUDGE_MODEL", "qwen3:8b")

    # --- Generation constraints (Mac Mini, 16GB) --------------------------
    # qwen3 is a reasoning model: thinking tokens are drawn from the SAME
    # num_predict budget as the answer. At the old 300/80 the answer was empty
    # on every judge call and ~25% of target calls. All model calls now run
    # with think=False, and these budgets assume that.
    MAX_TOKENS: int = 512
    JUDGE_MAX_TOKENS: int = 8       # one word: WIN / LOSS
    GUARD_MAX_TOKENS: int = 8       # one word: ALLOW / BLOCK, APPROVE / REJECT
    CONTEXT_WINDOW: int = 2048
    # llama-server runs with -np 1, so anything above 1 only deepens a queue
    # that nothing currently bounds.
    MAX_CONCURRENT_INFERENCE: int = 1
    INFERENCE_TIMEOUT: float = 90.0
    # Long enough to survive one request ahead, short enough to answer well
    # before Cloudflare's ~100s 524.
    QUEUE_TIMEOUT: float = 25.0
    MAX_QUEUE_DEPTH: int = 3

    # --- VRAM residency policy -------------------------------------------
    # The CTF is the LOWEST-priority consumer of the local model. It must never
    # be the reason a model sits in VRAM all day.
    #
    # keep_alive is global per model in Ollama, and Jarvis (den-assistant) runs
    # the SAME qwen3:8b with keep_alive "24h" on purpose -- re-prefilling its
    # ~4400-token tool prompt costs ~22s. So a naive short keep_alive from the
    # CTF would evict Jarvis's warm model, which is exactly backwards.
    #
    # Policy, implemented in scheduler.effective_keep_alive():
    #   - model not resident      -> load with CTF_KEEP_ALIVE (short, on-demand)
    #   - resident, expiry sooner -> CTF_KEEP_ALIVE (we are the only user)
    #   - resident, expiry later  -> preserve the existing expiry, never shorten
    # Net effect: the CTF extends nothing and evicts nothing.
    CTF_KEEP_ALIVE: str = os.getenv("CTF_KEEP_ALIVE", "5m")

    # --- Priority / yielding ---------------------------------------------
    # Higher-priority local workloads. The CTF defers to these.
    #   1. Jarvis (den-assistant) - local qwen3:8b, interactive voice.
    #   2. Nightly writing pipeline - Gemini (cloud), so no VRAM contention,
    #      but CPU/network heavy. Quiet window below.
    JARVIS_LOG_PATH: str = os.getenv(
        "CTF_JARVIS_LOG", "/Users/den/Documents/den-assistant/logs/den.log"
    )
    # If Jarvis's log was written within this many seconds, treat it as mid-turn.
    JARVIS_ACTIVE_WINDOW_S: float = 45.0
    JARVIS_PROCESS_PATTERN: str = "den.main"
    # Local hours during which the nightly pipeline runs (feed 02:00,
    # dailykb 03:30, kbrefresh Sun 03:00). CTF sheds load rather than competing.
    QUIET_HOURS: tuple = (2, 5)


settings = Settings()
