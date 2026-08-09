# API Gateway Service

Single entry point for all client traffic into the EduMind platform. Built on Spring Cloud Gateway (WebFlux/reactive).

**Port:** 8080 (default, `API_GATEWAY_PORT`)

## Table of Contents

- [Responsibilities](#responsibilities)
- [Architecture](#architecture)
- [Route Matrix](#route-matrix)
- [Rate Limiting](#rate-limiting)
- [CORS](#cors)
- [Environment Variables](#environment-variables)
- [Local Run](#local-run)
- [Monitoring](#monitoring)
- [Production Notes](#production-notes)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Docker Guide](../DOCKER.md)

## Responsibilities

The gateway currently does:

- **Routing** — path-based routing to `AUTH-SERVICE` and `LMS-CORE-SERVICE` via Eureka (`lb://`)
- **Path rewriting** — `RewritePath` rewrites external API paths to internal service paths. For most routes this simply strips the `/api` prefix (`/api/auth/login` → `/auth/login`); the two OAuth2 routes remap to Spring Security's fixed `/oauth2/authorization/**` and `/login/oauth2/**` paths instead
- **Rate limiting** — Redis-backed, per-IP, configured per route group (see [Rate Limiting](#rate-limiting))
- **CORS** — global CORS policy driven by `CORS_ALLOWED_ORIGINS`
- **Request/response logging** — `LoggingFilter` logs method, path, response status
- **Error formatting** — `GlobalExceptionHandler` (`ErrorWebExceptionHandler`) formats exceptions that aren't already handled elsewhere in the chain. It only special-cases `ResponseStatusException` (uses its status/reason); everything else becomes a generic `500`. It does **not** specifically detect "route not found" or "upstream unavailable" as distinct cases. `429` from `RequestRateLimiter` and error responses proxied from downstream services are not guaranteed to go through this handler or share its JSON schema

The gateway does **not** currently do:

- **Authentication / JWT validation** — each backend service (`auth-service`, `lms-core-service`) validates its own JWTs. The gateway forwards the `Authorization` header as-is without checking it.
- **Request body validation** — no schema/input validation happens at the gateway.

There is no `SecurityConfig` in this module (`src/main/java/com/edumind/gateway/`) — only `RateLimiterConfig`, `LoggingFilter`, and `GlobalExceptionHandler`.

## Architecture

```
Client → API Gateway (8080) → Eureka lookup → AUTH-SERVICE (8081) | LMS-CORE-SERVICE (8083)
                             → Redis (6379) for rate-limit counters
```

Request flow: `LoggingFilter` (logs) → CORS → route match → `RequestRateLimiter` (per-route Redis bucket) → `RewritePath` → forward via load-balanced Eureka lookup.

## Route Matrix

Source of truth: [`src/main/resources/application.yml`](src/main/resources/application.yml). Routes are evaluated top-to-bottom; more specific paths must be declared **before** broader catch-alls that share a prefix.

### AUTH-SERVICE

| Route Pattern | Internal Path | Rate Limit (replenish/burst) | Notes |
|---|---|---|---|
| `/api/auth/oauth2/**` | `/oauth2/authorization/**` | — | OAuth2 authorization redirect |
| `/api/auth/login/oauth2/**` | `/login/oauth2/**` | — | OAuth2 callback |
| `/api/auth/**` | `/auth/**` | 10 / 20 | Login, register, tokens |
| `/api/admin/**` | `/admin/**` | 10 / 20 | Auth-service admin endpoints — **must stay below** the two LMS admin routes |
| `/api/users/**` | `/users/**` | 10 / 20 | User profiles |
| `/api/upload/**` | `/upload/**` | 10 / 20 | File uploads |
| `/api/teacher-application/**` | `/teacher-application/**` | 10 / 20 | Teacher onboarding |

### LMS-CORE-SERVICE — Admin (must precede `/api/admin/**` above)

| Route Pattern | Internal Path | Rate Limit | Notes |
|---|---|---|---|
| `/api/admin/dashboard/**` | `/admin/dashboard/**` | 10 / 20 | Admin dashboard stats |
| `/api/admin/enrollment-reports/**` | `/admin/enrollment-reports/**` | 10 / 20 | Enrollment reporting |

### LMS-CORE-SERVICE — Learning

| Route Pattern | Internal Path | Rate Limit | Notes |
|---|---|---|---|
| `/api/ai/**` | `/ai/**` | 15 / 30 | RAG chat, quizzes, summaries, transcription |
| `/api/courses/**` | `/courses/**` | 20 / 40 | Course CRUD & browsing |
| `/api/categories/**` | `/categories/**` | 20 / 40 | Category browsing/admin |
| `/api/sections/**` | `/sections/**` | 20 / 40 | Course sections |
| `/api/lessons/**` | `/lessons/**` | 20 / 40 | Lesson content |
| `/api/enrollments/**` | `/enrollments/**` | 15 / 30 | Student enrollments |
| `/api/certificates/**` | `/certificates/**` | 15 / 30 | Certificate download/verify |
| `/api/progress/**` | `/progress/**` | 15 / 30 | Lesson progress |
| `/api/reviews/**` | `/reviews/**` | 10 / 20 | Course reviews |
| `/api/wishlist/**` | `/wishlist/**` | 10 / 20 | Wishlist |

### LMS-CORE-SERVICE — Payments

| Route Pattern | Internal Path | Rate Limit | Notes |
|---|---|---|---|
| `/api/cart/**` | `/cart/**` | 15 / 30 | Shopping cart |
| `/api/checkout/**` | `/checkout/**` | 10 / 20 | Checkout/order creation |
| `/api/orders/**` | `/orders/**` | 15 / 30 | Order history |
| `/api/invoices/**` | `/invoices/**` | 15 / 30 | Invoice PDF/view |
| `/api/teacher/earnings/**` | `/teacher/earnings/**` | 15 / 30 | Teacher earnings |
| `/api/teacher/analytics/**` | `/teacher/analytics/**` | 15 / 30 | Teacher analytics dashboard |
| `/api/payments/refunds/**` | `/payments/refunds/**` | 10 / 20 | Refund requests |
| `/api/instructors/payouts/**` | `/instructors/payouts/**` | 10 / 20 | Instructor payouts |
| `/api/payments/webhook/**` | `/payments/webhook/**` | 50 / 100 | Public webhook (PayPal/SePay/Mock) — does not require a JWT (signature/API-key verification happens downstream in LMS Core), higher rate ceiling for gateway callbacks |

### Adding a route

1. Add the route block under `spring.cloud.gateway.routes` in `application.yml`, placing it above any existing route whose path prefix overlaps.
2. Ensure the target service is registered with Eureka.
3. Restart the gateway.

## Rate Limiting

There is **no single global rate limit** — each route declares its own `RequestRateLimiter` filter with its own Redis bucket (see the matrix above). Values in use today: 10/20, 15/30, 20/40, and 50/100 (webhook only).

- **Key resolver**: per-IP (`RateLimiterConfig.ipKeyResolver`, `src/main/java/com/edumind/gateway/config/RateLimiterConfig.java`) — falls back to `"unknown"` if the remote address can't be resolved.
- **Backend**: Redis (`spring.data.redis.*`), token-bucket semantics via Spring Cloud Gateway's `redis-rate-limiter`.
- **On limit exceeded**: `429 Too Many Requests`.

To change a route's limit, edit its `redis-rate-limiter.replenishRate` / `burstCapacity` in `application.yml`.

**Known gap — reverse proxy / load balancer deployments**: `ipKeyResolver` reads `exchange.getRequest().getRemoteAddress()` directly. If the gateway is deployed behind Nginx, Cloudflare, or a load balancer, that address will be the proxy's IP, not the client's — every client behind the proxy shares one rate-limit bucket. There is currently no trusted-proxy or `X-Forwarded-For`-aware resolver. Do not blindly trust `X-Forwarded-For` either — it must only be honored once a trusted proxy list is configured. Fix before deploying behind any proxy/LB.

## CORS

Configured globally in `application.yml` under `spring.cloud.gateway.globalcors`:

```yaml
globalcors:
  cors-configurations:
    '[/**]':
      allowedOriginPatterns: ${CORS_ALLOWED_ORIGINS:http://localhost:3000,http://localhost:4200}
      allowedMethods: [GET, POST, PUT, DELETE, PATCH, OPTIONS]
      allowedHeaders: "*"
      allowCredentials: true
      exposed-headers: ["Set-Cookie"]
      maxAge: 3600
```

Allowed origins are controlled **only** by `CORS_ALLOWED_ORIGINS` (comma-separated). `ADMIN_URL` and `FRONTEND_URL` are set on the `api-gateway` container in `docker-compose.yml` but are **not read** by this service — they're leftover from copy-pasting other services' env blocks and have no effect on CORS here. If you need those values to control CORS, set `CORS_ALLOWED_ORIGINS` instead.

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `API_GATEWAY_PORT` | Server port | `8080` |
| `EUREKA_DEFAULT_ZONE` | Eureka server URL | `http://localhost:8761/eureka/` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_PASSWORD` | Redis password | (empty) |
| `REDIS_TIMEOUT` | Redis connection timeout | `60000ms` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins for CORS | `http://localhost:3000,http://localhost:4200` |
| `ACTUATOR_HEALTH_DETAILS` | `/actuator/health` detail level (`never` or `always`) | `never` |

## Local Run

Run each step in its own terminal (paths are relative to `backend/`):

```bash
# Terminal 1 — backend/
docker compose up -d redis

# Terminal 2 — backend/discovery-service/
cd discovery-service
mvn spring-boot:run   # wait for http://localhost:8761

# Terminal 3 — backend/auth-service/ (at least one backend service)
cd auth-service
mvn spring-boot:run

# Terminal 4 — backend/api-gateway/
cd api-gateway
mvn spring-boot:run
```

Verify:
```bash
curl http://localhost:8080/actuator/health              # gateway itself
curl http://localhost:8080/actuator/gateway/routes       # confirm routes loaded
curl http://localhost:8761/eureka/apps                   # confirm AUTH-SERVICE registered
```

There is no `/api/auth/health` endpoint — `auth-service` doesn't expose one, and the gateway doesn't route `/api/actuator/**`. Use the checks above to confirm routing/registration instead of guessing at an endpoint.

## Monitoring

Exposed actuator endpoints (`management.endpoints.web.exposure.include`): `health, info, metrics, gateway`.

```bash
curl http://localhost:8080/actuator/health
curl http://localhost:8080/actuator/metrics
curl http://localhost:8080/actuator/gateway/routes
```

`management.endpoint.gateway.access` is set to `read-only` — `GET` requests (e.g. `/actuator/gateway/routes`) work, but the actuator cannot be used to mutate routes at runtime (no `POST /actuator/gateway/refresh`, etc.).

`/actuator/health` detail level is controlled by `ACTUATOR_HEALTH_DETAILS` (default `never`) — the gateway has no Spring Security, so anyone who can reach this port could otherwise read component-level health (Redis, Eureka, disk space) with no authentication. Set `ACTUATOR_HEALTH_DETAILS=always` locally when you need to debug a failing dependency; leave it `never` anywhere the port is reachable outside your own machine.

Logs: `logs/api-gateway.log` (rolling, 10MB/file, 30-day retention — see `logback-spring.xml`). Default log levels (`com.edumind`, `org.springframework.cloud.gateway`, `org.springframework.web`) are `DEBUG` in `application.yml` — fine for local dev, but noisy and potentially leaks request detail if left on in a shared/production environment.

## Production Notes

There is currently only one config file: `src/main/resources/application.yml`. **No `application-prod.yml` exists in this repo.** Any profile-based (`dev`/`staging`/`prod`) setup, Kubernetes manifests, or externalized-config guidance is **not implemented** — treat such examples elsewhere as illustrative starting points, not as documentation of current deployment.

Known gaps if you're taking this to production:
- **No authentication/authorization at the gateway layer** — relies entirely on downstream services validating JWTs.
- **Rate limiting breaks behind a reverse proxy/load balancer** — see the note in [Rate Limiting](#rate-limiting); `ipKeyResolver` isn't proxy-aware.
- **`ACTUATOR_HEALTH_DETAILS` must stay `never`** wherever the gateway port is reachable from outside your own machine — it currently defaults safely, but nothing prevents it being flipped to `always` in a shared environment.
- **Debug logging is on by default** — `com.edumind`, `org.springframework.cloud.gateway`, and `org.springframework.web` are set to `DEBUG` in `application.yml`. Switch to `INFO` (or add an `application-prod.yml`, which doesn't exist yet) before running anywhere shared, to reduce noise and avoid logging request detail unnecessarily.
- **No TLS termination configured here.**
- `CORS_ALLOWED_ORIGINS` must be set to real origins — the default falls back to `localhost` values.

## Testing

```bash
mvn test
```

There is currently one test: `ApiGatewayApplicationTests` (context-load only — verifies the Spring context starts). There are no route-matching, rate-limit, or filter integration tests yet.

## Troubleshooting

**Port 8080 already in use**
```bash
lsof -i :8080          # find the process
kill -9 <PID>
# or: export API_GATEWAY_PORT=8081
```

**Cannot connect to Eureka** — verify it's up (`curl http://localhost:8761/eureka/apps`), check `EUREKA_DEFAULT_ZONE`.

**Cannot connect to Redis** — `docker compose ps redis`, `redis-cli ping`, check `REDIS_HOST`/`REDIS_PORT`.

**Route returns 503** — target service isn't registered/healthy in Eureka. Check the Eureka dashboard (`http://localhost:8761`) and the service's own `/actuator/health`.

**Rate limiting not applying** — confirm Redis is reachable and the route has a `RequestRateLimiter` filter in `application.yml`.

**CORS errors from frontend** — confirm the calling origin is included in `CORS_ALLOWED_ORIGINS`. Note this config uses `allowedOriginPatterns`, which (unlike `allowedOrigins`) can technically combine a wildcard pattern with `allowCredentials: true` — don't rely on a wildcard in production regardless, since it defeats the purpose of an origin allowlist; always set explicit production origins in `CORS_ALLOWED_ORIGINS`.

---

**Maintainers:** EduMind Development Team
