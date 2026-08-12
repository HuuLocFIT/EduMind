# Production Operations

Deployment, migration, secrets, and runtime-behavior reference for running the backend in production. For the day-to-day dev/local setup, see [backend/README.md](../backend/README.md).

## Deploying

`docker-compose.prod.yml` runs the platform from **prebuilt images published to GitHub Container Registry (GHCR)** instead of building from source:

```bash
cd backend
IMAGE_TAG=<short-sha> docker compose -f docker-compose.prod.yml up -d
# IMAGE_TAG defaults to "latest" if not set
# Images: ghcr.io/<owner>/edumind-{discovery-service,auth-service,lms-core-service,api-gateway}:<tag>
```

Differences from the local compose file:
- Application services (`discovery-service`, `auth-service`, `lms-core-service`, `api-gateway`) pull GHCR images instead of building a `Dockerfile` from `context: .`.
- Every service (including the two Postgres containers and Redis) has a `healthcheck`, and app services `depends_on` their dependencies with `condition: service_healthy`.
- `postgres-auth-data`, `postgres-lms-core-data`, and `redis-data` are named Docker volumes, so data survives container restarts/recreation.
- `.env` still supplies secrets (`JWT_SECRET`, `GEMINI_API_KEY`, `GROQ_API_KEY`, Cloudinary/OAuth/mail credentials, etc.) — never bake secrets into the image.

## ⚠️ Production configuration checklist

Gaps or defaults in the current codebase that **must** be addressed before a real production deployment — this is a checklist of what to verify/change, not a description of what's already handled.

