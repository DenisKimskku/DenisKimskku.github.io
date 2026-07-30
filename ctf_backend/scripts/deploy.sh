#!/bin/bash
# Deploy the CTF backend from the git repo to its runtime location.
#
# WHY THE RUNTIME LIVES OUTSIDE ~/Documents
# =========================================
# ~/Documents is TCC-protected on macOS. A launchd agent may only read it if the
# exact executable in ProgramArguments has been granted Full Disk Access through
# the GUI -- there is no CLI to grant it (TCC.db is SIP-protected; tccutil only
# supports `reset`). That is why the backend agent crash-looped for two days
# with `PermissionError: [Errno 1]` while an unsupervised nohup process, started
# from a Terminal that *did* have the grant, quietly served the site.
#
# Running from ~/srv removes the permission question entirely: no grant, no GUI
# step, and the same applies to any future service on this machine.
#
# The repo stays the source of truth. This script is the only way code reaches
# the runtime; never edit ~/srv/ctf_backend by hand.
#
# Usage: ./scripts/deploy.sh [--restart]
set -euo pipefail

SRC="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${CTF_RUNTIME_DIR:-$HOME/srv/ctf_backend}"

echo "==> deploying $SRC  ->  $DEST"
mkdir -p "$DEST"

# data/ is EXCLUDED on purpose: it holds the live player database, the WAL, and
# the backups. Syncing it would overwrite real progress with whatever happened
# to be in the repo checkout.
rsync -a --delete \
    --exclude 'data/' \
    --exclude '__pycache__/' \
    --exclude '*.pyc' \
    --exclude '.pytest_cache/' \
    "$SRC"/ "$DEST"/

# .env carries the signing keys and is gitignored, so rsync above may not have
# it if the repo copy was cleaned. Never overwrite an existing runtime .env.
if [ -f "$SRC/.env" ] && [ ! -f "$DEST/.env" ]; then
    cp "$SRC/.env" "$DEST/.env"
    chmod 600 "$DEST/.env"
    echo "    seeded .env (mode 600)"
fi

mkdir -p "$DEST/data/backups"
echo "    code synced; data/ left untouched"

# Keep the runtime venv in step with requirements.txt. Without this a
# dependency change lands in the repo, passes CI, and never reaches the
# machine -- which is exactly the drift this whole migration existed to close.
VENV="${CTF_VENV:-$HOME/.venvs/ctf}"
if [ -x "$VENV/bin/pip" ]; then
    if ! "$VENV/bin/pip" install -q -r "$DEST/requirements.txt"; then
        echo "    FATAL: venv dependency install failed" >&2
        exit 1
    fi
    "$VENV/bin/pip" check >/dev/null 2>&1 || echo "    WARN: venv has conflicting requirements"
    echo "    venv deps in sync ($VENV)"
else
    echo "    WARN: no venv at $VENV -- the service may be running system python" >&2
fi

if [ "${1:-}" = "--restart" ]; then
    echo "==> restarting via launchd"
    launchctl kickstart -k "gui/$(id -u)/com.deniskim.ctf-backend"
    sleep 4
    if curl -sf --max-time 10 http://127.0.0.1:8000/health >/dev/null; then
        echo "    health check passed"
    else
        echo "    WARNING: /health did not respond -- check $DEST/data/backend_err.log" >&2
        exit 1
    fi
fi

echo "==> done"
