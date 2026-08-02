#!/usr/bin/env python3
"""Scheduled maintenance for the CTF backend: backup | rotate | health.

WHY PYTHON AND NOT SHELL
========================
Historically: everything under ~/Documents is behind macOS TCC, and a launchd
agent may only read it if the exact executable in ProgramArguments has been
granted Full Disk Access. Routing every scheduled job through one interpreter
kept that to a single grant instead of one for /bin/bash as well.

The runtime now lives in ~/srv/ctf_backend (see scripts/deploy.sh), which is
outside TCC entirely, so no grant is needed at all. Python is kept anyway: it
made the retention, integrity-check and NAS-mirror logic testable, and the
shell versions had silently-failing guards (`if [ -d "$NAS_PATH" ]` made a
nonexistent mirror path indistinguishable from a successful copy).

Usage:  python3 scripts/maintenance.py {backup|rotate|health|stats}
"""

import json
import os
import shutil
import sqlite3
import subprocess
import sys
import time
import urllib.error
import urllib.request

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# The runtime lives in ~/srv/ctf_backend; the repo keeps a frozen pre-cutover
# copy of data/ as a rollback point. Running this script FROM THE REPO therefore
# reads a stale database and reports numbers that look plausible and are wrong --
# which is exactly what happened the first time `stats` was run. Prefer the
# runtime whenever this copy is not it.
_RUNTIME_DIR = os.environ.get("CTF_RUNTIME_DIR") or os.path.expanduser("~/srv/ctf_backend")
if (os.path.abspath(BACKEND_DIR) != os.path.abspath(_RUNTIME_DIR)
        and os.path.exists(os.path.join(_RUNTIME_DIR, "data", "ctf_progress.db"))):
    print("[maintenance] NOTE: running from %s but the live data is in %s -- using the runtime."
          % (BACKEND_DIR, _RUNTIME_DIR), flush=True)
    BACKEND_DIR = _RUNTIME_DIR

DATA_DIR = os.path.join(BACKEND_DIR, "data")
DB_FILE = os.path.join(DATA_DIR, "ctf_progress.db")
BACKUP_DIR = os.path.join(DATA_DIR, "backups")

RETAIN_DAYS = 30
NAS_PARENT = "/Volumes/AI_Security_Feed"
NAS_PATH = os.path.join(NAS_PARENT, "CTF_Backups")
MAX_LOG_BYTES = 10 * 1024 * 1024
PUBLIC_HEALTH = "https://ctf-api.deniskim1.com/health"


def log(msg):
    print("[%s] %s" % (time.strftime("%Y-%m-%dT%H:%M:%S"), msg), flush=True)


# ---------------------------------------------------------------------------
def backup():
    """Online snapshot + integrity check + retention + NAS mirror."""
    if not os.path.exists(DB_FILE):
        log("FATAL: %s missing" % DB_FILE)
        return 1
    os.makedirs(BACKUP_DIR, exist_ok=True)
    dest = os.path.join(BACKUP_DIR, "ctf_progress_%s.db" % time.strftime("%Y%m%d_%H%M%S"))

    # sqlite3's backup API is safe against the live WAL writer.
    src = sqlite3.connect("file:%s?mode=ro" % DB_FILE, uri=True, timeout=15)
    dst = sqlite3.connect(dest)
    with dst:
        src.backup(dst)
    src.close()

    # Prove the snapshot is readable before trusting it.
    check = sqlite3.connect(dest)
    ok = check.execute("PRAGMA integrity_check").fetchone()[0]
    sessions = check.execute("SELECT count(*) FROM sessions").fetchone()[0]
    check.close()
    if ok != "ok":
        log("FATAL: integrity_check said %r, removing %s" % (ok, dest))
        os.remove(dest)
        return 1
    log("OK local backup: %s (%d bytes, %d sessions)" % (dest, os.path.getsize(dest), sessions))

    cutoff = time.time() - RETAIN_DAYS * 86400
    kept = 0
    for name in os.listdir(BACKUP_DIR):
        path = os.path.join(BACKUP_DIR, name)
        if not name.startswith("ctf_progress_") or not name.endswith(".db"):
            continue
        if os.path.getmtime(path) < cutoff:
            os.remove(path)
        else:
            kept += 1
    log("retention: %d snapshots kept" % kept)

    # The old script pointed at /Volumes/Surveillance, which does not exist, and
    # its `if [ -d ]` guard made a dead path indistinguishable from success.
    if os.path.isdir(NAS_PARENT):
        os.makedirs(NAS_PATH, exist_ok=True)
        shutil.copy2(dest, NAS_PATH)
        log("OK mirrored to NAS: %s" % NAS_PATH)
    else:
        log("WARN: %s not mounted; NAS mirror SKIPPED (local backup is fine)" % NAS_PARENT)
    return 0


