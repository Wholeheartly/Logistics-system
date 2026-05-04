#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.production"
source "$ENV_FILE"

BACKUP_DIR="$SCRIPT_DIR/backup"
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_BACKUP="$BACKUP_DIR/db_${TIMESTAMP}.sql.gz"
UPLOADS_BACKUP="$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz"

echo "[$(date)] Starting backup..."

echo "[$(date)] Backing up PostgreSQL database..."
cd "$(dirname "$SCRIPT_DIR")"
docker compose --env-file "$ENV_FILE" exec -T db pg_dump -U "${POSTGRES_USER:-logistics}" "${POSTGRES_DB:-logistics}" | gzip > "$DB_BACKUP"

echo "[$(date)] Backing up uploads directory..."
docker compose --env-file "$ENV_FILE" exec -T backend tar czf - /app/uploads 2>/dev/null > "$UPLOADS_BACKUP" || true

echo "[$(date)] Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "*.gz" -mtime +$RETENTION_DAYS -delete

TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | awk '{print $1}')
echo "[$(date)] Backup complete. Total backup size: $TOTAL_SIZE"
