#!/bin/bash
# Native Background Daemon Launcher for CTF Backend & Cloudflare Tunnel

cd "$(dirname "$0")/.."
BACKEND_DIR="$(pwd)"

echo "Starting CTF FastAPI Backend natively with keep-alive 65s..."
pkill -f "uvicorn app.main:app" 2>/dev/null
sleep 1

nohup python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --timeout-keep-alive 65 > "$BACKEND_DIR/data/backend.log" 2>&1 &
echo "FastAPI Backend started PID $!"

echo "Starting Cloudflare Tunnel natively..."
pkill -f "cloudflared tunnel run ctf-backend" 2>/dev/null
sleep 1

nohup cloudflared tunnel run ctf-backend > "$BACKEND_DIR/data/tunnel.log" 2>&1 &
echo "Cloudflare Tunnel started PID $!"

echo "Native background daemons are live and active!"
