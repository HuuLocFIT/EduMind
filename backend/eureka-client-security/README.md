# Eureka Client Security

Auto-configuration that lets a Eureka client authenticate against the secured Discovery Service with an `Authorization` header instead of credentials embedded in `eureka.client.service-url.defaultZone`.

Used by `auth-service`, `lms-core-service`, and `api-gateway`. It lives in its own module rather than in `common-lib` because `common-lib` pulls in `spring-boot-starter-web`, which the reactive `api-gateway` cannot take.

## Why not credentials in the URL

`http://user:password@discovery-service:8761/eureka/` is the approach Spring Cloud documents, and it fails in two ways this platform cares about:

- **Special characters corrupt the URI.** A password containing `@`, `:`, `/`, `#`, `?`, or `%` breaks userinfo/host parsing, so the client authenticates with the wrong value or dials the wrong host. The symptom is a `401` or an unknown-host error that looks like a network problem.
- **The password leaks.** The full string shows up in `docker compose config`, `docker inspect`, the process environment, and any log line that prints the zone URL.

A header sidesteps both: the credentials never pass through a URI parser, and the zone URL stays printable.

## Configuration

```yaml
edumind:
  eureka:
    security:
      username: ${EUREKA_USERNAME:eureka}
      password: ${EUREKA_PASSWORD:eureka}
```

| Property | Effect |
|---|---|
| `edumind.eureka.security.username` | Enables the auto-configuration. Unset, or set to a blank value, backs off entirely: nothing is registered and Spring Cloud's defaults apply unchanged. |
| `edumind.eureka.security.password` | Required once a username is set; startup fails otherwise. |

The `eureka/eureka` fallback above is a development convenience. Each client's `application-prod.yml` re-declares both properties as `${EUREKA_USERNAME}` / `${EUREKA_PASSWORD}` with no default, so a production deployment that is not started through `docker-compose.prod.yml` — Kubernetes, systemd, a bare `java -jar` — fails at startup instead of quietly authenticating with the development credentials.

Encoding uses `HttpHeaders.encodeBasicAuth` with **UTF-8**, so any credential it accepts round-trips exactly. The charset is not incidental: Spring Security's `BasicAuthenticationConverter` on the Discovery Service decodes with UTF-8 by default, and RFC 7617 names UTF-8 the charset for Basic credentials. `encodeBasicAuth` itself defaults to ISO-8859-1 when handed a `null` charset, which agrees with the server only for ASCII credentials and otherwise either mis-decodes into a `401` or refuses to encode at all.

## How it hooks into Spring Cloud

`EurekaClientSecurityAutoConfiguration` runs `before = DiscoveryClientOptionalArgsConfiguration` and contributes an `AbstractDiscoveryClientOptionalArgs` bean. Spring Cloud's own bean is declared `@ConditionalOnMissingBean(AbstractDiscoveryClientOptionalArgs.class)`, so it backs off, and the transport factories built on top pick up this bean instead.

Two properties are deliberate:

- **TLS is preserved.** The `EurekaClientHttpRequestFactorySupplier` bean created by Spring Cloud is injected as-is, and `DiscoveryClientOptionalArgsConfiguration.setupTLS(...)` applies `eureka.client.tls.*` exactly as upstream does. Nothing here builds its own request factory.
- **The builder belongs to Eureka alone.** A fresh `RestTemplateBuilder` / `RestClient.Builder` is created per call rather than injecting the application's shared builder bean. That keeps application interceptors — notably `@LoadBalanced`, which would need the very registry still being fetched — out of registry traffic, and keeps the credentials out of every other HTTP client in the application.

| Transport | Condition | Bean |
|---|---|---|
| RestTemplate | default | `AuthenticatedRestTemplateDiscoveryClientOptionalArgs` |
| RestClient | `eureka.client.restclient.enabled=true` | `AuthenticatedRestClientDiscoveryClientOptionalArgs` |
| WebClient | `eureka.client.webclient.enabled=true` | none — startup fails on purpose |

The WebClient transport builds its client from a `WebClient.Builder` this module does not control, so registry calls would go out unauthenticated. Failing at startup beats discovering that in production.

A user-defined `AbstractDiscoveryClientOptionalArgs` bean also wins over this module — the bean here is `@ConditionalOnMissingBean`.

## Tests

```bash
cd backend/eureka-client-security
../discovery-service/mvnw test
```

`EurekaClientSecurityAutoConfigurationTests` covers: the header reaching an actual request (via `MockRestServiceServer`), a password full of URL-breaking characters, credentials outside Latin-1 surviving the UTF-8 round trip, back-off when no username is set, back-off when the username is present but blank, back-off behind a user-defined bean, failure when the password is missing, failure when the WebClient transport is enabled, and the builder being a fresh instance rather than a shared bean.
