# API Gateway Service

API Gateway service for EduMind Platform - A single entry point for all client requests with routing, rate limiting, and request filtering capabilities.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Routing](#routing)
- [Rate Limiting](#rate-limiting)
- [Filters](#filters)
- [Exception Handling](#exception-handling)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Deployment](#deployment)
- [Best Practices](#best-practices)

## Overview

The API Gateway is a Spring Cloud Gateway-based microservice that serves as the single entry point for all client requests to the EduMind Platform backend services. It provides:

- **Request Routing** - Routes requests to appropriate microservices via service discovery
- **Rate Limiting** - Redis-based rate limiting to prevent abuse
- **CORS Configuration** - Cross-origin resource sharing support
- **Request/Response Logging** - Comprehensive logging for debugging and monitoring
- **Load Balancing** - Automatic load balancing across service instances
- **Error Handling** - Centralized error handling and response formatting

**Technology Stack:**
- Spring Cloud Gateway 2025.0.0
- Spring Cloud Netflix Eureka Client (Service Discovery)
- Redis (Rate Limiting)
- Spring Boot Actuator (Health & Metrics)
- Reactive Programming (WebFlux)

**Port:** 8080 (default, configurable)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Applications                      │
│              (Web, Mobile, API Clients)                     │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ HTTP/HTTPS Requests
                        │
┌───────────────────────▼────────────────────────────────────┐
│                    API Gateway                             │
│              (Port: 8080)                                  │
│                                                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Request Filters                                   │    │
│  │  • LoggingFilter (Request/Response logging)        │    │
│  │  • Rate Limiting (Redis-based)                     │    │
│  │  • CORS Handling                                   │    │
│  └────────────────────────────────────────────────────┘    │
│                                                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Route Configuration                               │    │
│  │  • /api/auth/** → AUTH-SERVICE                     │    │
│  │  • /api/admin/** → AUTH-SERVICE                    │    │
│  │  • /api/users/** → AUTH-SERVICE                    │    │
│  │  • /api/upload/** → AUTH-SERVICE                   │    │
│  │  • /api/teacher-application/** → AUTH-SERVICE      │    │
│  └────────────────────────────────────────────────────┘    │
│                                                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Service Discovery (Eureka Client)                 │    │
│  └────────────────────────────────────────────────────┘    │
└───────┬───────────────────────────────────┬────────────────┘
        │                                   │
        │ Service Discovery                 │ Rate Limiting
        │                                   │
┌───────▼──────────┐              ┌─────────▼─────────────┐
│  Eureka Server   │              │      Redis            │
│  (Port: 8761)    │              │   (Port: 6379)        │
└──────────────────┘              └───────────────────────┘
        │
        │ Service Lookup
        │
┌───────▼──────────────────────────────────────────────────┐
│              Backend Microservices                       │
│  • AUTH-SERVICE (Port: 8081)                             │
│  • (Future services...)                                  │
└──────────────────────────────────────────────────────────┘
```

### Request Flow

1. **Client Request** → API Gateway (Port 8080)
2. **Logging Filter** → Logs incoming request
3. **Rate Limiter** → Checks Redis for rate limit (10 req/s per IP)
4. **CORS Filter** → Validates CORS headers
5. **Route Matching** → Matches request path to service route
6. **Service Discovery** → Queries Eureka for service instance
7. **Load Balancing** → Selects service instance (round-robin)
8. **Forward Request** → Proxies request to backend service
9. **Response Filter** → Logs response status
10. **Client Response** → Returns response to client

## Features

### ✅ Core Features

- **Service Discovery Integration**
  - Automatic service registration and discovery via Eureka
  - Dynamic routing to available service instances
  - Health-aware routing (only routes to healthy instances)

- **Request Routing**
  - Path-based routing with pattern matching
  - URL rewriting (e.g., `/api/auth/**` → `/auth/**`)
  - Load balancing across multiple service instances
  - Support for all HTTP methods (GET, POST, PUT, DELETE, PATCH)

- **Rate Limiting**
  - Redis-based distributed rate limiting
  - Configurable rate limits per route
  - IP-based rate limiting (10 requests/second, burst: 20)
  - Prevents API abuse and DDoS attacks

- **CORS Support**
  - Configurable allowed origins
  - Support for credentials
  - Preflight request handling
  - Configurable allowed methods and headers

- **Request/Response Logging**
  - Global logging filter for all requests
  - Logs request method, path, and response status
  - Structured logging with timestamps
  - Log rotation (10MB per file, 30 days retention)

- **Error Handling**
  - Global exception handler
  - Standardized error response format
  - Proper HTTP status codes
  - Error logging and monitoring

- **Health Monitoring**
  - Spring Boot Actuator endpoints
  - Health checks for dependencies (Redis, Eureka)
  - Metrics collection
  - Gateway route information

### 🔧 Technical Features

- **Reactive Programming**
  - Built on Spring WebFlux (non-blocking)
  - High throughput and low latency
  - Efficient resource utilization

- **Configuration Management**
  - YAML-based configuration
  - Environment variable support
  - Profile-based configuration (dev, staging, prod)

- **Security**
  - Rate limiting protection
  - CORS configuration
  - Request validation
  - Error message sanitization

## Prerequisites

Before setting up the API Gateway, ensure you have:

### Required Services

- **Eureka Discovery Service** - Must be running on port 8761
- **Redis** - Must be running on port 6379 (for rate limiting)
- **Backend Services** - At least one service (e.g., AUTH-SERVICE) registered with Eureka

### Required Software

- **Java 21** or higher
  ```bash
  java -version
  # Should show: openjdk version "21" or higher
  ```

- **Maven 3.6+**
  ```bash
  mvn -version
  # Should show: Apache Maven 3.6.x or higher
  ```

### Infrastructure Setup

**Option 1: Using Docker Compose (Recommended)**

From the `backend` directory:
```bash
# Start Redis
docker-compose up -d redis

# Start Eureka Discovery Service
cd discovery-service
mvn spring-boot:run
```

**Option 2: Manual Setup**

- Install and start Redis server
- Install and start Eureka Discovery Service

## Quick Start

### Step 1: Start Dependencies

```bash
# From backend directory
docker-compose up -d redis

# Start Eureka Discovery Service (in separate terminal)
cd backend/discovery-service
mvn spring-boot:run
```

Wait for Eureka to start (check http://localhost:8761)

### Step 2: Start Backend Service

```bash
# Start Auth Service (in separate terminal)
cd backend/auth-service
mvn spring-boot:run
```

Wait for service to register with Eureka

### Step 3: Start API Gateway

```bash
# From backend/api-gateway directory
mvn spring-boot:run
```

### Step 4: Verify

```bash
# Check API Gateway health
curl http://localhost:8080/actuator/health

# Test routing through gateway
curl http://localhost:8080/api/auth/health

# Check Eureka dashboard
# Open http://localhost:8761 in browser
# Should see API-GATEWAY registered
```

Expected output:
- API Gateway running on port 8080
- Service registered with Eureka
- Routes configured and accessible

## Configuration

### Environment Variables

The API Gateway can be configured using environment variables:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `API_GATEWAY_PORT` | Server port | `8080` | No |
| `EUREKA_DEFAULT_ZONE` | Eureka server URL | `http://localhost:8761/eureka/` | No |
| `REDIS_HOST` | Redis host | `localhost` | No |
| `REDIS_PORT` | Redis port | `6379` | No |
| `REDIS_PASSWORD` | Redis password | (empty) | No |
| `REDIS_TIMEOUT` | Redis connection timeout | `60000ms` | No |

### Application Configuration

The main configuration file is `src/main/resources/application.yml`:

#### Server Configuration

```yaml
server:
  port: ${API_GATEWAY_PORT:8080}
```

#### Service Discovery (Eureka)

```yaml
eureka:
  client:
    service-url:
      defaultZone: ${EUREKA_DEFAULT_ZONE:http://localhost:8761/eureka/}
    fetch-registry: true
    register-with-eureka: true
  instance:
    prefer-ip-address: true
    instance-id: ${spring.application.name}:${server.port}
```

#### Redis Configuration

```yaml
spring:
  data:
    redis:
      host: ${REDIS_HOST:localhost}
      port: ${REDIS_PORT:6379}
      password: ${REDIS_PASSWORD:}
      timeout: ${REDIS_TIMEOUT:60000ms}
```

#### Gateway Routes

Routes are configured in `application.yml` under `spring.cloud.gateway.routes`. Each route includes:
- **id**: Unique route identifier
- **uri**: Target service (using `lb://` for load balancing)
- **predicates**: Path matching conditions
- **filters**: Request/response filters (rate limiting, path rewriting)

#### CORS Configuration

```yaml
spring:
  cloud:
    gateway:
      globalcors:
        cors-configurations:
          '[/**]':
            allowedOrigins:
              - "http://localhost:3000"
              - "http://localhost:4200"
            allowedMethods:
              - GET
              - POST
              - PUT
              - DELETE
              - PATCH
              - OPTIONS
            allowedHeaders: "*"
            allowCredentials: true
            maxAge: 3600
```

#### Logging Configuration

Logging is configured in `logback-spring.xml`:
- Console logging with colored output
- File logging with rotation (10MB per file, 30 days retention)
- Log location: `logs/api-gateway.log`

#### Actuator Configuration

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,gateway
  endpoint:
    health:
      show-details: always
    gateway:
      access: read-only
```

### Configuration Profiles

You can use Spring profiles for environment-specific configuration:

**Development (`application-dev.yml`):**
```yaml
logging:
  level:
    com.edumind: DEBUG
    org.springframework.cloud.gateway: DEBUG
```

**Production (`application-prod.yml`):**
```yaml
logging:
  level:
    root: INFO
    com.edumind: INFO
```

Activate profile:
```bash
mvn spring-boot:run -Dspring-boot.run.profiles=prod
```

## Routing

### Route Configuration

All routes are configured in `application.yml`. The API Gateway uses path-based routing to forward requests to backend services.

### Current Routes

| Route Pattern | Target Service | Internal Path | Rate Limit | Description |
|---------------|----------------|---------------|------------|-------------|
| `/api/auth/**` | AUTH-SERVICE | `/auth/**` | 10 req/s | Authentication endpoints |
| `/api/admin/**` | AUTH-SERVICE | `/admin/**` | 10 req/s | Admin management endpoints |
| `/api/users/**` | AUTH-SERVICE | `/users/**` | 10 req/s | User management endpoints |
| `/api/upload/**` | AUTH-SERVICE | `/upload/**` | 10 req/s | File upload endpoints |
| `/api/teacher-application/**` | AUTH-SERVICE | `/teacher-application/**` | 10 req/s | Teacher application endpoints |

### Route Example

```yaml
- id: auth-service
  uri: lb://AUTH-SERVICE
  predicates:
    - Path=/api/auth/**
  filters:
    - name: RequestRateLimiter
      args:
        key-resolver: "#{@ipKeyResolver}"
        redis-rate-limiter:
          replenishRate: 10
          burstCapacity: 20
          requestedTokens: 1
    - RewritePath=/api/auth/(?<segment>.*), /auth/${segment}
```

**Explanation:**
- **id**: Unique identifier for the route
- **uri**: `lb://AUTH-SERVICE` uses load balancing via service discovery
- **predicates**: `Path=/api/auth/**` matches all paths starting with `/api/auth/`
- **filters**:
  - `RequestRateLimiter`: Applies rate limiting
  - `RewritePath`: Rewrites `/api/auth/login` → `/auth/login`

### Adding New Routes

To add a new route:

1. **Add route configuration** in `application.yml`:
```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: new-service
          uri: lb://NEW-SERVICE
          predicates:
            - Path=/api/new/**
          filters:
            - name: RequestRateLimiter
              args:
                key-resolver: "#{@ipKeyResolver}"
                redis-rate-limiter:
                  replenishRate: 10
                  burstCapacity: 20
                  requestedTokens: 1
            - RewritePath=/api/new/(?<segment>.*), /new/${segment}
```

2. **Ensure service is registered** with Eureka Discovery Service

3. **Restart API Gateway** to apply changes

### Path Rewriting

The `RewritePath` filter removes the `/api` prefix before forwarding to backend services:

- Client request: `GET /api/auth/login`
- Rewritten to: `GET /auth/login`
- Forwarded to: `AUTH-SERVICE/auth/login`

### Load Balancing

The API Gateway automatically load balances across multiple instances of the same service:

- Uses round-robin algorithm by default
- Only routes to healthy instances (health checks via Eureka)
- Automatically handles instance failures

## Rate Limiting

### Overview

Rate limiting prevents API abuse and protects backend services from being overwhelmed. The API Gateway uses Redis for distributed rate limiting.

### Configuration

**Rate Limit Settings:**
- **Replenish Rate**: 10 requests per second
- **Burst Capacity**: 20 requests
- **Requested Tokens**: 1 token per request

**Key Resolver:**
- Uses IP address as the rate limit key
- Each IP address has its own rate limit bucket
- Implemented in `RateLimiterConfig.java`

### How It Works

1. **Request arrives** at API Gateway
2. **IP address extracted** from request
3. **Redis checked** for current token count for that IP
4. **If tokens available**: Request forwarded, token consumed
5. **If no tokens**: Request rejected with `429 Too Many Requests`

### Rate Limit Response

When rate limit is exceeded:

```json
{
  "timestamp": "2025-01-20T10:30:00Z",
  "status": 429,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded",
  "path": "/api/auth/login"
}
```

**HTTP Status:** `429 Too Many Requests`

### Customizing Rate Limits

To change rate limits for a specific route:

```yaml
filters:
  - name: RequestRateLimiter
    args:
      key-resolver: "#{@ipKeyResolver}"
      redis-rate-limiter:
        replenishRate: 20    # 20 requests per second
        burstCapacity: 40     # Burst of 40 requests
        requestedTokens: 1   # 1 token per request
```

### Rate Limit Key Resolver

The default key resolver uses IP address. You can customize it in `RateLimiterConfig.java`:

```java
@Bean
public KeyResolver ipKeyResolver() {
    return exchange -> Mono.just(
        exchange.getRequest().getRemoteAddress() != null
            ? exchange.getRequest().getRemoteAddress().getAddress().getHostAddress()
            : "unknown"
    );
}
```

**Alternative Key Resolvers:**
- **User-based**: Extract user ID from JWT token
- **API Key-based**: Extract API key from header
- **Path-based**: Different limits for different endpoints

### Testing Rate Limits

```bash
# Test rate limiting (should fail after 20 requests)
for i in {1..25}; do
  curl -X GET http://localhost:8080/api/auth/health
  echo "Request $i"
done
```

After 20 requests, you should see `429 Too Many Requests` responses.

## Filters

### Overview

Filters in Spring Cloud Gateway allow you to modify requests and responses. The API Gateway includes both global and route-specific filters.

### Global Filters

#### LoggingFilter

**Purpose:** Logs all incoming requests and outgoing responses

**Implementation:** `com.edumind.gateway.filter.LoggingFilter`

**What it logs:**
- Request method (GET, POST, etc.)
- Request path
- Response status code

**Example log output:**
```
2025-01-20 10:30:00.123 INFO  [reactor-http-nio-2] LoggingFilter - 📥 Incoming Request: GET /api/auth/health
2025-01-20 10:30:00.456 INFO  [reactor-http-nio-2] LoggingFilter - 📤 Response Status: 200 for GET /api/auth/health
```

**Order:** -1 (highest priority, runs first)

**Configuration:**
The filter is automatically applied to all routes. No configuration needed.

### Route-Specific Filters

#### RequestRateLimiter Filter

Applied to each route for rate limiting (see [Rate Limiting](#rate-limiting) section).

#### RewritePath Filter

Rewrites request paths before forwarding to backend services:

```yaml
- RewritePath=/api/auth/(?<segment>.*), /auth/${segment}
```

**Example:**
- Input: `/api/auth/login`
- Output: `/auth/login`

### Custom Filter Example

To create a custom filter:

```java
@Component
public class CustomFilter implements GlobalFilter, Ordered {
    
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        // Add custom header
        exchange.getRequest().mutate()
            .header("X-Custom-Header", "value")
            .build();
        
        return chain.filter(exchange);
    }
    
    @Override
    public int getOrder() {
        return 0; // Filter order
    }
}
```

### Filter Order

Filters are executed in order based on their `getOrder()` return value:
- Lower values execute first
- `LoggingFilter` has order -1 (runs first)
- Default order is 0

## Exception Handling

### Global Exception Handler

The API Gateway includes a global exception handler that catches and formats all exceptions.

**Implementation:** `com.edumind.gateway.exception.GlobalExceptionHandler`

### Error Response Format

All errors are returned in a standardized format:

```json
{
  "timestamp": "2025-01-20T10:30:00",
  "status": 500,
  "error": "Internal Server Error",
  "message": "An unexpected error occurred",
  "path": "/api/auth/login"
}
```

### Error Types Handled

#### 1. ResponseStatusException

Handles Spring's `ResponseStatusException`:

```json
{
  "timestamp": "2025-01-20T10:30:00",
  "status": 404,
  "error": "Not Found",
  "message": "Route not found",
  "path": "/api/unknown"
}
```

#### 2. Rate Limit Exceeded

When rate limit is exceeded:

```json
{
  "timestamp": "2025-01-20T10:30:00",
  "status": 429,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded",
  "path": "/api/auth/login"
}
```

#### 3. Service Unavailable

When backend service is not available:

```json
{
  "timestamp": "2025-01-20T10:30:00",
  "status": 503,
  "error": "Service Unavailable",
  "message": "Service temporarily unavailable",
  "path": "/api/auth/login"
}
```

#### 4. Internal Server Error

For unexpected errors:

```json
{
  "timestamp": "2025-01-20T10:30:00",
  "status": 500,
  "error": "Internal Server Error",
  "message": "An unexpected error occurred",
  "path": "/api/auth/login"
}
```

### Error Logging

All errors are logged with full stack traces:

```
2025-01-20 10:30:00.123 ERROR [reactor-http-nio-2] GlobalExceptionHandler - ❌ Gateway Error: Connection refused
java.net.ConnectException: Connection refused
    at ...
```

### Customizing Error Handling

To customize error handling, modify `GlobalExceptionHandler.java`:

```java
@Override
public Mono<Void> handle(ServerWebExchange exchange, Throwable ex) {
    // Custom error handling logic
    if (ex instanceof CustomException) {
        // Handle custom exception
    }
    // ... rest of implementation
}
```

## Monitoring

### Health Checks

The API Gateway exposes health endpoints via Spring Boot Actuator:

```bash
# Basic health check
curl http://localhost:8080/actuator/health

# Response
{
  "status": "UP"
}
```

**Health Endpoints:**
- `/actuator/health` - Overall health status
- `/actuator/health/liveness` - Kubernetes liveness probe
- `/actuator/health/readiness` - Kubernetes readiness probe

### Metrics

View available metrics:

```bash
# List all metrics
curl http://localhost:8080/actuator/metrics

# Specific metric
curl http://localhost:8080/actuator/metrics/jvm.memory.used
```

**Key Metrics:**
- `http.server.requests` - HTTP request metrics (count, duration)
- `jvm.memory.used` - JVM memory usage
- `jvm.gc.pause` - Garbage collection pauses
- `process.cpu.usage` - CPU usage
- `reactor.netty.connections.active` - Active connections

### Gateway Routes Information

View configured routes:

```bash
curl http://localhost:8080/actuator/gateway/routes
```

**Response:**
```json
[
  {
    "route_id": "auth-service",
    "uri": "lb://AUTH-SERVICE",
    "predicates": ["Path=/api/auth/**"],
    "filters": ["RewritePath", "RequestRateLimiter"]
  }
]
```

### Logging

**Log Location:** `logs/api-gateway.log`

**View Logs:**
```bash
# Real-time logs
tail -f logs/api-gateway.log

# Search for errors
grep -i error logs/api-gateway.log

# Last 100 lines
tail -n 100 logs/api-gateway.log
```

**Log Format:**
```
2025-01-20 10:30:00.123 INFO  [reactor-http-nio-2] LoggingFilter - 📥 Incoming Request: GET /api/auth/health
2025-01-20 10:30:00.456 INFO  [reactor-http-nio-2] LoggingFilter - 📤 Response Status: 200 for GET /api/auth/health
```

### Service Discovery Status

Check if API Gateway is registered with Eureka:

1. Open Eureka Dashboard: http://localhost:8761
2. Look for `API-GATEWAY` in the registered services list
3. Verify status is `UP`

## Troubleshooting

### Common Issues

#### 1. API Gateway fails to start - Port already in use

**Error:**
```
Port 8080 is already in use
```

**Solution:**
```bash
# Find process using port
lsof -i :8080  # macOS/Linux
netstat -ano | findstr :8080  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# Or change port
export API_GATEWAY_PORT=8081
```

#### 2. Cannot connect to Eureka

**Error:**
```
com.netflix.discovery.shared.transport.TransportException: Cannot execute request
```

**Solution:**
1. Verify Eureka is running: `curl http://localhost:8761/eureka/`
2. Check `EUREKA_DEFAULT_ZONE` environment variable
3. Verify network connectivity
4. Check firewall rules

#### 3. Cannot connect to Redis

**Error:**
```
io.lettuce.core.RedisConnectionException: Unable to connect to localhost:6379
```

**Solution:**
```bash
# Check Redis is running
docker-compose ps redis

# Start Redis if not running
docker-compose up -d redis

# Test Redis connection
redis-cli ping  # Should return PONG

# Verify Redis configuration
echo $REDIS_HOST
echo $REDIS_PORT
```

#### 4. Routes return 503 Service Unavailable

**Error:**
```
503 Service Unavailable
```

**Solution:**
1. Check Eureka dashboard: http://localhost:8761
2. Verify target service is registered (e.g., AUTH-SERVICE)
3. Check service health: `curl http://localhost:8081/actuator/health`
4. Verify service is running and healthy
5. Check route configuration in `application.yml`

#### 5. Rate limiting not working

**Error:**
```
Rate limiting not applied
```

**Solution:**
1. Verify Redis is running: `docker-compose ps redis`
2. Check Redis connection in logs
3. Verify `REDIS_HOST` and `REDIS_PORT` environment variables
4. Check `RateLimiterConfig` bean is created
5. Verify route has `RequestRateLimiter` filter configured

#### 6. CORS errors from frontend

**Error:**
```
Access to XMLHttpRequest has been blocked by CORS policy
```

**Solution:**
1. Check CORS configuration in `application.yml`
2. Verify frontend origin is in `allowedOrigins` list
3. Ensure `allowCredentials: true` if using cookies
4. Check preflight requests (OPTIONS) are allowed

### Debugging Tips

#### Enable Debug Logging

Add to `application.yml`:
```yaml
logging:
  level:
    com.edumind: DEBUG
    org.springframework.cloud.gateway: DEBUG
    org.springframework.web: DEBUG
```

#### Check Gateway Routes

```bash
# View all routes
curl http://localhost:8080/actuator/gateway/routes

# View route filters
curl http://localhost:8080/actuator/gateway/routefilters
```

#### Test Route Directly

```bash
# Test route without going through gateway
curl http://localhost:8081/auth/health  # Direct to service

# Test route through gateway
curl http://localhost:8080/api/auth/health  # Through gateway
```

#### Monitor Request Flow

1. Enable debug logging (see above)
2. Watch logs in real-time: `tail -f logs/api-gateway.log`
3. Make test request
4. Trace request through filters and routes

#### Check Service Discovery

```bash
# Check Eureka registry
curl http://localhost:8761/eureka/apps

# Check specific service
curl http://localhost:8761/eureka/apps/AUTH-SERVICE
```

## Deployment

### Building the Service

```bash
# Build JAR file
cd backend/api-gateway
mvn clean package

# JAR location
# target/api-gateway-1.0.0-SNAPSHOT.jar
```

### Running as JAR

```bash
# Set environment variables
export API_GATEWAY_PORT=8080
export EUREKA_DEFAULT_ZONE=http://localhost:8761/eureka/
export REDIS_HOST=localhost
export REDIS_PORT=6379

# Run JAR
java -jar target/api-gateway-1.0.0-SNAPSHOT.jar
```

### Docker Deployment

**Dockerfile Example:**
```dockerfile
FROM openjdk:21-jdk-slim

WORKDIR /app

COPY target/api-gateway-1.0.0-SNAPSHOT.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
```

**Build and Run:**
```bash
# Build image
docker build -t api-gateway:1.0.0 .

# Run container
docker run -d \
  -p 8080:8080 \
  -e API_GATEWAY_PORT=8080 \
  -e EUREKA_DEFAULT_ZONE=http://eureka:8761/eureka/ \
  -e REDIS_HOST=redis \
  -e REDIS_PORT=6379 \
  --name api-gateway \
  api-gateway:1.0.0
```

### Kubernetes Deployment

**Deployment YAML:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api-gateway
        image: api-gateway:1.0.0
        ports:
        - containerPort: 8080
        env:
        - name: API_GATEWAY_PORT
          value: "8080"
        - name: EUREKA_DEFAULT_ZONE
          value: "http://eureka:8761/eureka/"
        - name: REDIS_HOST
          value: "redis"
        - name: REDIS_PORT
          value: "6379"
        livenessProbe:
          httpGet:
            path: /actuator/health/liveness
            port: 8080
          initialDelaySeconds: 60
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /actuator/health/readiness
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 5
```

**Service YAML:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
spec:
  selector:
    app: api-gateway
  ports:
  - port: 80
    targetPort: 8080
  type: LoadBalancer
```

**Ingress YAML:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-gateway-ingress
spec:
  rules:
  - host: api.edumind.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 80
```

### Production Considerations

#### High Availability

- **Multiple Instances**: Run at least 2 instances of API Gateway
- **Load Balancer**: Use external load balancer (AWS ALB, Azure LB, etc.)
- **Health Checks**: Configure health checks for automatic failover
- **Graceful Shutdown**: Allow time for in-flight requests to complete

#### Performance

- **JVM Tuning**: Configure appropriate heap size
  ```bash
  java -Xms512m -Xmx1024m -jar api-gateway.jar
  ```
- **Connection Pooling**: Tune Redis connection pool
- **Thread Pool**: Configure WebFlux thread pool size
- **Caching**: Consider caching route configurations

#### Security

- **HTTPS/TLS**: Enable SSL/TLS in production
- **CORS**: Restrict allowed origins to production domains only
- **Rate Limiting**: Adjust rate limits based on expected load
- **Authentication**: Consider adding API key or OAuth2 validation
- **Request Validation**: Validate and sanitize all incoming requests

#### Monitoring

- **Metrics**: Export metrics to Prometheus/Grafana
- **Logging**: Centralized logging (ELK Stack, CloudWatch)
- **Tracing**: Distributed tracing (Jaeger, Zipkin)
- **Alerts**: Set up alerts for errors, high latency, rate limit violations

## Best Practices

### Configuration

1. **Use Environment Variables**
   - Never hardcode sensitive values
   - Use environment variables for all configuration
   - Use secrets management in production (AWS Secrets Manager, Vault)

2. **Profile-Based Configuration**
   - Separate configs for dev, staging, prod
   - Use Spring profiles: `application-dev.yml`, `application-prod.yml`

3. **Externalize Configuration**
   - Consider Spring Cloud Config Server for centralized configuration
   - Use configuration refresh without restart

### Routing

1. **Route Naming**
   - Use descriptive route IDs
   - Follow naming convention: `{service-name}-route`

2. **Path Patterns**
   - Use consistent path patterns (`/api/{service}/**`)
   - Document all routes in README

3. **Route Organization**
   - Group related routes together
   - Use comments in YAML for clarity

### Rate Limiting

1. **Tune Rate Limits**
   - Adjust based on service capacity
   - Different limits for different endpoints
   - Consider user-based limits for authenticated requests

2. **Monitor Rate Limits**
   - Track rate limit violations
   - Alert on excessive violations
   - Adjust limits based on metrics

### Error Handling

1. **Consistent Error Format**
   - Use standardized error response format
   - Include helpful error messages
   - Don't expose internal details in production

2. **Error Logging**
   - Log all errors with context
   - Include request details in error logs
   - Use structured logging

### Monitoring

1. **Health Checks**
   - Implement comprehensive health checks
   - Check dependencies (Redis, Eureka)
   - Use separate liveness and readiness probes

2. **Metrics**
   - Track request rates, latencies, errors
   - Monitor rate limit usage
   - Track service discovery status

3. **Logging**
   - Use structured logging (JSON format)
   - Include correlation IDs
   - Log at appropriate levels (INFO, WARN, ERROR)

### Security

1. **CORS Configuration**
   - Whitelist only necessary origins
   - Don't use wildcard (`*`) in production
   - Validate credentials properly

2. **Rate Limiting**
   - Implement per-IP rate limiting
   - Consider per-user rate limiting for authenticated requests
   - Monitor and alert on abuse patterns

3. **Request Validation**
   - Validate all incoming requests
   - Sanitize user input
   - Reject malformed requests early

### Performance

1. **Connection Pooling**
   - Tune Redis connection pool
   - Configure appropriate timeouts
   - Monitor connection pool usage

2. **Caching**
   - Cache route configurations
   - Cache service discovery results (with TTL)
   - Consider response caching for static content

3. **Resource Limits**
   - Set appropriate JVM heap size
   - Configure thread pool sizes
   - Monitor resource usage

---

**Last Updated:** 2025-01-20  
**Version:** 1.0.0-SNAPSHOT  
**Maintainers:** EduMind Development Team
```

