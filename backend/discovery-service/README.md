# Discovery Service

The Discovery Service is the Eureka Server used as the service registry for the EduMind backend. The current implementation runs as **one standalone Eureka node** and provides registration and instance lookup for `auth-service`, `lms-core-service`, and `api-gateway`.

> This document describes what is currently implemented in the repository. The registry and dashboard require HTTP Basic authentication. Eureka clustering and TLS are not configured.

## Technology and default addresses

| Component | Value |
|---|---|
| Java | 21 |
| Spring Boot | 3.5.6 |
| Spring Cloud | 2025.0.0 |
| Eureka | `spring-cloud-starter-netflix-eureka-server` |
| Security | `spring-boot-starter-security` (HTTP Basic) |
| Actuator | Health, info, and metrics |
| Port | `8761` |
| Dashboard | `http://localhost:8761` (login required) |
| Registry API | `http://localhost:8761/eureka/apps` (login required) |

The parent POM at `backend/pom.xml` manages these versions. This module does not declare separate Spring Boot or Spring Cloud versions.

## Role in the system

```text
                         discovery-service :8761
                              Eureka Server
                                    │
             ┌──────────────────────┼──────────────────────┐
             │                      │                      │
             ▼                      ▼                      ▼
      auth-service :8081   lms-core-service :8083   api-gateway :8080
         AUTH-SERVICE          LMS-CORE-SERVICE          API-GATEWAY
```

All three services set `register-with-eureka: true` and `fetch-registry: true`, reach the registry through `EUREKA_DEFAULT_ZONE`, and authenticate with an `Authorization` header supplied by the shared `eureka-client-security` module. The API Gateway uses `lb://AUTH-SERVICE` and `lb://LMS-CORE-SERVICE` URIs for registry-backed instance lookup and client-side load balancing.

The Gateway's automatic discovery locator is **intentionally disabled**. The Gateway uses only explicitly configured `lb://...` routes; Eureka does not create additional `/{service-id}/**` routes.

Runtime flow:

1. A client service starts and registers its instance with Eureka, authenticating with an `Authorization` header.
2. The client periodically renews its lease through heartbeats.
3. Eureka stores the registry and makes it available to other clients.
4. The Gateway resolves an instance from the registry for an `lb://...` route.
5. An instance whose lease expires may be removed during an eviction cycle.

With the current configuration, Eureka Server does not actively poll each service's health endpoint. Registry state primarily comes from registration, heartbeat/lease renewal, and the status supplied by the Eureka client.

### Registration and lease lifecycle

The following behavior is provided by Spring Cloud Netflix Eureka rather than custom application code:

1. On startup, a Eureka client sends its application name, instance ID, host, port, status, and metadata to the server.
2. The client periodically sends heartbeats to renew its lease. The Eureka client defaults are normally a 30-second renewal interval and a 90-second lease duration unless a client overrides them.
3. Other Eureka clients periodically fetch the registry and keep a local cache.
4. When a client shuts down cleanly, it attempts to cancel its registration.
5. If a client disappears without deregistering and its lease expires, the server can remove it during the next eviction cycle.

The server eviction interval controls how often Eureka looks for expired leases. It does not replace the lease settings owned by each client.

### Instance statuses

Eureka instances may expose these standard statuses:

| Status | Meaning |
|---|---|
| `UP` | Available for discovery |
| `DOWN` | Not available |
| `STARTING` | Starting and not yet fully available |
| `OUT_OF_SERVICE` | Intentionally removed from service |
| `UNKNOWN` | No recognized status is available |

## Security

`src/main/java/com/edumind/discovery/config/SecurityConfig.java` defines a single filter chain:

- `/actuator/health` and `/actuator/health/**` are open, because the container health check calls them without credentials. The response body carries only `{"status":"UP"}` unless the caller authenticates.
- Every other path — the dashboard at `/`, `/eureka/**`, and the remaining Actuator endpoints — requires HTTP Basic authentication.
- CSRF is disabled for `/eureka/**` so that client registration (`POST`), renewal (`PUT`), and cancellation (`DELETE`) work; those calls carry no CSRF token.

