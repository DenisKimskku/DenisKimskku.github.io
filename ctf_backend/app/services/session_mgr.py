import asyncio
from typing import Any, Dict, Optional, Tuple

from app.services.db_session import db_session


class SessionManager:
    """Thin async facade over the synchronous sqlite3 layer.

    Every call is dispatched to a worker thread. Running it inline blocked the
    single event-loop thread for the duration of any lock wait (sqlite3's
    default is 5s), stalling every other request -- including in-flight SSE
    streams from /chat/stream.
    """

    async def get_or_create_session(
        self,
        session_id: Optional[str] = None,
        ip_address: str = "127.0.0.1",
        user_agent: str = "",
    ) -> Tuple[str, Dict[str, Any]]:
        return await asyncio.to_thread(
            db_session.get_or_create_session, ip_address, user_agent, session_id
        )

    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        return await asyncio.to_thread(db_session.get_session, session_id)

    async def unlock_level(self, session_id: str, level_id: int) -> bool:
        return await asyncio.to_thread(db_session.unlock_level, session_id, level_id)


session_manager = SessionManager()