# ---------------------------------------------------------------------------
def rotate():
    """Truncate in place.

    newsyslog rotates by rename, and launchd keeps writing to the moved inode,
    so the new file stays empty forever. Truncating preserves the inode, and
    launchd opens with O_APPEND so writes resume at offset 0.
    """
    targets = [os.path.join(DATA_DIR, n) for n in (
        "backend.log", "backend_err.log", "tunnel.log", "tunnel_err.log",
        "ctf-backup.log", "ctf-logrotate.log", "ctf-healthcheck.log", "health.log",
    )] + ["/opt/homebrew/var/log/ollama.log"]

    for path in targets:
        try:
            size = os.path.getsize(path)
        except OSError:
            continue
        if size <= MAX_LOG_BYTES:
            continue
        try:
            with open(path, "rb") as fh:
                fh.seek(max(0, size - 1024 * 1024))
                tail = fh.read()
            with open(path + ".1", "wb") as fh:
                fh.write(tail)
            with open(path, "w"):
                pass  # truncate, keep the inode
            log("rotated %s (was %d bytes)" % (path, size))
        except OSError as exc:
            log("WARN: could not rotate %s: %s" % (path, exc))
    return 0


# ---------------------------------------------------------------------------
def _notify(title, message):
    try:
        subprocess.run(
            ["osascript", "-e",
             'display notification %s with title %s' % (json.dumps(message), json.dumps(title))],
            timeout=10, check=False,
        )
    except Exception:
        pass


