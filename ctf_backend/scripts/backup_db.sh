#!/bin/bash
# Automated Database Backup Script for CTF Platform (Local & Synology NAS)

cd "$(dirname "$0")/.."
BACKEND_DIR="$(pwd)"
DB_FILE="$BACKEND_DIR/data/ctf_progress.db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="$BACKEND_DIR/data/backups"

mkdir -p "$BACKUP_DIR"

if [ -f "$DB_FILE" ]; then
    # Create clean timestamped SQLite online snapshot
    sqlite3 "$DB_FILE" ".backup '$BACKUP_DIR/ctf_progress_$TIMESTAMP.db'"
    echo "[$(date)] Local backup created: $BACKUP_DIR/ctf_progress_$TIMESTAMP.db"
    
    # Mirror copy to Synology NAS if mounted
    NAS_PATH="/Volumes/Surveillance/CTF_Backups"
    if [ -d "$NAS_PATH" ]; then
        cp "$BACKUP_DIR/ctf_progress_$TIMESTAMP.db" "$NAS_PATH/"
        echo "[$(date)] Backup mirrored to Synology NAS: $NAS_PATH"
    fi
fi
