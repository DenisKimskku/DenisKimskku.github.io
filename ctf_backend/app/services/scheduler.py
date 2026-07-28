"""Priority-aware scheduling for a shared, single-GPU Mac Mini.

The CTF is the LOWEST-priority consumer of the local model. Two higher-priority
workloads share this machine:

  1. Jarvis (den-assistant) -- interactive voice assistant, runs the SAME
     qwen3:8b over the same Ollama daemon, and deliberately pins it with
     keep_alive "24h" because re-prefilling its ~4400-token tool prompt costs
     ~22s. A human is waiting on every one of its turns.
  2. The nightly writing pipeline (security feed 02:00, KB maintenance 03:30,
     KB refresh Sun 03:00). It calls Gemini, so it does not contend for VRAM,
     but it is CPU- and network-heavy.

Two rules follow, and this module exists to enforce them.

RULE 1 -- the CTF never changes anyone else's VRAM residency.
    keep_alive is global per model in Ollama: the last writer wins. The old code
    had judge.py sending "24h" and scheduler.py sending "5m" on every level
    page view, so the two fought over one global setting (59 model reloads in
    ollama.log). Worse, either value silently overrides whatever Jarvis set.
    effective_keep_alive() reads the current expiry and never shortens it, so
    the CTF can neither pin the model all day nor evict a warm Jarvis.

RULE 2 -- the CTF yields, and says so.
    should_yield() reports a concrete reason. Callers turn that into a 503 with
    Retry-After, never a silently dropped request. The previous code returned
    {"queued": true, "response": "processing shortly"} and then threw the
    request away.
"""

import asyncio
import contextlib
import os
import time
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import httpx

from app.core.config import settings

# Ollama keep_alive accepts Go duration strings. We only need to compare ours
# against a remaining-seconds figure, so parse the handful of forms we emit.
_UNIT_SECONDS = {"s": 1, "m": 60, "h": 3600}


def _duration_to_seconds(value: str) -> float:
    value = (value or "").strip()
    if not value:
        return 0.0
    try:
        if value[-1] in _UNIT_SECONDS:
            return float(value[:-1]) * _UNIT_SECONDS[value[-1]]
        return float(value)
    except ValueError:
        return 0.0


def _parse_expiry(expires_at: str) -> Optional[float]:
    """Seconds from now until Ollama unloads the model, or None if unknown."""
    if not expires_at:
        return None
    text = expires_at.strip()
    # Python 3.9's fromisoformat rejects 'Z' and sub-microsecond precision.
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    if "." in text:
        head, _, tail = text.partition(".")
        digits = "".join(c for c in tail if c.isdigit())[:6]
        offset = tail[len(digits):] if len(tail) > len(digits) else ""
        # Recover a trailing timezone offset that got caught in the fraction.
        for marker in ("+", "-"):
            if marker in tail:
                offset = tail[tail.index(marker):]
                break
        text = f"{head}.{digits or '0'}{offset}"
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.timestamp() - time.time()
    return parsed.timestamp() - time.time()


