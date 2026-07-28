#!/bin/bash
# Emergency launcher for the CTF backend. NOT the normal path.
#
# launchd is the supervisor: the runtime lives in ~/srv/ctf_backend (outside
# TCC), so `launchctl kickstart -k gui/$(id -u)/com.deniskim.ctf-backend` works
# without any Full Disk Access grant. Use scripts/deploy.sh to ship code there.
#
# This script starts an UNSUPERVISED copy from the repo checkout. That is what
# the machine ran for two days while the launchd job crash-looped, and nothing
# would have restarted it. Use it only to debug with live edits.
#
# Two behaviours were removed deliberately:
#   * It no longer touches cloudflared. The old `pkill` killed launchd's healthy
#     tunnel, which launchd then respawned ~1s later, leaving TWO connectors for
#     the same tunnel (observed: PIDs 1002 and 1003).
#   * It no longer redirects with `>`. launchd holds an O_APPEND fd on the same
#     path, and truncating it out from under launchd is why backend.log was 5
#     lines while backend_err.log was 57 MB.
set -euo pipefail

cd "$(dirname "$0")/.."
BACKEND_DIR="$(pwd)"

if launchctl list 2>/dev/null | grep -q "com.deniskim.ctf-backend"; then
    if launchctl list 2>/dev/null | awk '$3=="com.deniskim.ctf-backend"{print $1}' | grep -qE '^[0-9]+$'; then
        echo "launchd is already running the backend. Use:"
        echo "  launchctl kickstart -k gui/\$(id -u)/com.deniskim.ctf-backend"
        exit 1
    fi
fi

# config.py fails closed without the signing keys.
if [ -f "$BACKEND_DIR/.env" ]; then
    set -a; . "$BACKEND_DIR/.env"; set +a
else
    echo "FATAL: $BACKEND_DIR/.env not found. It holds CTF_FLAG_HMAC_KEY and"
    echo "CTF_CERT_HMAC_KEY, without which the server refuses to start."
    exit 1
fi

export PYTHONPATH="$BACKEND_DIR:${PYTHONPATH:-}"
export PYTHONUNBUFFERED=1

echo "Stopping any existing backend..."
pkill -f "uvicorn app.main:app" 2>/dev/null || true
sleep 1

# --host 127.0.0.1, NOT 0.0.0.0: cloudflared connects over loopback, so binding
# all interfaces exposed the unauthenticated API directly to the network --
# bypassing Cloudflare entirely, along with its WAF and the CF-Connecting-IP
# header the admin gate used to trust.
nohup python3 -m uvicorn app.main:app \
    --host 127.0.0.1 --port 8000 \
    --http h11 --loop asyncio \
    --timeout-keep-alive 65 \
    --proxy-headers --forwarded-allow-ips 127.0.0.1 \
    >> "$BACKEND_DIR/data/backend.log" 2>&1 &
PID=$!
echo "Backend started on 127.0.0.1:8000 (PID $PID)"

sleep 3
if curl -sf --max-time 5 http://127.0.0.1:8000/health >/dev/null; then
    echo "Health check passed."
else
    echo "WARNING: /health did not respond. Check data/backend.log"
    exit 1
fi

echo
echo "The Cloudflare tunnel is NOT managed here. Check it with:"
echo "  launchctl list | grep ctf-tunnel"
echo "  curl -s 127.0.0.1:20242/metrics | grep cloudflared_tunnel_ha_connections"