Credentials come from `EUREKA_USERNAME` / `EUREKA_PASSWORD`. The default profile falls back to `eureka` / `eureka` for local development; the `prod` profile declares the same properties **without defaults**, so the application fails to start when the variables are missing.

Eureka clients do **not** put the credentials in the zone URL. `backend/eureka-client-security` auto-configures them to send an `Authorization` header instead, built from `EUREKA_USERNAME` / `EUREKA_PASSWORD`:

```text
EUREKA_DEFAULT_ZONE=http://discovery-service:8761/eureka/   # no credentials
EUREKA_USERNAME=<user>
EUREKA_PASSWORD=<password>
```

That keeps passwords containing `@`, `:`, `/`, `#`, or `%` from corrupting URI parsing, and keeps them out of `docker inspect` and log output. See that module's README for how it hooks into Spring Cloud while preserving TLS.

The credentials travel in cleartext because TLS is not configured. Keep the registry on the internal Docker network; `docker-compose.prod.yml` does not publish port 8761 to the host.

## Current configuration

`src/main/resources/application.yml` — the full file:

```yaml
server:
  port: ${DISCOVERY_SERVER_PORT:8761}
  shutdown: graceful

spring:
  application:
    name: service-discovery
  lifecycle:
    timeout-per-shutdown-phase: 20s
  security:
    user:
      name: ${EUREKA_USERNAME:eureka}
      password: ${EUREKA_PASSWORD:eureka}

eureka:
  instance:
    hostname: ${EUREKA_HOSTNAME:localhost}
  client:
    register-with-eureka: false
    fetch-registry: false
    service-url:
      defaultZone: http://${eureka.instance.hostname}:${server.port}/eureka/
  server:
    enable-self-preservation: false
    eviction-interval-timer-in-ms: 5000

logging:
  level:
    root: INFO
    com.edumind: DEBUG
    com.netflix.eureka: INFO
    com.netflix.discovery: INFO

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
  endpoint:
    health:
      show-details: when-authorized
```

Appenders, log patterns, and rotation are owned by `logback-spring.xml`; `application.yml` sets levels only.

`src/main/resources/application-prod.yml` — applied when `SPRING_PROFILES_ACTIVE=prod`:

```yaml
spring:
  security:
    user:
      name: ${EUREKA_USERNAME}
      password: ${EUREKA_PASSWORD}

eureka:
  server:
    enable-self-preservation: true
    renewal-percent-threshold: 0.85
    eviction-interval-timer-in-ms: 60000

logging:
  level:
    com.edumind: INFO
```

### Environment variables

| Variable | Default | Purpose |
|---|---:|---|
| `DISCOVERY_SERVER_PORT` | `8761` | HTTP port used by this service. The Dockerfile's `EXPOSE` and health check follow this variable, and both Compose files use it on each side of the port mapping. |
| `EUREKA_HOSTNAME` | `localhost` | Hostname used in the Eureka server configuration |
| `EUREKA_USERNAME` | `eureka` (none under `prod`) | HTTP Basic user for the registry and dashboard |
| `EUREKA_PASSWORD` | `eureka` (none under `prod`) | HTTP Basic password |
| `SPRING_PROFILES_ACTIVE` | Empty | Set to `prod` to apply `application-prod.yml` |
| `JAVA_OPTS` | Empty | JVM options accepted by the Docker image |
| `DISCOVERY_JAVA_OPTS` | `-XX:MaxRAMPercentage=75.0` | Compose-level value passed into the container as `JAVA_OPTS` |

`EUREKA_DEFAULT_ZONE` is not a Discovery Service setting. Eureka clients use it to locate this server, and it carries no credentials:

- Native execution: `http://localhost:8761/eureka/`
- Docker Compose: `http://discovery-service:${DISCOVERY_SERVER_PORT}/eureka/`

Clients read `EUREKA_USERNAME` / `EUREKA_PASSWORD` separately and send them as a header.

### Current standalone behavior

