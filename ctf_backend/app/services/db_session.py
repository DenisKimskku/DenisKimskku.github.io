import sqlite3
import hashlib
import json
import os
import time
from typing import Dict, Any, Tuple, Optional
from app.core.config import settings
from app.core.security import create_session_id

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "ctf_progress.db")

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")
    
    # Sessions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            user_id TEXT UNIQUE NOT NULL,
            ip_hash TEXT NOT NULL,
            current_level INTEGER NOT NULL DEFAULT 1,
            completed_levels TEXT NOT NULL DEFAULT '[]',
            flag_seed TEXT NOT NULL,
            created_at REAL NOT NULL,
            last_active REAL NOT NULL
        )
    """)
    
    # Attempts table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS attempts (
            user_id TEXT NOT NULL,
            level_id INTEGER NOT NULL,
            attempt_count INTEGER NOT NULL DEFAULT 0,
            last_attempt REAL NOT NULL,
            PRIMARY KEY (user_id, level_id)
        )
    """)
    
    conn.commit()
    conn.close()

# Initialize DB on module import
init_db()

def hash_ip(ip_address: str, user_agent: str = "") -> str:
    msg = f"{ip_address}:{user_agent}:{settings.SECRET_KEY}".encode("utf-8")
    return hashlib.sha256(msg).hexdigest()[:16]

class DBSessionManager:
    def get_or_create_session(self, ip_address: str, user_agent: str = "", cookie_session_id: Optional[str] = None) -> Tuple[str, Dict[str, Any]]:
        ip_h = hash_ip(ip_address, user_agent)
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        now = time.time()
        
        # 1. First, check if a session exists for cookie_session_id
        if cookie_session_id:
            cursor.execute("SELECT session_id, user_id, ip_hash, current_level, completed_levels, flag_seed FROM sessions WHERE session_id = ?", (cookie_session_id,))
            row = cursor.fetchone()
            if row:
                s_id, u_id, ip_h, curr_lvl, comp_json, flag_seed = row
                cursor.execute("UPDATE sessions SET last_active = ? WHERE session_id = ?", (now, s_id))
                conn.commit()
                conn.close()
                return s_id, {
                    "session_id": s_id,
                    "user_id": u_id,
                    "current_level": curr_lvl,
                    "completed_levels": json.loads(comp_json),
                    "flag_seed": flag_seed
                }
                
        # 2. Check if a session exists for ip_h
        cursor.execute("SELECT session_id, user_id, ip_hash, current_level, completed_levels, flag_seed FROM sessions WHERE ip_hash = ?", (ip_h,))
        row = cursor.fetchone()
        if row:
            s_id, u_id, ip_h, curr_lvl, comp_json, flag_seed = row
            cursor.execute("UPDATE sessions SET last_active = ? WHERE session_id = ?", (now, s_id))
            conn.commit()
            conn.close()
            return s_id, {
                "session_id": s_id,
                "user_id": u_id,
                "current_level": curr_lvl,
                "completed_levels": json.loads(comp_json),
                "flag_seed": flag_seed
            }
            
        # 3. Create new persistent session
        new_session_id = create_session_id()
        new_user_id = f"user_{ip_h[:8]}"
        flag_seed = create_session_id()
        comp_json = "[]"
        
        cursor.execute("""
            INSERT INTO sessions (session_id, user_id, ip_hash, current_level, completed_levels, flag_seed, created_at, last_active)
            VALUES (?, ?, ?, 1, '[]', ?, ?, ?)
        """, (new_session_id, new_user_id, ip_h, flag_seed, now, now))
        
        conn.commit()
        conn.close()
        
        return new_session_id, {
            "session_id": new_session_id,
            "user_id": new_user_id,
            "current_level": 1,
            "completed_levels": [],
            "flag_seed": flag_seed
        }

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT session_id, user_id, ip_hash, current_level, completed_levels, flag_seed FROM sessions WHERE session_id = ?", (session_id,))
        row = cursor.fetchone()
        conn.close()
        if row:
            s_id, u_id, ip_h, curr_lvl, comp_json, flag_seed = row
            return {
                "session_id": s_id,
                "user_id": u_id,
                "current_level": curr_lvl,
                "completed_levels": json.loads(comp_json),
                "flag_seed": flag_seed
            }
        return None

    def unlock_level(self, session_id: str, level_id: int):
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT current_level, completed_levels FROM sessions WHERE session_id = ?", (session_id,))
        row = cursor.fetchone()
        if row:
            curr_lvl, comp_json = row
            completed = json.loads(comp_json)
            if level_id not in completed:
                completed.append(level_id)
            new_curr = max(curr_lvl, min(20, level_id + 1))
            cursor.execute("UPDATE sessions SET current_level = ?, completed_levels = ?, last_active = ? WHERE session_id = ?",
                           (new_curr, json.dumps(completed), time.time(), session_id))
            conn.commit()
        conn.close()

    def get_admin_stats(self) -> Dict[str, Any]:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM sessions")
        total_sessions = cursor.fetchone()[0]
        
        cursor.execute("SELECT completed_levels FROM sessions")
        rows = cursor.fetchall()
        
        total_completions = 0
        level_counts = {}
        for (comp_json,) in rows:
            try:
                levels = json.loads(comp_json)
                total_completions += len(levels)
                for lvl in levels:
                    level_counts[lvl] = level_counts.get(lvl, 0) + 1
            except Exception:
                pass
                
        cursor.execute("SELECT COUNT(*) FROM attempts")
        total_attempts = cursor.fetchone()[0]
        
        conn.close()
        return {
            "total_sessions": total_sessions,
            "total_flags_captured": total_completions,
            "total_recorded_attempts": total_attempts,
            "level_completions": level_counts
        }

db_session = DBSessionManager()
