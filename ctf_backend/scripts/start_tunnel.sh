#!/bin/bash
# Startup script for Cloudflare Tunnel on Mac Mini

TUNNEL_NAME="ctf-backend"

echo "=== LLM CTF Cloudflare Tunnel Launcher ==="
if ! command -v cloudflared &> /dev/null; then
    echo "[!] cloudflared is not installed. Run 'brew install cloudflare/cloudflare/cloudflared' first."
    exit 1
fi

echo "[+] Starting Cloudflare Tunnel ($TUNNEL_NAME -> ctf-api.deniskim1.com -> http://localhost:8000)..."
cloudflared tunnel run $TUNNEL_NAME
