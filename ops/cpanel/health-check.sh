#!/bin/bash
set -euo pipefail

APP_ROOT="/home/odilbek/tmp/billiards-pro"
LOG_FILE="/home/odilbek/logs/billiards-health.log"
URL="https://cp70.sp-server.net/~odilbek/api/health"
TIMEOUT="20"

mkdir -p "${APP_ROOT}"

STAMP="$(TZ=Asia/Tashkent date '+%Y-%m-%d %H:%M:%S %Z')"

HTTP_CODE="$(curl -k -sS -o /tmp/billiards-health.$$ -w "%{http_code}" --max-time "${TIMEOUT}" "${URL}" || true)"
BODY="$(cat /tmp/billiards-health.$$ 2>/dev/null || true)"
rm -f /tmp/billiards-health.$$

if [[ "${HTTP_CODE}" == "200" ]] && echo "${BODY}" | grep -q '"ok"[[:space:]]*:[[:space:]]*true'; then
  echo "${STAMP} health_ok ${HTTP_CODE}" >> "${LOG_FILE}"
  exit 0
fi

echo "${STAMP} health_fail ${HTTP_CODE} ${BODY}" >> "${LOG_FILE}"
echo "Health check failed: ${HTTP_CODE}" >&2
exit 1
