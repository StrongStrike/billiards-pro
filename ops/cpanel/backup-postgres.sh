#!/bin/bash
set -euo pipefail

umask 077

APP_ROOT="/home/odilbek/tmp/billiards-pro"
BACKUP_DIR="${APP_ROOT}/backups/postgres"
KEY_FILE="/home/odilbek/.billiards-backup.key"
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="odilbek_billiards"
DB_USER="odilbek_billiards_app"
DB_PASSWORD="jwlIOICwKuw0gVpe50cfpM8dIftxY4jo"
RETENTION_DAYS="14"

mkdir -p "${BACKUP_DIR}"

if [[ ! -f "${KEY_FILE}" ]]; then
  echo "Backup encryption key not found: ${KEY_FILE}" >&2
  exit 1
fi

STAMP="$(TZ=Asia/Tashkent date +%Y%m%d-%H%M%S)"
TMP_SQL_GZ="${BACKUP_DIR}/billiards-${STAMP}.sql.gz"
FINAL_FILE="${TMP_SQL_GZ}.enc"

export PGPASSWORD="${DB_PASSWORD}"

pg_dump \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  --no-owner \
  --no-privileges \
  --format=plain \
  "${DB_NAME}" | gzip -9 > "${TMP_SQL_GZ}"

openssl enc -aes-256-cbc -salt -md sha256 \
  -in "${TMP_SQL_GZ}" \
  -out "${FINAL_FILE}" \
  -pass "file:${KEY_FILE}"

rm -f "${TMP_SQL_GZ}"

find "${BACKUP_DIR}" -type f -name "*.enc" -mtime +"${RETENTION_DAYS}" -delete
find "${BACKUP_DIR}" -type f -name "*.sql.gz" -delete

echo "$(TZ=Asia/Tashkent date '+%Y-%m-%d %H:%M:%S %Z') backup_ok ${FINAL_FILE}"
