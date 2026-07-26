import os
from typing import List

class Settings:
    PROJECT_NAME: str = "LLM Red-Teaming CTF Backend"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-ctf-hmac-key-change-in-production-2026")
    SESSION_EXPIRE_SECONDS: int = 86400 * 7  # 7 days
    
    # Redis
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_DB: int = 0
    
    # Ollama Local Inference (qwen3:8b installed on Mac Mini)
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    TARGET_MODEL: str = os.getenv("TARGET_MODEL", "qwen3:8b")
    JUDGE_MODEL: str = os.getenv("JUDGE_MODEL", "qwen3:8b")
    
    # Max LLM generation constraints for Mac Mini 16GB
    MAX_TOKENS: int = 200
    CONTEXT_WINDOW: int = 2048
    MAX_CONCURRENT_INFERENCE: int = 2
    IDLE_KEEP_ALIVE: str = "5m"
    JARVIS_KEYWORDS: List[str] = ["jarvis", "assistant", "code", "agent"]

settings = Settings()
