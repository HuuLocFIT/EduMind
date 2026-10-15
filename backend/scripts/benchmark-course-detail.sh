#!/bin/bash

# ============================================
# Benchmark GET /courses/slug/{slug} on lms-core-service
# ============================================
# Calls lms-core directly (port 8083), not the gateway, because the
# gateway rate-limits to 10 req/s per IP.
#
# Run it twice against the same data:
#   1. lms-core started with CACHE_TYPE=none   -> ./benchmark-course-detail.sh no-cache
#   2. lms-core started normally (Redis cache)  -> ./benchmark-course-detail.sh redis
#
# Env overrides:
#   BASE_URL     (default http://localhost:8083)
#   SLUG         (default: published course with the most lessons, read from Postgres)
#   REQUESTS     (default 2000)
#   CONCURRENCY  (default 20)
#   PG_CONTAINER (default edumind-postgres-lms-core)
#   PG_USER      (default postgres)
#   PG_DB        (default edumind_core)
# ============================================

set -euo pipefail

LABEL="${1:-run}"
BASE_URL="${BASE_URL:-http://localhost:8083}"
REQUESTS="${REQUESTS:-2000}"
CONCURRENCY="${CONCURRENCY:-20}"
PG_CONTAINER="${PG_CONTAINER:-edumind-postgres-lms-core}"
PG_USER="${PG_USER:-postgres}"
PG_DB="${PG_DB:-edumind_core}"

if ! command -v ab >/dev/null 2>&1; then
  echo "ApacheBench (ab) is required" >&2
  exit 1
fi

if [ -z "${SLUG:-}" ]; then
  SLUG=$(docker exec "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DB" -tAc \
    "SELECT c.slug FROM course.courses c
       JOIN course.sections s ON s.course_id = c.id
       JOIN course.lessons l ON l.section_id = s.id
      WHERE c.status = 'PUBLISHED'
      GROUP BY c.id, c.slug
      ORDER BY COUNT(l.id) DESC
      LIMIT 1")
fi

if [ -z "$SLUG" ]; then
  echo "No published course found; set SLUG explicitly" >&2
  exit 1
fi

URL="$BASE_URL/courses/slug/$SLUG"
echo "Target: $URL"

STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$URL")
if [ "$STATUS" != "200" ]; then
  echo "Expected 200 from $URL, got $STATUS" >&2
  exit 1
fi

# Warm up JIT, connection pools and (when enabled) the cache entry
ab -q -n 200 -c "$CONCURRENCY" "$URL" >/dev/null

OUT=$(ab -n "$REQUESTS" -c "$CONCURRENCY" "$URL")

FAILED=$(echo "$OUT" | awk '/^Failed requests:/ {print $3}')
NON2XX=$(echo "$OUT" | awk '/^Non-2xx responses:/ {print $3}')
RPS=$(echo "$OUT" | awk '/^Requests per second:/ {print $4}')
P50=$(echo "$OUT" | awk '$1 == "50%" {print $2}')
P95=$(echo "$OUT" | awk '$1 == "95%" {print $2}')
P99=$(echo "$OUT" | awk '$1 == "99%" {print $2}')

echo ""
echo "label=$LABEL requests=$REQUESTS concurrency=$CONCURRENCY failed=${FAILED:-0} non2xx=${NON2XX:-0}"
echo "| $LABEL | $RPS | $P50 | $P95 | $P99 |"