class OllamaScheduler:
    def __init__(self) -> None:
        self._warm_task: Optional[asyncio.Task] = None
        self._last_warm = 0.0
        self.WARM_COOLDOWN = 120.0
        # /api/ps is on the hot path for every inference; cache it briefly.
        self._ps_cache: Tuple[float, List[Dict[str, Any]]] = (0.0, [])
        self._PS_TTL = 5.0

    # ------------------------------------------------------------------
    # Ollama introspection
    # ------------------------------------------------------------------
    async def get_running_models(self, max_age: Optional[float] = None) -> List[Dict[str, Any]]:
        ttl = self._PS_TTL if max_age is None else max_age
        cached_at, cached = self._ps_cache
        if time.monotonic() - cached_at < ttl:
            return cached
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{settings.OLLAMA_BASE_URL}/api/ps")
                if res.status_code == 200:
                    models = res.json().get("models", [])
                    self._ps_cache = (time.monotonic(), models)
                    return models
        except Exception:
            pass
        return cached

    async def _target_residency(self) -> Optional[float]:
        """Seconds of remaining residency for our target model, or None."""
        target = settings.TARGET_MODEL.lower()
        for model in await self.get_running_models():
            name = (model.get("name") or model.get("model") or "").lower()
            if name == target or name.startswith(target.split(":")[0] + ":"):
                return _parse_expiry(model.get("expires_at", ""))
        return None

    async def effective_keep_alive(self) -> str:
        """The keep_alive to send, honouring RULE 1.

        Never shortens an existing residency. If Jarvis has the model pinned for
        the next 24 hours, we echo roughly that back rather than knocking it down
        to our own 5 minutes and forcing a ~22s re-prefill on Jarvis's next turn.
        """
        ours = settings.CTF_KEEP_ALIVE
        remaining = await self._target_residency()
        if remaining is None:
            # Not loaded, or expiry unreadable: load on demand, short lease.
            return ours
        if remaining <= _duration_to_seconds(ours):
            # We are effectively the only user; our own short lease is fine.
            return ours
        # Somebody with a longer lease owns this model. Preserve their expiry.
        return f"{int(remaining) + 30}s"

    # ------------------------------------------------------------------
    # Priority
    # ------------------------------------------------------------------
    def _jarvis_running(self) -> bool:
        try:
            with os.popen(f"pgrep -f {settings.JARVIS_PROCESS_PATTERN!r} 2>/dev/null") as handle:
                return bool(handle.read().strip())
        except Exception:
            return False

    def _jarvis_recently_active(self) -> bool:
        """Jarvis writes to its log on every turn; a fresh mtime means a human
        is mid-conversation with it right now."""
        try:
            age = time.time() - os.path.getmtime(settings.JARVIS_LOG_PATH)
            return age < settings.JARVIS_ACTIVE_WINDOW_S
        except OSError:
            return False

    def _in_quiet_hours(self) -> bool:
        start, end = settings.QUIET_HOURS
        hour = datetime.now().hour
        if start <= end:
            return start <= hour < end
        return hour >= start or hour < end

    async def should_yield(self) -> Optional[str]:
        """Return a human-readable reason to shed this request, or None.

        Ordered by how much a human is waiting on the other side.
        """
        if self._jarvis_recently_active() and self._jarvis_running():
            return ("The voice assistant on this machine is mid-conversation and has "
                    "priority on the GPU. Retry in a few seconds.")

        if self._in_quiet_hours():
            return ("The nightly research pipeline is running (02:00-05:00 KST). "
                    "The CTF sheds load during that window.")

        # Any non-CTF model resident means another workload owns the accelerator.
        # NOTE: this cannot see Jarvis, which shares our exact model name -- that
        # is what the log/process checks above are for. The old implementation
        # matched JARVIS_KEYWORDS ("jarvis", "assistant", "code", "agent")
        # against Ollama model names, which never matched anything real.
        target = settings.TARGET_MODEL.lower()
        judge = settings.JUDGE_MODEL.lower()
        for model in await self.get_running_models():
            name = (model.get("name") or model.get("model") or "").lower()
            if name and name not in (target, judge):
                return (f"Another local workload ({name}) currently holds the GPU. "
                        "Retry shortly.")
        return None

    # ------------------------------------------------------------------
    # Warmup
    # ------------------------------------------------------------------
    def schedule_warmup(self) -> None:
        """Fire-and-forget model warmup. Never raises, never blocks.

        Deduped and reference-retained: the old code called
        asyncio.create_task() on every GET /level/{id} without keeping a
        reference (so CPython could collect it mid-flight) and without any
        cooldown, so clicking through 20 levels fired 20 warmups.
        """
        now = time.monotonic()
        if now - self._last_warm < self.WARM_COOLDOWN:
            return
        if self._warm_task is not None and not self._warm_task.done():
            return
        self._last_warm = now
        self._warm_task = asyncio.create_task(self._warmup())
        # Retrieve the exception so a failed warmup is not an unhandled task.
        self._warm_task.add_done_callback(
            lambda t: t.cancelled() or t.exception()
        )

    async def _warmup(self) -> None:
        # Never warm on behalf of the CTF while a higher-priority workload is
        # active -- a warmup is by definition speculative, so it is the first
        # thing that should give way.
        if await self.should_yield():
            return
        payload = {
            "model": settings.TARGET_MODEL,
            "prompt": "",
            "think": False,
            "keep_alive": await self.effective_keep_alive(),
            "options": {"num_predict": 1, "num_ctx": settings.CONTEXT_WINDOW},
        }
        with contextlib.suppress(Exception):
            # A cold load of an 8B model takes 4-11s; the old 5.0s timeout
            # aborted exactly the case warmup exists for.
            async with httpx.AsyncClient(timeout=30.0) as client:
                await client.post(f"{settings.OLLAMA_BASE_URL}/api/generate", json=payload)


scheduler = OllamaScheduler()
