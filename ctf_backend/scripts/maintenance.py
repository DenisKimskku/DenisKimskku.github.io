#!/usr/bin/env python3
"""Scheduled maintenance for the CTF backend: backup | rotate | health.

WHY PYTHON AND NOT SHELL
========================
Everything under ~/Documents is behind macOS TCC. A launchd agent may only read
it if the *executable named in ProgramArguments* has Full Disk Access, and TCC
attributes per-binary. Shell scripts would mean granting FDA to /bin/bash on top
of the Python interpreter the server already needs -- two grants, one of them
very broad. Routing every scheduled job through the same interpreter reduces
that to a single entry.

Usage:  python3 scripts/maintenance.py {backup|rotate|health}
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
        try:
            metrics = get("http://127.0.0.1:20242/metrics", 5)
            line = [l for l in metrics.splitlines()
                    if l.startswith("cloudflared_tunnel_ha_connections")]
            if not line or float(line[0].split()[-1]) < 1:
                failure = "cloudflare tunnel has no active connections"
        except Exception as exc:
            failure = "cloudflared metrics unreachable (%s)" % exc

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


COMMANDS = {"backup": backup, "rotate": rotate, "health": health}

if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in COMMANDS:
        print(__doc__)
        sys.exit(2)
    sys.exit(COMMANDS[sys.argv[1]]())