def health():
    """Report only; never restart.

    Restarts belong to launchd's KeepAlive. The old watchdog.sh called
    start_backend_daemon.sh, whose pkill killed a HEALTHY cloudflared that
    launchd then respawned -- the "self-healing" watchdog was itself the cause
    of the dual-connector split-brain.

    Edge-triggered: one notification per incident, not one every five minutes.
    """
    state_path = os.path.join(DATA_DIR, ".health_state")
    try:
        prev = open(state_path).read().strip()
    except OSError:
        prev = "ok"

    failure = None

    def get(url, timeout):
        return urllib.request.urlopen(url, timeout=timeout).read().decode("utf-8", "ignore")

    try:
        body = json.loads(get("http://127.0.0.1:8000/health", 10))
        if body.get("status") != "ok":
            failure = "backend degraded: %s" % json.dumps(body.get("checks", {}))[:200]
    except Exception as exc:
        failure = "backend not responding on 127.0.0.1:8000 (%s)" % exc

    if failure is None:
        # cloudflared does not use a fixed metrics port: with no --metrics flag
        # it binds the first free port in 20241-20245, so it moves between
        # restarts. Hardcoding one produced a false "tunnel down" alert the
        # first time the tunnel was restarted while the site was perfectly fine.
        connections, probe_error = None, None
        for port in range(20241, 20246):
            try:
                metrics = get("http://127.0.0.1:%d/metrics" % port, 3)
            except Exception as exc:
                probe_error = exc
                continue
            line = [l for l in metrics.splitlines()
                    if l.startswith("cloudflared_tunnel_ha_connections")]
            if line:
                connections = float(line[0].split()[-1])
                break
        if connections is None:
            failure = "cloudflared metrics not found on ports 20241-20245 (%s)" % probe_error
        elif connections < 1:
            failure = "cloudflare tunnel has no active connections"

    if failure is None:
        # End-to-end through Cloudflare -- the only check a player would agree
        # with. A User-Agent is required: Cloudflare's bot protection answers
        # 403 to urllib's default "Python-urllib/3.9", which would report the
        # site as down every five minutes while it was perfectly healthy.
        try:
            req = urllib.request.Request(
                PUBLIC_HEALTH, headers={"User-Agent": "ctf-healthcheck/1.0 (+deniskim1.com)"}
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                if resp.status != 200:
                    failure = "public endpoint returned HTTP %s" % resp.status
        except Exception as exc:
            failure = "public endpoint unreachable (%s)" % exc

    if failure:
        log("UNHEALTHY: %s" % failure)
        if prev == "ok":
            _notify("CTF backend DOWN", failure)
        open(state_path, "w").write("bad")
        return 1

    if prev != "ok":
        log("recovered")
        _notify("CTF backend OK", "CTF backend recovered")
    open(state_path, "w").write("ok")
    return 0


# ---------------------------------------------------------------------------
#: A human reads a briefing, composes an injection, and waits on a local 8B
#: model. Under this many seconds per solved level, it is a script.
#:
#: Pace alone is NOT sufficient and this is not tuned until the numbers look
#: right. A verification run that solved 15 levels averaged 36s per solve and
#: sits above any threshold that does not also start excluding real players.
#: That is what the explicit list below is for: pace catches the obvious runs,
#: the list catches the rest, and neither is quietly widened to flatter a graph.
MIN_SECONDS_PER_SOLVE = 25

#: ip_hash values known to be the owner's own testing. Colon-separated in the
#: env. The default is the 2026-07-28 "verify all 20 levels solvable" run: 24
#: sessions in one evening, including the only 20/20 and 15/20 completions the
#: platform has ever recorded.
SYNTHETIC_IP_HASHES = {
    h for h in os.getenv(
        "CTF_SYNTHETIC_IP_HASHES", "30f2a14be896d31f").split(":") if h
}


def _count_solved(completed_levels):
    try:
        value = json.loads(completed_levels) if completed_levels else []
        return len(value) if isinstance(value, list) else 0
    except (ValueError, TypeError):
        return 0


def stats():
    """Player funnel + service health, from data the platform already keeps.

    WHY THIS EXISTS
    ===============
    Eight people once ground through 87 attempts on levels 1-2 against a scorer
    that was returning an empty string on every call, and nothing surfaced it.
    The bug was found by reading code weeks later. A funnel would have shown it
    in a day: 44 attempts on level 1 across 7 players, and nobody reaching
    level 3.

    Everything here comes from the live DB and the existing JSON access log.
    No new storage, no new dependency.
    """
    if not os.path.exists(DB_FILE):
        log("FATAL: %s missing" % DB_FILE)
        return 1

    conn = sqlite3.connect("file:%s?mode=ro" % DB_FILE, uri=True, timeout=15)

    # Separate synthetic traffic BEFORE reporting anything. This report used to
    # count the owner's own API verification runs as players, and said so: it
    # reported "furthest level solved by anyone: 20" when no human had ever gone
    # past level 4. A funnel that includes its own author is worse than no
    # funnel -- it reads as healthy and gets used to make decisions.
    #
    # The tell is pace, not identity. A verification run solves 20 levels in 453
    # seconds; a person reads a briefing and composes an injection. Anything
    # under MIN_SECONDS_PER_SOLVE is machine-paced by construction.
    raw = conn.execute(
        "SELECT completed_levels, created_at, last_active, ip_hash FROM sessions").fetchall()
    sessions, synthetic = [], []
    for row in raw:
        solved = _count_solved(row[0])
        pace = (float(row[2]) - float(row[1])) / solved if solved else None
        is_synthetic = (row[3] in SYNTHETIC_IP_HASHES
                        or (pace is not None and pace < MIN_SECONDS_PER_SOLVE))
        (synthetic if is_synthetic else sessions).append(row[:3])
    if synthetic:
        best = max(_count_solved(r[0]) for r in synthetic)
        log("  NOTE: %d of %d sessions excluded as machine-paced (<%ds per solve);"
            % (len(synthetic), len(raw), MIN_SECONDS_PER_SOLVE))
        log("        best excluded run reached %d levels. Re-run with --include-synthetic"
            % best)
        log("        to see them. These are almost always your own API checks.")
    attempts = conn.execute(
        "SELECT level_id, SUM(attempt_count), COUNT(*) FROM attempts GROUP BY level_id").fetchall()
    conn.close()

    solved = {}
    engaged = 0
    for comp, created, active in sessions:
        try:
            levels = json.loads(comp)
        except Exception:
            levels = []
        if levels or (active - created) > 60:
            engaged += 1
        for lvl in levels:
            solved[lvl] = solved.get(lvl, 0) + 1

    att = {lvl: (total, players) for lvl, total, players in attempts}
    furthest = max(solved) if solved else 0

    print("")
    print("=== CTF funnel ===")
    print("  sessions: %d    engaged (solved something, or stayed past 60s): %d"
          % (len(sessions), engaged))
    print("  furthest level solved by anyone: %s" % (furthest or "none"))
    print("")
    print("  %-6s %8s %8s %10s %9s" % ("level", "tried", "solved", "att/solve", "stuck"))
    print("  " + "-" * 46)
    for lvl in range(1, 21):
        total, players = att.get(lvl, (0, 0))
        wins = solved.get(lvl, 0)
        if not players and not wins:
            continue
        # `stuck` = reached this level and never solved it. This is the number
        # that names the wall, and the one that was invisible before.
        stuck = max(0, players - wins)
        ratio = ("%.1f" % (float(total) / wins)) if wins else "-"
        flag = "   <-- wall" if wins == 0 and stuck >= 3 else ""
        print("  %-6d %8d %8d %10s %9d%s" % (lvl, players, wins, ratio, stuck, flag))

    # --- service health + scoring mix, from the JSON access log ------------
    log_path = os.path.join(DATA_DIR, "backend.log")
    latencies, codes, scores = [], {}, {}
    try:
        with open(log_path, errors="ignore") as fh:
            for line in fh:
                line = line.strip()
                if not line.startswith("{"):
                    continue
                try:
                    rec = json.loads(line)
                except Exception:
                    continue
                if rec.get("evt") == "score":
                    key = "L%02d %s" % (rec.get("level", 0), rec.get("reason", "?"))
                    scores[key] = scores.get(key, 0) + 1
                elif "status" in rec:
                    code = rec["status"]
                    codes[code] = codes.get(code, 0) + 1
                    if str(rec.get("path", "")).startswith("/api/chat"):
                        latencies.append(rec.get("ms", 0))
    except OSError:
        pass

    if codes:
        total_req = sum(codes.values())
        errors = sum(v for k, v in codes.items() if k >= 500)
        print("")
        print("=== service (current log window) ===")
        print("  requests: %d    5xx: %d    503 yields to Jarvis/quiet hours: %d"
              % (total_req, errors, codes.get(503, 0)))
        if latencies:
            latencies.sort()
            p50 = latencies[len(latencies) // 2]
            p95 = latencies[min(len(latencies) - 1, int(len(latencies) * 0.95))]
            print("  /api/chat  p50 %.1fs   p95 %.1fs   slowest %.1fs"
                  % (p50 / 1000.0, p95 / 1000.0, latencies[-1] / 1000.0))

    print("")
    if scores:
        # A level that is almost all NO_LEAK is one the model never leaks on --
        # miscalibrated. Almost all GENERIC means players are not really trying.
        # This is the distribution that would have exposed the dead judge.
        print("=== how turns are being scored ===")
        for key in sorted(scores, key=lambda k: -scores[k])[:12]:
            print("  %-26s %d" % (key, scores[key]))
    else:
        print("  (no scored turns in the current log window)")
    return 0


COMMANDS = {"backup": backup, "rotate": rotate, "health": health, "stats": stats}

if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in COMMANDS:
        print(__doc__)
        sys.exit(2)
    sys.exit(COMMANDS[sys.argv[1]]())
