#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.production"
source "$ENV_FILE"

ALERT_EMAIL="${ALERT_EMAIL:-admin@company.com}"
HEALTH_URL="http://localhost/api/health"
MAX_RESPONSE_TIME=5

check_health() {
    local start_time=$(date +%s%N)
    local http_code

    http_code=$(curl -sf -o /dev/null -w "%{http_code}" --max-time "$MAX_RESPONSE_TIME" "$HEALTH_URL" 2>/dev/null) || http_code="000"

    local end_time=$(date +%s%N)
    local response_time=$(( (end_time - start_time) / 1000000 ))

    if [ "$http_code" != "200" ]; then
        echo "[CRITICAL] Health check failed! HTTP: $http_code, Response time: ${response_time}ms"
        return 1
    fi

    if [ "$response_time" -gt 3000 ]; then
        echo "[WARNING] Response time slow: ${response_time}ms (threshold: 3000ms)"
    else
        echo "[OK] Health check passed. HTTP: $http_code, Response time: ${response_time}ms"
    fi
    return 0
}

check_disk() {
    local usage
    usage=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')

    if [ "$usage" -gt 90 ]; then
        echo "[CRITICAL] Disk usage: ${usage}% (threshold: 90%)"
        return 1
    elif [ "$usage" -gt 80 ]; then
        echo "[WARNING] Disk usage: ${usage}% (threshold: 80%)"
    else
        echo "[OK] Disk usage: ${usage}%"
    fi
    return 0
}

check_memory() {
    local available
    available=$(free -m | awk 'NR==2 {print $7}')

    if [ "$available" -lt 200 ]; then
        echo "[CRITICAL] Available memory: ${available}MB (threshold: 200MB)"
        return 1
    elif [ "$available" -lt 500 ]; then
        echo "[WARNING] Available memory: ${available}MB (threshold: 500MB)"
    else
        echo "[OK] Available memory: ${available}MB"
    fi
    return 0
}

check_docker() {
    local restart_count
    cd "$(dirname "$SCRIPT_DIR")"

    restart_count=$(docker compose --env-file "$ENV_FILE" ps --format json 2>/dev/null | \
        grep -c "restarting" || true)

    if [ "$restart_count" -gt 0 ]; then
        echo "[CRITICAL] $restart_count container(s) are restarting"
        return 1
    fi

    local running
    running=$(docker compose --env-file "$ENV_FILE" ps --services --filter "status=running" 2>/dev/null | wc -l)
    echo "[OK] $running containers running normally"
    return 0
}

echo "========================================="
echo "  System Health Check - $(date)"
echo "========================================="
echo ""

FAILED=0

check_health  || FAILED=1
check_disk    || FAILED=1
check_memory  || FAILED=1
check_docker  || FAILED=1

echo ""
if [ "$FAILED" -eq 1 ]; then
    echo "Result: ISSUES DETECTED"
    exit 1
else
    echo "Result: ALL CHECKS PASSED"
    exit 0
fi