- The server does not register itself with Eureka.
- The server does not fetch a registry from peers.
- Under the default profile, self-preservation is disabled and the eviction task runs every five seconds. This is the scan interval, not the client lease timeout.
- Under the `prod` profile, self-preservation is enabled, the renewal threshold is `0.85`, and the eviction task runs every sixty seconds.
- Shutdown is graceful: in-flight requests get up to twenty seconds to finish after `SIGTERM`.

## Running locally

Java 21 and Maven are required. The repository includes Maven Wrapper, so a system-wide Maven installation is optional.

Run from the module directory:

```bash
cd backend/discovery-service
./mvnw spring-boot:run
```

Alternatively, build and run the JAR:

```bash
cd backend/discovery-service
./mvnw clean package
java -jar target/service-discovery-1.0.0-SNAPSHOT.jar
```

You may use `mvn` instead of `./mvnw` if a compatible Maven version is installed.

Verify the service:

```bash
curl http://localhost:8761/actuator/health
curl -u eureka:eureka -H 'Accept: application/json' http://localhost:8761/eureka/apps
```

The dashboard is available at `http://localhost:8761` and prompts for the same credentials. The registry may be empty until the other backend services start.

For native backend execution, use this recommended startup order:

1. `discovery-service`
2. `auth-service` and `lms-core-service`
3. `api-gateway`

The databases and Redis must also be running as described in `backend/README.md`.

## Eureka dashboard

Open `http://localhost:8761` after the service starts and sign in with `EUREKA_USERNAME` / `EUREKA_PASSWORD`. The dashboard is supplied by the Eureka Server dependency; this repository does not implement a custom dashboard.

The main page provides:

- General Eureka environment and server information.
- Registered applications grouped by application name.
- Instance count and status.
- Hostname, instance ID, and service URL information.
- Replica information. With the current standalone configuration, no peer replica is expected.

For a normal full-backend run, the registered application list should eventually include:

- `AUTH-SERVICE`
- `LMS-CORE-SERVICE`
- `API-GATEWAY`

Registration is asynchronous. A service may take a short time to appear after its process reports that it has started. Refresh the dashboard or query `/eureka/apps` before concluding that registration failed.

## Running with Docker Compose

The module Dockerfile requires `backend/` as its build context because it copies the parent POM, every module POM, and the sources of `common-lib` and `discovery-service` from the Maven reactor.

Recommended commands:

```bash
cd backend
docker compose up -d --build discovery-service
docker compose ps discovery-service
docker compose logs -f discovery-service
```

Build the image directly:

```bash
cd backend
docker build \
  -f discovery-service/Dockerfile \
  -t edumind/discovery-service:latest \
  .
```

Do not run `docker build .` from `backend/discovery-service`; that context does not contain the parent POM and module POMs copied by the Dockerfile.

The current image:

- Builds the JAR with Maven 3.9 and Eclipse Temurin 21.
- Runs on `eclipse-temurin:21-jre-alpine`.
- Runs as a non-root user.
- Installs `wget` for the container health check.
- Defaults `DISCOVERY_SERVER_PORT` to `8761` and uses it for `EXPOSE` and for the health check URL.
- Calls `/actuator/health` every 30 seconds for its health check.
- Accepts JVM options through `JAVA_OPTS`.

`docker-compose.yml` publishes `${DISCOVERY_SERVER_PORT:-8761}` on both sides of the mapping, sets `EUREKA_HOSTNAME=discovery-service`, passes the Basic credentials, mounts the `discovery-logs` volume at `/app/logs`, limits the container to 512 MB, and connects the service to `edumind-network`.

`docker-compose.prod.yml` additionally sets `SPRING_PROFILES_ACTIVE=prod`, requires `EUREKA_USERNAME` and `EUREKA_PASSWORD` (Compose refuses to start without them), and **does not publish port 8761 to the host** — the registry is reachable only from `edumind-network`. To open the dashboard against a production deployment, use an SSH tunnel or `docker compose exec`.

### Running the image without Compose

After building the image from the `backend/` context, it can be run directly:

```bash
docker run --rm \
  --name edumind-discovery-service \
  -p 8761:8761 \
  -e DISCOVERY_SERVER_PORT=8761 \
  -e EUREKA_HOSTNAME=localhost \
  -e EUREKA_USERNAME=eureka \
  -e EUREKA_PASSWORD=eureka \
  edumind/discovery-service:latest
```

When other services run in separate containers, put them on the same Docker network and use a hostname resolvable from those containers. The Compose setup already provides this wiring.

## Actuator and monitoring

The following endpoints are exposed:

| Endpoint | Authentication | Purpose |
|---|---|---|
| `/actuator/health` | None | Overall health; used by the Dockerfile and Docker Compose |
| `/actuator/info` | Basic | Application information when an info contributor supplies it |
| `/actuator/metrics` | Basic | Available Micrometer metrics |
| `/actuator/metrics/{name}` | Basic | Details for one metric |

Examples:

```bash
curl http://localhost:8761/actuator/health
curl -u eureka:eureka http://localhost:8761/actuator/health
curl -u eureka:eureka http://localhost:8761/actuator/metrics
curl -u eureka:eureka http://localhost:8761/actuator/metrics/jvm.memory.used
```

Useful metrics commonly supplied by Spring Boot and the JVM include:

| Metric | Purpose |
|---|---|
| `jvm.memory.used` | JVM memory consumption |
| `jvm.gc.pause` | Garbage collection pause measurements |
| `process.cpu.usage` | Process CPU usage |
| `http.server.requests` | HTTP server request timing and counts |

Always query `/actuator/metrics` first because the exact metric set depends on the active runtime instrumentation and whether a metric has been observed.

`management.endpoint.health.show-details` is set to `when-authorized`. An unauthenticated call returns the status only; component details require Basic credentials.

The repository does not explicitly enable `management.endpoint.health.probes.enabled`. The current documentation and deployment therefore rely only on `/actuator/health` and do not assume `/actuator/health/liveness` or `/actuator/health/readiness` is always available outside Kubernetes.

## Logging

`logback-spring.xml` is the single source of truth for appenders and rotation:

- The root logger writes at `INFO` level.
- The `com.edumind` package writes at `DEBUG` level, lowered to `INFO` under the `prod` profile.
- The active log file is `logs/discovery-service.log`.
- Logs rotate daily and when a file reaches 10 MB.
- Thirty days of history are retained.

```bash
tail -f logs/discovery-service.log
grep -i error logs/discovery-service.log
tail -n 100 logs/discovery-service.log
```

Inside a container the path is `/app/logs`, backed by the `discovery-logs` volume in both Compose files, so history survives a container replacement:

```bash
docker compose exec discovery-service tail -f /app/logs/discovery-service.log
```

Registration, renewal, and cancellation events originate from Eureka's own logger packages. `application.yml` already sets these two keys to `INFO`; to get verbose heartbeat diagnostics, **change the existing values** rather than adding duplicate keys:

```yaml
logging:
  level:
    com.netflix.eureka: DEBUG
    com.netflix.discovery: DEBUG
```

Use verbose logging only while diagnosing a problem because registry and heartbeat activity can produce substantial output.

## Eureka REST API

The standard Eureka Server endpoints are supplied by the dependency and all require Basic authentication:

```text
GET    /eureka/apps
GET    /eureka/apps/{app-name}
GET    /eureka/apps/{app-name}/{instance-id}
POST   /eureka/apps/{app-name}
PUT    /eureka/apps/{app-name}/{instance-id}
DELETE /eureka/apps/{app-name}/{instance-id}
```

Eureka supports both XML and JSON representations. Send an `Accept: application/json` header when JSON output is preferred.

### Get all applications

Query the registry:

```bash
curl -u eureka:eureka -H 'Accept: application/json' \
  http://localhost:8761/eureka/apps
```

### Get one application

```bash
curl -u eureka:eureka -H 'Accept: application/json' \
  http://localhost:8761/eureka/apps/AUTH-SERVICE

curl -u eureka:eureka -H 'Accept: application/json' \
  http://localhost:8761/eureka/apps/LMS-CORE-SERVICE
```

Application names are conventionally uppercase in Eureka registry queries.

### Get one instance