- **Never run the mock payment gateway in production.** `PAYMENT_GATEWAY` defaults to `mock` and `PAYMENT_MOCK_ENABLED` defaults to `true` (`lms-core-service/src/main/resources/application.yml`) with **no code-level guard** preventing mock in production — you must explicitly set `PAYMENT_GATEWAY=paypal` (or `sepay`) and `PAYMENT_MOCK_ENABLED=false` via env vars.
- **Set `SPRING_PROFILES_ACTIVE=prod` on `auth-service`.** It has an `application-prod.yml` that quiets `org.hibernate.SQL` from `DEBUG`→`INFO` and hides actuator details (`show-details: never`). **`lms-core-service`, `api-gateway`, and `discovery-service` have no `application-prod.yml` at all** — `lms-core-service` in particular still ships `org.hibernate.SQL: DEBUG` / `BasicBinder: TRACE` and `management.endpoint.health.show-details: always` regardless of profile. Until a prod profile is added for these services, override the equivalent properties via env vars / a mounted config at deploy time.
- **`/actuator/metrics` already requires `ROLE_ADMIN`** on `auth-service` and `lms-core-service` (enforced in each service's `SecurityConfig`) — only `/actuator/health` and `/actuator/info` are public. **`discovery-service` and `api-gateway` have no such restriction** on `/actuator/**` — treat their actuator endpoints as internal-network-only (don't expose them publicly) until access control is added.
- **Readiness/liveness**: use `/actuator/health` per service as both probes for now — there's no separate readiness/liveness split configured (no Kubernetes-specific health groups). `docker-compose.prod.yml` already wires `healthcheck` + `depends_on: condition: service_healthy` for orchestration-level readiness.
- **Graceful shutdown is not configured anywhere in the codebase** (no `server.shutdown` / `spring.lifecycle.timeout-per-shutdown-phase` in any `application.yml`). In-flight requests can be cut off on redeploy/restart — add `server.shutdown: graceful` and a `spring.lifecycle.timeout-per-shutdown-phase` before relying on rolling deploys without dropped requests.
- **Log collection**: services log to `logs/<service>.log` locally (rolling, 10MB/30 files) — this is not sufficient in production. Ship container stdout/stderr (or the log files) to a centralized collector (e.g. your platform's log driver, Loki, CloudWatch) rather than relying on tailing files on the container filesystem.
- **Docker Compose has a hardcoded weak DB password fallback**: `docker-compose.yml` / `docker-compose.prod.yml` default `POSTGRES_PASSWORD`/`AUTH_DB_PASSWORD`/`LMS_CORE_DB_PASSWORD` to `postgres` if the env var is unset (`${AUTH_DB_PASSWORD:-postgres}`). Always set real `AUTH_DB_PASSWORD` / `LMS_CORE_DB_PASSWORD` in production — do not rely on the fallback.

## Database migration policy

- **Forward-only**: Flyway migrations only move forward (`baseline-on-migrate: true`, `flyway:migrate`). Never edit or delete a migration file that has already shipped/run anywhere outside your own machine.
- **Fix forward, don't rewrite history**: if a released migration has a bug, ship a new migration that corrects it — do not modify the checksummed file (Flyway will reject a changed checksum on next run; `flyway:repair` is for fixing metadata after a manual DB fix, not for condoning migration edits).
- **Backup before any migration that touches production data materially** (schema changes affecting existing rows, backfills, drops) — take a database snapshot/backup immediately before running `flyway:migrate` in production.
- **Rollback = new migration, not `flyway:clean`/`undo`**: `flyway:clean` is destructive (drops all configured schemas) and must never run against production. If a migration causes a problem in production, roll forward with a corrective migration in the next release rather than attempting to revert the applied one.

## Deployment verification checklist

After deploying a new version, verify in order:
1. `curl --fail http://<host>:<port>/actuator/health` returns `200` for every service (`discovery-service:8761`, `auth-service:8081`, `lms-core-service:8083`, `api-gateway:8080`).
2. New service instances appear in the Eureka dashboard (`http://<discovery-host>:8761`).
3. `flyway:info` (or the equivalent startup log) shows no pending/failed migrations.
4. A real request through the Gateway succeeds end-to-end (e.g. `GET /api/courses` returns `200` with an `ApiResponse` payload).
5. Logs show no repeated connection errors to Postgres/Redis/Eureka in the minutes after startup.

## Secrets policy

- Production secrets (`JWT_SECRET`, DB passwords, encryption keys, OAuth/mail/Cloudinary/Gemini/Groq/PayPal/SePay credentials) must come from a **secret manager or the runtime environment** (e.g. your cloud provider's secrets store, injected as container env vars), never from a file committed to the repo or baked into a Docker image.
- `.env` and `.env.prod` are gitignored — keep it that way, and don't paste real credentials into PRs, issues, or chat when sharing config.
- Rotate `JWT_SECRET` and the per-service `*_ENCRYPTION_KEY`s independently; they are not shared between `auth-service` and `lms-core-service` by design.

## Rate limiting & external API failure behavior

- The API Gateway rate-limits by client IP via Redis (`RequestRateLimiter`, key resolver in `RateLimiterConfig`). Limits are currently **hardcoded per route** in `api-gateway/application.yml` (not env-configurable), e.g. auth routes `10 req/s` (burst `20`), course/catalog routes `20 req/s` (burst `40`), payment webhooks `50 req/s` (burst `100`), AI routes `15 req/s` (burst `30`). Adjust these directly in the gateway's route config if production traffic needs different limits.
- **Gemini/Groq failures don't take down the app** — AI features are configured conditionally; if `GEMINI_API_KEY`/`GROQ_API_KEY` are unset or the upstream call fails, only the AI/transcription endpoints return errors (or, for Groq `429`s, jobs move to `DELAYED` and are retried by `TranscriptionRetryScheduler` every 30s). Non-AI endpoints are unaffected.

## Temporary file & upload handling

- **Whisper transcription temp audio files** are written to the JVM temp directory (`java.io.tmpdir`) with UUID names and are always deleted in a `finally` block (`Files.deleteIfExists`) after transcription — whether the job succeeds or fails. Deletion errors are swallowed (non-fatal), so don't rely on this path for disk-space accounting under repeated failures; monitor `java.io.tmpdir` usage if transcription volume is high.
- **Upload limits**: `auth-service` and `lms-core-service` cap multipart uploads at **10MB** (`max-file-size` / `max-request-size`). `api-gateway` has no multipart size override, so it defers to Spring's default.
- **Groq's own 25MB limit** is enforced in application code before the API call (`GROQ_MAX_BYTES = 25 * 1024 * 1024`) — an audio file over 25MB fails fast locally with a clear error instead of being rejected by Groq after upload.
