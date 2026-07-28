#!/bin/bash
# Autonomous Self-Healing Watchdog for CTF Platform

cd "$(dirname "$0")/.."
BACKEND_DIR="$(pwd)"

echo "Starting CTF Watchdog Daemon (monitoring localhost:8000)..."

while true; do
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/status 2>/dev/null)
    
    if [ "$HTTP_STATUS" -ne 200 ]; then
        echo "[$(date)] ALERT: CTF Backend unreachable (HTTP $HTTP_STATUS). Auto-restarting services..." >> "$BACKEND_DIR/data/watchdog.log"
        ./scripts/start_backend_daemon.sh >> "$BACKEND_DIR/data/watchdog.log" 2>&1
        sleep 10
    fi
    
    sleep 30
done
