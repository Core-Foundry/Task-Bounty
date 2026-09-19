#!/usr/bin/env bash
# =============================================================================
# TaskBounty Database Backup Utility
# =============================================================================
# Usage:
#   ./scripts/backup-db.sh
#
# Environment variables:
#   BACKUP_DIR      Target backup directory (default: /var/backups/taskbounty or ./backups)
#   RETENTION_DAYS  Number of days to keep historical backups (default: 7)
#   PGDATABASE      Database name (default: taskbounty)
# =============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
DB_NAME="${PGDATABASE:-taskbounty}"
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_backup_${TIMESTAMP}.dump"

mkdir -p "$BACKUP_DIR"

echo "[$(date -Iseconds)] Initiating TaskBounty database backup for '${DB_NAME}'..."

if command -v pg_dump >/dev/null 2>&1; then
    pg_dump \
      --format=custom \
      --compress=9 \
      --verbose \
      --file="$BACKUP_FILE" \
      "$DB_NAME"
    
    sha256sum "$BACKUP_FILE" > "${BACKUP_FILE}.sha256"
    echo "[$(date -Iseconds)] Backup created successfully: ${BACKUP_FILE}"
else
    echo "[$(date -Iseconds)] Warning: pg_dump client is not installed in the current environment."
    echo "[$(date -Iseconds)] Please install postgresql-client to execute active database dumps."
    exit 1
fi

# Cleanup old backups
if [ -d "$BACKUP_DIR" ]; then
    echo "[$(date -Iseconds)] Cleaning backups older than ${RETENTION_DAYS} days..."
    find "$BACKUP_DIR" -type f \( -name "*.dump" -o -name "*.sha256" \) -mtime "+${RETENTION_DAYS}" -delete || true
fi

echo "[$(date -Iseconds)] Backup routine finished successfully."