```bash
curl -u eureka:eureka -H 'Accept: application/json' \
  http://localhost:8761/eureka/apps/AUTH-SERVICE/auth-service:8081
```

The actual instance ID is controlled by the client configuration. Check the application response or dashboard instead of assuming it when multiple instances or custom IDs are used.

### Register an instance

Registration is normally performed by the Spring Eureka client. The underlying endpoint accepts a request shaped like this:

```bash
curl -u eureka:eureka -X POST http://localhost:8761/eureka/apps/EXAMPLE-SERVICE \
  -H 'Content-Type: application/json' \
  -d '{
    "instance": {
      "instanceId": "example-service:8090",
      "hostName": "localhost",
      "app": "EXAMPLE-SERVICE",
      "ipAddr": "127.0.0.1",
      "status": "UP",
      "port": {"$": 8090, "@enabled": true},
      "securePort": {"$": 8443, "@enabled": false},
      "homePageUrl": "http://localhost:8090/",
      "statusPageUrl": "http://localhost:8090/actuator/info",
      "healthCheckUrl": "http://localhost:8090/actuator/health"
    }
  }'
```

### Renew or cancel an instance

```bash
# Renew the lease
curl -u eureka:eureka -X PUT \
  http://localhost:8761/eureka/apps/EXAMPLE-SERVICE/example-service:8090

# Cancel the registration
curl -u eureka:eureka -X DELETE \
  http://localhost:8761/eureka/apps/EXAMPLE-SERVICE/example-service:8090
```

During normal operation, Spring Eureka clients handle registration, heartbeat, and deregistration automatically. Manual registration with `curl` is unnecessary.

## Troubleshooting

### A request returns 401

Only `/actuator/health` is open. Everything else needs `-u $EUREKA_USERNAME:$EUREKA_PASSWORD`. If a client cannot register, check that the client received `EUREKA_USERNAME` / `EUREKA_PASSWORD` and that they match the server's values — the client logs `Eureka client authenticates as '<user>' via an Authorization header` at startup when the module is active. Credentials do **not** belong in `EUREKA_DEFAULT_ZONE` any more.

### Startup fails with an unresolved placeholder for `EUREKA_USERNAME`

The `prod` profile deliberately has no default credentials. Supply `EUREKA_USERNAME` and `EUREKA_PASSWORD`, or run without `SPRING_PROFILES_ACTIVE=prod` for local development.

### Port already in use

```bash
lsof -i :8761
DISCOVERY_SERVER_PORT=8762 ./mvnw spring-boot:run
```

When the port changes, native clients must also receive the matching URL:

```bash
export EUREKA_DEFAULT_ZONE=http://localhost:8762/eureka/
```

Under Docker Compose, setting `DISCOVERY_SERVER_PORT` in `.env` is enough: the mapping, the health check, and the clients' zone URLs all derive from it.

### A service does not appear in the registry

1. Check Eureka: `curl http://localhost:8761/actuator/health`.
2. Check the client's `EUREKA_DEFAULT_ZONE`, plus its `EUREKA_USERNAME` / `EUREKA_PASSWORD`.
3. Confirm that the client has `register-with-eureka: true`.
4. Check network and DNS resolution. Compose clients must use `discovery-service`, not `localhost` from inside the client container.
5. Inspect both the Discovery Service and client logs. A `401` in the client log points at mismatched credentials rather than at connectivity.

For Docker Compose, verify connectivity from the client container rather than from the host. `localhost:8761` inside a client container refers to that client container, not the Discovery Service container.

### A service appears as `DOWN`

1. Confirm that the target process is still running.
2. Query the target service's own `/actuator/health` endpoint.
3. Inspect the status and URLs registered in `/eureka/apps/{app-name}`.
4. Check heartbeat and registration errors in the client logs.
5. Confirm that the registered host or IP is reachable from its consumers.

### The Gateway returns 503 for an `lb://...` route

Check whether the corresponding application has an `UP` instance:

```bash
curl -u eureka:eureka -H 'Accept: application/json' \
  http://localhost:8761/eureka/apps/AUTH-SERVICE
```

