import asyncio
import httpx
import time
from typing import Dict, Any, List, Optional
from app.core.config import settings

class OllamaScheduler:
    def __init__(self):
        self.lock = asyncio.Lock()
        self.last_used_time = 0.0

    async def get_running_models(self) -> List[Dict[str, Any]]:
        """Inspects Ollama active processes via GET /api/ps"""
        url = f"{settings.OLLAMA_BASE_URL}/api/ps"
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    return res.json().get("models", [])
        except Exception:
            pass
        return []

    async def is_external_agent_active(self) -> bool:
        """Returns True if Jarvis or a non-CTF model is currently running in Ollama"""
        running = await self.get_running_models()
        for m in running:
            name = m.get("name", "").lower()
            if any(kw in name for kw in settings.JARVIS_KEYWORDS) and settings.TARGET_MODEL.lower() not in name:
                return True
        return False

    async def warmup_target_model_async(self):
        """
        Background Async Pre-fetch Warmup:
        Triggered when user clicks a level, starting model load in memory 
        *before* user finishes typing prompt!
        """
        url = f"{settings.OLLAMA_BASE_URL}/api/generate"
        payload = {
            "model": settings.TARGET_MODEL,
            "prompt": "",
            "keep_alive": settings.IDLE_KEEP_ALIVE,
            "options": {"num_predict": 1, "num_ctx": 512}
        }
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(url, json=payload)
        except Exception:
            pass

scheduler = OllamaScheduler()
