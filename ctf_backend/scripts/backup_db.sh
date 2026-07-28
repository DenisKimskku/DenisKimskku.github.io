#!/bin/bash
# Nightly SQLite snapshot with retention and an optional NAS mirror.
#
# `sqlite3 .backup` uses SQLite's online backup API, which is safe against the
# live WAL writer -- that part was always correct. What was broken: nothing
# scheduled it, there was no retention, and the NAS path did not exist while the
# `if [ -d ]` guard made that indistinguishable from success.
set -euo pipefail

cd "$(dirname "$0")/.."
BACKEND_DIR="$(pwd)"
DB_FILE="$BACKEND_DIR/data/ctf_progress.db"
BACKUP_DIR="$BACKEND_DIR/data/backups"    # inside data/ => covered by .gitignore
RETAIN_DAYS=30
DEST="$BACKUP_DIR/ctf_progress_$(date +%Y%m%d_%H%M%S).db"

log() { echo "[$(date '+%Y-%m-%dT%H:%M:%S')] $*"; }

[ -f "$DB_FILE" ] || { log "FATAL: $DB_FILE missing"; exit 1; }
mkdir -p "$BACKUP_DIR"

sqlite3 "$DB_FILE" ".backup '$DEST'"

# Prove the snapshot is readable before trusting it.
if ! sqlite3 "$DEST" "PRAGMA integrity_check;" | grep -q '^ok$'; then
    log "FATAL: integrity_check failed, removing $DEST"; rm -f "$DEST"; exit 1
fi
log "OK local backup: $DEST ($(stat -f%z "$DEST") bytes, $(sqlite3 "$DEST" 'select count(*) from sessions;') sessions)"

find "$BACKUP_DIR" -name 'ctf_progress_*.db' -mtime +$RETAIN_DAYS -delete
log "retention: $(ls -1 "$BACKUP_DIR"/ctf_progress_*.db 2>/dev/null | wc -l | tr -d ' ') snapshots kept"

# /Volumes/Surveillance did not exist; AI_Security_Feed is the mounted volume.
NAS_PARENT="/Volumes/AI_Security_Feed"
NAS_PATH="$NAS_PARENT/CTF_Backups"
if [ -d "$NAS_PARENT" ]; then
    mkdir -p "$NAS_PATH"
    cp "$DEST" "$NAS_PATH/" && log "OK mirrored to NAS: $NAS_PATH"
    find "$NAS_PATH" -name 'ctf_progress_*.db' -mtime +90 -delete
else
    # LOUD, not silent -- silence is what hid the dead path.
    log "WARN: $NAS_PARENT not mounted; NAS mirror SKIPPED (local backup is fine)"
fi
