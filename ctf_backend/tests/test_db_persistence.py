import os
import time
import sqlite3
from app.services.db_session import db_session, DB_PATH, hash_ip
from app.services.hints import hint_service

def test_sqlite_db_session_persistence():
    test_ip = f"198.51.100.{int(time.time()) % 250}"
    user_agent = "Mozilla/5.0 TestAgent"
    
    # 1. Create initial session for test IP
    session_id, data1 = db_session.get_or_create_session(test_ip, user_agent)
    assert data1["current_level"] == 1
    assert data1["completed_levels"] == []
    
    # 2. Unlock Level 1 and Level 2
    db_session.unlock_level(session_id, 1)
    db_session.unlock_level(session_id, 2)
    
    # 3. Record attempts
    count1 = hint_service.record_attempt(session_id, 3)
    assert count1 >= 1
    
    # 4. Simulate server restart: query session strictly by IP hash without cookie
    session_id2, data2 = db_session.get_or_create_session(test_ip, user_agent, cookie_session_id=None)
    assert session_id2 == session_id
    assert 1 in data2["completed_levels"]
    assert 2 in data2["completed_levels"]
    assert data2["current_level"] >= 3
    assert data2["flag_seed"] == data1["flag_seed"]