If the registry is empty, investigate the target service before changing the Gateway route.

Also confirm that the requested route targets the same application ID shown in Eureka. The Gateway currently expects `AUTH-SERVICE` and `LMS-CORE-SERVICE`.

### An instance is removed from the registry

Under the default profile, self-preservation is disabled and the eviction task runs frequently. Check client-to-Eureka connectivity and heartbeat/lease renewal first. Do not interpret `eviction-interval-timer-in-ms: 5000` as every instance expiring after five seconds.

If intermittent network conditions cause unwanted eviction, changing only the scan interval may hide the symptom without addressing the lease or connectivity problem. Review the client renewal and lease-duration settings together with the server policy, and use the `prod` profile, which enables self-preservation.

### The dashboard is unavailable

1. Check the process or container status.
2. Query `http://localhost:8761/actuator/health`.
3. Confirm the published port with `docker compose ps discovery-service` when using Compose. Under `docker-compose.prod.yml` no host port is published at all — that is intentional.
4. Inspect `logs/discovery-service.log` or `docker compose logs discovery-service`.
5. If `DISCOVERY_SERVER_PORT` was changed, use that port; the startup log reports the port the server actually bound to.

### Docker build cannot find POM files

Build from `backend/`, not `backend/discovery-service/`:

```bash
cd backend
docker build -f discovery-service/Dockerfile -t edumind/discovery-service:latest .
```

### Module tests

```bash
cd backend/discovery-service
./mvnw test
```

`SecurityConfigIntegrationTests` starts the server on a random port and asserts the access rules: health open and detail-free for anonymous callers, details for authenticated ones, `401` for the registry / dashboard / metrics / `DELETE` without credentials, `200` with them, wrong passwords rejected, and authenticated registration not blocked by CSRF. `DiscoveryServiceApplicationTests` remains a context smoke test.

The client-side counterpart lives in `backend/eureka-client-security`:

```bash
cd backend/eureka-client-security
../discovery-service/mvnw test
```

There are still no tests for heartbeat/lease behavior or eviction.

## Known limitations

The repository does **not** currently implement:

- Eureka clustering or peer-to-peer replication.
- High availability or failover between registry nodes.
- TLS/HTTPS or a keystore. Basic credentials therefore travel in cleartext and must stay on a trusted network.
- Per-client credentials or credential rotation: every service shares one username and password.
- An IP allowlist for the dashboard or registry API.
- Kubernetes manifests specifically for the Discovery Service.
- A Prometheus registry/exporter.
- Tests for heartbeat, lease renewal, or eviction behavior.

Do not run multiple replicas with the current configuration and treat them as a Eureka cluster: each replica would maintain an independent registry. Before exposing this service outside a trusted network, TLS and peer configuration must be designed and implemented.

## Related files

| File | Role |
|---|---|
| `pom.xml` | Eureka Server, Actuator, Security, and test dependencies |
| `src/main/java/com/edumind/discovery/DiscoveryServiceApplication.java` | Spring Boot entrypoint and `@EnableEurekaServer` |
| `src/main/java/com/edumind/discovery/config/SecurityConfig.java` | HTTP Basic filter chain for the registry, dashboard, and Actuator |
| `src/main/resources/application.yml` | Port, Eureka, security, logging levels, and Actuator exposure |
| `src/main/resources/application-prod.yml` | Production overrides: required credentials, self-preservation, eviction policy |
| `src/main/resources/logback-spring.xml` | Console/file appenders and log rotation |
| `src/test/java/com/edumind/discovery/DiscoveryServiceApplicationTests.java` | Context smoke test |
| `src/test/java/com/edumind/discovery/SecurityConfigIntegrationTests.java` | Access-rule tests for the registry, dashboard, and Actuator |
| `Dockerfile` | Multi-stage container build and health check |
| `../docker-compose.yml` | Local container wiring |
| `../docker-compose.prod.yml` | Deployment using prebuilt images |
| `../eureka-client-security/` | Client-side auto-configuration that sends the Basic credentials as a header |
| `../DOCKER.md` | Shared backend Docker guide |
