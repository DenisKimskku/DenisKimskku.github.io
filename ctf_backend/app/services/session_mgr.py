import json
from typing import Dict, Any, Optional, Tuple
from app.services.db_session import db_session

class SessionManager:
    async def get_or_create_session(
        self, 
        session_id: Optional[str] = None, 
        ip_address: str = "127.0.0.1", 
        user_agent: str = ""
    ) -> Tuple[str, Dict[str, Any]]:
        return db_session.get_or_create_session(ip_address, user_agent, session_id)

    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        return db_session.get_session(session_id)

    async def unlock_level(self, session_id: str, level_id: int):
        db_session.unlock_level(session_id, level_id)

session_manager = SessionManager()
