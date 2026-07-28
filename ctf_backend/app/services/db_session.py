import contextlib
import hashlib
import json
import os
import secrets
import sqlite3
import time
from typing import Any, Dict, Optional, Tuple

from app.core.config import settings
from app.core.security import create_session_id

_DEFAULT_DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "ctf_progress.db"
)
# Overridable so the test suite can point at a temp file. Without this the test
# suite writes to the live player database -- which the previous tests did.
DB_PATH = os.environ.get("CTF_DB_PATH") or _DEFAULT_DB_PATH


@contextlib.contextmanager
def _connect():
    """One short-lived connection per call, always closed.

    - timeout=15: the sqlite3 default is 5s, long enough to stall every request
      on the event loop but short enough to trip during a backup.
    - isolation_level=None: no implicit BEGIN, so transactions are explicit.
    - check_same_thread=False: calls are dispatched via asyncio.to_thread.
    """
    conn = sqlite3.connect(DB_PATH, timeout=15.0, isolation_level=None, check_same_thread=False)
    try:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA busy_timeout=15000")
        conn.execute("PRAGMA synchronous=NORMAL")
        yield conn
    finally:
        conn.close()


def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with _connect() as conn:
        conn.execute(
            """
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
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS attempts (
                user_id TEXT NOT NULL,
                level_id INTEGER NOT NULL,
                attempt_count INTEGER NOT NULL DEFAULT 0,
                last_attempt REAL NOT NULL,
                PRIMARY KEY (user_id, level_id)
            )
            """
        )
        # Level 13 is the only multi-turn level: it renders a raw chat
        # transcript so the player has real role markers to forge.
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS turns (
                session_id TEXT NOT NULL,
                level_id INTEGER NOT NULL,
                seq INTEGER NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at REAL NOT NULL,
                PRIMARY KEY (session_id, level_id, seq)
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_sessions_ip_hash ON sessions(ip_hash)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_sessions_last_active ON sessions(last_active)")


init_db()


def hash_ip(ip_address: str, user_agent: str = "") -> str:
    # The user-agent is attacker-controlled and unbounded; truncate it so it
    # cannot be used to mint unlimited distinct session rows from one IP.
    msg = f"{ip_address}:{user_agent[:120]}:{settings.SESSION_HASH_SALT}".encode("utf-8")
    return hashlib.sha256(msg).hexdigest()[:16]


def _row_to_dict(row) -> Dict[str, Any]:
    s_id, u_id, curr_lvl, comp_json, flag_seed = row
    try:
        completed = json.loads(comp_json)
    except Exception:
        completed = []
    return {
        "session_id": s_id,
        "user_id": u_id,
        "current_level": curr_lvl,
        "completed_levels": completed,
        "flag_seed": flag_seed,
    }


_SELECT = (
    "SELECT session_id, user_id, current_level, completed_levels, flag_seed "
    "FROM sessions WHERE {0} = ?"
)


class DBSessionManager:
    def get_or_create_session(
        self,
        ip_address: str,
        user_agent: str = "",
        cookie_session_id: Optional[str] = None,
    ) -> Tuple[str, Dict[str, Any]]:
        now = time.time()
        with _connect() as conn:
            # Tier 1: an explicit session id from the X-Session-ID header or the
            # ctf_session cookie.
            if cookie_session_id:
                row = conn.execute(_SELECT.format("session_id"), (cookie_session_id,)).fetchone()
                if row:
                    conn.execute(
                        "UPDATE sessions SET last_active = ? WHERE session_id = ?", (now, row[0])
                    )
                    return row[0], _row_to_dict(row)

            # There is deliberately NO IP/User-Agent fallback here.
            #
            # SHA256(ip:user_agent) is not an identity. Everyone behind one NAT
            # running the same browser build collides onto a single row and
            # therefore shares that row's flag_seed -- which means strangers
            # share flags, defeating the entire per-session HMAC design. The
            # converse was just as bad: a browser auto-update changes the UA
            # string, the hash misses, and the player silently restarts at
            # level 1 with all progress apparently gone.
            #
            # An unrecognised client now gets a fresh session, never somebody
            # else's. Recovery is explicit instead: /api/status returns the
            # session_id, the UI surfaces it as a copyable resume code, and
            # pasting it back restores the session on any device.
            ip_h = hash_ip(ip_address, user_agent)  # retained for abuse analytics only

            # Brand-new session.
            new_session_id = create_session_id()
            # Random, not derived from ip_hash. The old scheme made user_id a
            # public hash of (ip, user-agent) -- with the key public, that is
            # directly invertible back to a player's IP address, and user_id is
            # printed on the shareable completion certificate.
            new_user_id = "user_" + secrets.token_hex(4)
            flag_seed = create_session_id()

            conn.execute(
                "INSERT INTO sessions (session_id, user_id, ip_hash, current_level, "
                "completed_levels, flag_seed, created_at, last_active) "
                "VALUES (?, ?, ?, 1, '[]', ?, ?, ?)",
                (new_session_id, new_user_id, ip_h, flag_seed, now, now),
            )
            return new_session_id, {
                "session_id": new_session_id,
                "user_id": new_user_id,
                "current_level": 1,
                "completed_levels": [],
                "flag_seed": flag_seed,
            }

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        with _connect() as conn:
            row = conn.execute(_SELECT.format("session_id"), (session_id,)).fetchone()
            return _row_to_dict(row) if row else None

    def unlock_level(self, session_id: str, level_id: int) -> bool:
        if not 1 <= int(level_id) <= 20:
            return False
        with _connect() as conn:
            try:
                # BEGIN IMMEDIATE takes the write lock before the SELECT, making
                # the read-modify-write atomic against any concurrent writer.
                # Without it, 20 concurrent unlocks against one session leave
                # exactly 1 completion recorded.
                conn.execute("BEGIN IMMEDIATE")
                row = conn.execute(
                    "SELECT current_level, completed_levels FROM sessions WHERE session_id = ?",
                    (session_id,),
                ).fetchone()
                if row is None:
                    conn.execute("ROLLBACK")
                    return False

                curr_lvl, comp_json = row
                try:
                    existing = {int(x) for x in json.loads(comp_json)}
                except Exception:
                    existing = set()
                completed = sorted(existing | {int(level_id)})
                new_curr = max(int(curr_lvl), min(20, int(level_id) + 1))

                conn.execute(
                    "UPDATE sessions SET current_level = ?, completed_levels = ?, "
                    "last_active = ? WHERE session_id = ?",
                    (new_curr, json.dumps(completed), time.time(), session_id),
                )
                conn.execute("COMMIT")
                return True
            except Exception:
                with contextlib.suppress(Exception):
                    conn.execute("ROLLBACK")
                raise

    # --- Dialogue history ------------------------------------------------
    # Level 13 renders these RAW so its role markers are forgeable; every other
    # multi-turn level renders them through level_mechanics.neutralize_replayed.
    MAX_TURNS = 6

    def get_turns(self, session_id: str, level_id: int, limit: Optional[int] = None) -> list:
        limit = self.MAX_TURNS if limit is None else max(0, int(limit))
        if not limit:
            return []
        with _connect() as conn:
            rows = conn.execute(
                "SELECT role, content FROM turns WHERE session_id = ? AND level_id = ? "
                "ORDER BY seq DESC LIMIT ?",
                (session_id, level_id, limit),
            ).fetchall()
        return [{"role": r, "content": c} for r, c in reversed(rows)]

    def _insert_turn(self, conn, session_id, level_id, seq, role, content) -> None:
        conn.execute(
            "INSERT INTO turns (session_id, level_id, seq, role, content, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (session_id, level_id, seq, role,
             (content or "")[: settings.HISTORY_MAX_CHARS], time.time()),
        )

    def _prune_locked(self, conn, session_id, level_id, newest_seq) -> None:
        # Unbounded history is a memory-growth lever on attacker-authored text.
        conn.execute(
            "DELETE FROM turns WHERE session_id = ? AND level_id = ? AND seq <= ?",
            (session_id, level_id, newest_seq - settings.HISTORY_STORE_MAX_MESSAGES),
        )

    def append_exchange(self, session_id: str, level_id: int,
                        user_content: str, assistant_content: str) -> None:
        """Write BOTH halves of one turn in a single transaction.

        Two separate appends are two transactions: a player with a second tab
        open can interleave them and produce a stored transcript in which an
        assistant reply precedes the question it answers. That is a free forgery
        primitive, because the renderer trusts the stored order.

        `assistant_content` must be the POST-guardrail text -- exactly the bytes
        the player received. Storing the raw draft would make the level-17/18
        reviewer a no-op across turns and would re-admit a redacted flag into the
        model's context on levels 8/9.
        """
        with _connect() as conn:
            try:
                conn.execute("BEGIN IMMEDIATE")
                base = conn.execute(
                    "SELECT COALESCE(MAX(seq), 0) FROM turns WHERE session_id = ? AND level_id = ?",
                    (session_id, level_id),
                ).fetchone()[0]
                self._insert_turn(conn, session_id, level_id, base + 1, "user", user_content)
                self._insert_turn(conn, session_id, level_id, base + 2, "assistant", assistant_content)
                self._prune_locked(conn, session_id, level_id, base + 2)
                conn.execute("COMMIT")
            except Exception:
                with contextlib.suppress(Exception):
                    conn.execute("ROLLBACK")
                raise

    def append_turn(self, session_id: str, level_id: int, role: str, content: str) -> None:
        """Single-message append, for callers that genuinely have only one half."""
        with _connect() as conn:
            try:
                conn.execute("BEGIN IMMEDIATE")
                base = conn.execute(
                    "SELECT COALESCE(MAX(seq), 0) FROM turns WHERE session_id = ? AND level_id = ?",
                    (session_id, level_id),
                ).fetchone()[0]
                self._insert_turn(conn, session_id, level_id, base + 1, role, content)
                self._prune_locked(conn, session_id, level_id, base + 1)
                conn.execute("COMMIT")
            except Exception:
                with contextlib.suppress(Exception):
                    conn.execute("ROLLBACK")
                raise

    def clear_turns(self, session_id: str, level_id: Optional[int] = None) -> int:
        """Delete this session's conversation. Returns messages removed.

        Touches the `turns` table and NOTHING else, by construction. Clearing is
        a CONTEXT operation: completed_levels, current_level, the per-level
        attempt counters that gate hints, and flag_seed are all unreachable from
        here. Regenerating flag_seed in particular would invalidate a flag the
        player has already written down.
        """
        with _connect() as conn:
            try:
                conn.execute("BEGIN IMMEDIATE")
                if level_id is None:
                    cur = conn.execute("DELETE FROM turns WHERE session_id = ?", (session_id,))
                else:
                    cur = conn.execute(
                        "DELETE FROM turns WHERE session_id = ? AND level_id = ?",
                        (session_id, int(level_id)),
                    )
                removed = max(0, cur.rowcount or 0)
                conn.execute("COMMIT")
                return removed
            except Exception:
                with contextlib.suppress(Exception):
                    conn.execute("ROLLBACK")
                raise

    def count_turns(self, session_id: str, level_id: Optional[int] = None) -> int:
        with _connect() as conn:
            if level_id is None:
                row = conn.execute("SELECT COUNT(*) FROM turns WHERE session_id = ?",
                                   (session_id,)).fetchone()
            else:
                row = conn.execute(
                    "SELECT COUNT(*) FROM turns WHERE session_id = ? AND level_id = ?",
                    (session_id, int(level_id)),
                ).fetchone()
        return row[0] if row else 0

    def get_admin_stats(self) -> Dict[str, Any]:
        with _connect() as conn:
            total_sessions = conn.execute("SELECT COUNT(*) FROM sessions").fetchone()[0]
            rows = conn.execute("SELECT completed_levels FROM sessions").fetchall()
            total_attempts = conn.execute("SELECT COUNT(*) FROM attempts").fetchone()[0]

        total_completions = 0
        level_counts: Dict[int, int] = {}
        for (comp_json,) in rows:
            try:
                levels = json.loads(comp_json)
            except Exception:
                continue
            total_completions += len(levels)
            for lvl in levels:
                level_counts[lvl] = level_counts.get(lvl, 0) + 1

        return {
            "total_sessions": total_sessions,
            "total_flags_captured": total_completions,
            "total_recorded_attempts": total_attempts,
            "level_completions": level_counts,
        }


db_session = DBSessionManager()
