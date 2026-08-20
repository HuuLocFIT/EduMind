# Production Operations

Deployment, migration, secrets, and runtime-behavior reference for running the backend in production. For the day-to-day dev/local setup, see [backend/README.md](../backend/README.md).

## Deploying

`docker-compose.prod.yml` runs the platform from **prebuilt images published to GitHub Container Registry (GHCR)** instead of building from source:

```bash
cd backend
GITHUB_REPOSITORY_OWNER=<owner> IMAGE_TAG=<short-sha> \
  docker compose -f docker-compose.prod.yml up -d --wait
# Both image selector variables are required; mutable "latest" is rejected.
# Images: ghcr.io/<owner>/edumind-{discovery-service,auth-service,lms-core-service,api-gateway}:<tag>
```

Differences from the local compose file:
- Application services (`discovery-service`, `auth-service`, `lms-core-service`, `api-gateway`) pull GHCR images instead of building a `Dockerfile` from `context: .`.
- Every service (including the two Postgres containers and Redis) has a `healthcheck`, and app services `depends_on` their dependencies with `condition: service_healthy`.
- `postgres-auth-data`, `postgres-lms-core-data`, and `redis-data` are named Docker volumes, so data survives container restarts/recreation.
- `.env` still supplies secrets (`JWT_SECRET`, `GEMINI_API_KEY`, `GROQ_API_KEY`, Cloudinary/OAuth/mail credentials, etc.) — never bake secrets into the image.
- Databases, Redis, Auth, and LMS Core bind only to `127.0.0.1`; only the Gateway is intended as a public application entry point.
- All four Java applications run with `SPRING_PROFILES_ACTIVE=prod`.

## ⚠️ Production configuration checklist

Production checks that still require an operator decision or deployment-specific configuration:

- **Choose a real payment gateway.** Production Compose requires `PAYMENT_GATEWAY` and forces `PAYMENT_MOCK_ENABLED=false`; set the selected PayPal or SePay credentials and enable that gateway explicitly.
- **Production profiles are enforced.** All four Java applications have `application-prod.yml`; production Compose activates them. LMS Core suppresses SQL/binder debug logs, health details are hidden, and graceful shutdown is enabled with a 30-second shutdown phase.
- **`/actuator/metrics` already requires `ROLE_ADMIN`** on `auth-service` and `lms-core-service` (enforced in each service's `SecurityConfig`) — only `/actuator/health` and `/actuator/info` are public. **`discovery-service` and `api-gateway` have no such restriction** on `/actuator/**` — treat their actuator endpoints as internal-network-only (don't expose them publicly) until access control is added.
- **Readiness/liveness**: use `/actuator/health` per service as both probes for now — there's no separate readiness/liveness split configured (no Kubernetes-specific health groups). `docker-compose.prod.yml` already wires `healthcheck` + `depends_on: condition: service_healthy` for orchestration-level readiness.
- **Log collection**: services log to `logs/<service>.log` locally (rolling, 10MB/30 files) — this is not sufficient in production. Ship container stdout/stderr (or the log files) to a centralized collector (e.g. your platform's log driver, Loki, CloudWatch) rather than relying on tailing files on the container filesystem.
- **Production secrets fail fast.** Production Compose rejects missing DB passwords, JWT/encryption secrets, public URLs, image owner, and immutable image tag. The development Compose file intentionally retains local defaults and must not be used for production.

## Database migration policy

- **Forward-only**: Flyway migrations only move forward (`baseline-on-migrate: true`, `flyway:migrate`). Never edit or delete a migration file that has already shipped/run anywhere outside your own machine.
- **Fix forward, don't rewrite history**: if a released migration has a bug, ship a new migration that corrects it — do not modify the checksummed file (Flyway will reject a changed checksum on next run; `flyway:repair` is for fixing metadata after a manual DB fix, not for condoning migration edits).
- **Backup before any migration that touches production data materially** (schema changes affecting existing rows, backfills, drops) — take a database snapshot/backup immediately before running `flyway:migrate` in production.
- **Rollback = new migration, not `flyway:clean`/`undo`**: `flyway:clean` is destructive (drops all configured schemas) and must never run against production. If a migration causes a problem in production, roll forward with a corrective migration in the next release rather than attempting to revert the applied one.

## Deployment verification checklist

After deploying a new version, verify in order:
1. `curl --fail http://<public-host>:8080/actuator/health` returns `200` for `api-gateway` — this is the only service reachable from outside the VPS. For `discovery-service`, `auth-service`, and `lms-core-service` (bound to `127.0.0.1` or not published at all), run the check from the VPS itself, e.g. `docker compose -f docker-compose.prod.yml exec <service> wget -qO- http://localhost:<port>/actuator/health`.
2. New service instances appear in the Eureka dashboard — open via SSH tunnel or `docker compose exec discovery-service ...` since it has no published port (`http://<discovery-host>:8761`).
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
