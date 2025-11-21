# Discovery Service (Eureka Server)

Service Discovery server for EduMind Platform - A Eureka-based service registry that enables automatic service registration and discovery in a microservices architecture.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Eureka Dashboard](#eureka-dashboard)
- [Service Registry](#service-registry)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Deployment](#deployment)
- [Best Practices](#best-practices)

## Overview

The Discovery Service is a Spring Cloud Netflix Eureka Server that acts as a service registry for all microservices in the EduMind Platform. It provides:

- **Service Registration** - Microservices register themselves with Eureka
- **Service Discovery** - Services can discover and communicate with each other
- **Health Monitoring** - Tracks health status of registered services
- **Load Balancing** - Enables client-side load balancing across service instances
- **Web Dashboard** - User-friendly web interface for monitoring services

**Technology Stack:**
- Spring Cloud Netflix Eureka Server 2025.0.0
- Spring Boot 3.5.6
- Spring Boot Actuator (Health & Metrics)
- Java 21

**Port:** 8761 (default, configurable)

**Dashboard URL:** http://localhost:8761

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│              Eureka Discovery Service                      │
│                   (Port: 8761)                             │
│                                                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Service Registry                                  │    │
│  │  • Maintains list of registered services           │    │
│  │  • Tracks service health status                    │    │
│  │  • Stores service metadata                         │    │
│  └────────────────────────────────────────────────────┘    │
│                                                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │  REST API                                          │    │
│  │  • /eureka/apps - Service registry                 │    │
│  │  • /eureka/apps/{service-name} - Service details   │    │
│  └────────────────────────────────────────────────────┘    │
│                                                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Web Dashboard                                     │    │
│  │  • Service list and status                         │    │
│  │  • Health monitoring                               │    │
│  │  • Instance details                                │    │
│  └────────────────────────────────────────────────────┘    │
└───────────────────────┬────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        │ Register      │ Query         │ Heartbeat
        │               │               │
┌───────▼──────┐  ┌─────▼───────┐  ┌────▼───────┐
│ Auth Service │  │ API Gateway │  │ Other      │
│ (Port: 8081) │  │ (Port: 8080)│  │ Services   │
│              │  │             │  │            │
│ • Registers  │  │ • Discovers │  │ • Register │
│ • Sends      │  │ • Routes    │  │ • Discover │
│   heartbeat  │  │   requests  │  │            │
└──────────────┘  └─────────────┘  └────────────┘
```

### Service Registration Flow

1. **Service Starts** → Connects to Eureka Server
2. **Registration** → Service sends registration request to Eureka
3. **Registry Update** → Eureka adds service to registry
4. **Heartbeat** → Service sends periodic heartbeat (every 30s)
5. **Health Check** → Eureka monitors service health
6. **Discovery** → Other services query Eureka for service instances

### Service Discovery Flow

1. **Client Request** → API Gateway needs to route to Auth Service
2. **Query Eureka** → API Gateway queries Eureka for AUTH-SERVICE instances
3. **Get Instances** → Eureka returns list of available instances
4. **Load Balance** → API Gateway selects instance (round-robin)
5. **Route Request** → API Gateway routes request to selected instance

## Features

### ✅ Core Features

- **Service Registration**
  - Automatic service registration on startup
  - Service metadata storage (host, port, health status)
  - Multiple instance support for same service

- **Service Discovery**
  - RESTful API for service lookup
  - Real-time service availability
  - Health-aware service discovery

- **Health Monitoring**
  - Automatic health check tracking
  - Service instance status (UP, DOWN, OUT_OF_SERVICE)
  - Automatic eviction of unhealthy instances

- **Web Dashboard**
  - User-friendly web interface
  - Real-time service status
  - Service instance details
  - System status overview

- **High Availability**
  - Support for Eureka cluster (peer-to-peer replication)
  - Self-preservation mode (protects against network partitions)
  - Automatic failover

### 🔧 Technical Features

- **RESTful API**
  - Standard Eureka REST API
  - Service registration endpoints
  - Service discovery endpoints
  - Health check endpoints

- **Heartbeat Mechanism**
  - Services send heartbeat every 30 seconds
  - Automatic eviction if heartbeat missed (90 seconds)
  - Configurable heartbeat interval

- **Self-Preservation**
  - Protects registry during network partitions
  - Prevents accidental service eviction
  - Configurable threshold (default: 85%)

- **Eviction**
  - Automatic removal of unhealthy services
  - Configurable eviction interval (default: 60 seconds)
  - Manual eviction via dashboard

- **Security** (Production)
  - HTTP Basic Authentication support
  - HTTPS/TLS support
  - IP whitelisting

### 📊 Monitoring Features

- **Actuator Endpoints**
  - Health checks
  - Metrics collection
  - Service information

- **Logging**
  - Structured logging
  - Service registration events
  - Health check events
  - Log rotation (10MB per file, 30 days retention)

## Prerequisites

Before setting up the Discovery Service, ensure you have:

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

### Network Requirements

- **Port 8761** must be available (or configure custom port)
- **Firewall** should allow incoming connections on port 8761
- **Network connectivity** between Eureka and all microservices

### Optional

- **Reverse Proxy** (Nginx, Apache) for production
- **Load Balancer** for high availability setup
- **SSL Certificate** for HTTPS in production

## Quick Start

### Step 1: Build the Service

```bash
# From backend/discovery-service directory
mvn clean package
```

### Step 2: Start the Service

```bash
# Run with Maven
mvn spring-boot:run

# Or run JAR file
java -jar target/service-discovery-1.0.0-SNAPSHOT.jar
```

### Step 3: Verify

```bash
# Check health endpoint
curl http://localhost:8761/actuator/health

# Check Eureka dashboard
# Open http://localhost:8761 in browser
```

**Expected Output:**
- Service running on port 8761
- Eureka dashboard accessible
- No services registered yet (will appear when other services start)

### Step 4: Start Other Services

After Discovery Service is running, start other services:

```bash
# Terminal 2: Start Auth Service
cd backend/auth-service
mvn spring-boot:run

# Terminal 3: Start API Gateway
cd backend/api-gateway
mvn spring-boot:run
```

**Check Dashboard:**
- Open http://localhost:8761
- You should see:
  - **AUTH-SERVICE** registered
  - **API-GATEWAY** registered

## Configuration

### Environment Variables

The Discovery Service can be configured using environment variables:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DISCOVERY_SERVER_PORT` | Server port | `8761` | No |
| `EUREKA_HOSTNAME` | Eureka server hostname | `localhost` | No |

### Application Configuration

The main configuration file is `src/main/resources/application.yml`:

#### Server Configuration

```yaml
server:
  port: ${DISCOVERY_SERVER_PORT:8761}
```

#### Eureka Server Configuration

```yaml
eureka:
  instance:
    hostname: ${EUREKA_HOSTNAME:localhost}
  client:
    register-with-eureka: false  # Eureka server doesn't register itself
    fetch-registry: false        # Eureka server doesn't fetch registry
    service-url:
      defaultZone: http://${eureka.instance.hostname}:${server.port}/eureka/
  server:
    enable-self-preservation: false  # Disable in development
    eviction-interval-timer-in-ms: 5000  # Evict unhealthy instances every 5 seconds
```

**Configuration Options:**

- **`register-with-eureka: false`**
  - Eureka server doesn't need to register itself
  - Set to `true` only in Eureka cluster setup

- **`fetch-registry: false`**
  - Eureka server doesn't need to fetch registry from peers
  - Set to `true` only in Eureka cluster setup

- **`enable-self-preservation: false`**
  - Disables self-preservation mode
  - Recommended for development
  - Set to `true` in production for high availability

- **`eviction-interval-timer-in-ms: 5000`**
  - How often to evict unhealthy instances (in milliseconds)
  - Default: 60000 (60 seconds)
  - Lower value = faster eviction, higher load

#### Self-Preservation Mode

Self-preservation protects the registry during network partitions:

```yaml
eureka:
  server:
    enable-self-preservation: true
    renewal-percent-threshold: 0.85  # 85% threshold
```

**How it works:**
- If less than 85% of services send heartbeats, Eureka enters self-preservation mode
- Services are NOT evicted even if heartbeats are missed
- Prevents accidental service removal during network issues

#### Logging Configuration

```yaml
logging:
  level:
    root: INFO
    com.edumind: DEBUG
    com.netflix.eureka: INFO
    com.netflix.discovery: INFO
  file:
    name: logs/service-discovery.log
    max-size: 10MB
    max-history: 30
```

#### Actuator Configuration

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
  endpoint:
    health:
      show-details: always
```

### Eureka Cluster Configuration (High Availability)

For production, configure Eureka cluster with peer-to-peer replication:

**Node 1 (`application-peer1.yml`):**
```yaml
eureka:
  instance:
    hostname: eureka1.example.com
  client:
    register-with-eureka: true
    fetch-registry: true
    service-url:
      defaultZone: http://eureka2.example.com:8761/eureka/
```

**Node 2 (`application-peer2.yml`):**
```yaml
eureka:
  instance:
    hostname: eureka2.example.com
  client:
    register-with-eureka: true
    fetch-registry: true
    service-url:
      defaultZone: http://eureka1.example.com:8761/eureka/
```

**Benefits:**
- High availability (if one node fails, other continues)
- Automatic replication between nodes
- No single point of failure

### Security Configuration (Production)

**HTTP Basic Authentication:**
```yaml
spring:
  security:
    user:
      name: admin
      password: ${EUREKA_PASSWORD:changeme}
```

**HTTPS Configuration:**
```yaml
server:
  ssl:
    enabled: true
    key-store: classpath:keystore.p12
    key-store-password: ${SSL_KEYSTORE_PASSWORD}
    key-store-type: PKCS12
    key-alias: eureka
```

## Eureka Dashboard

### Accessing the Dashboard

Open your browser and navigate to:
```
http://localhost:8761
```

### Dashboard Overview

The Eureka dashboard provides a web interface to monitor registered services:

**Main Page Shows:**
- **System Status** - Current status of Eureka server
- **DS Replicas** - List of Eureka server replicas (for cluster)
- **Instances currently registered with Eureka** - List of all registered services

### Service Information

For each registered service, the dashboard displays:

- **Application Name** - Service name (e.g., AUTH-SERVICE)
- **Status** - Service status (UP, DOWN, OUT_OF_SERVICE)
- **Availability Zones** - Zone information (for multi-zone deployments)
- **Instance Count** - Number of instances for this service

### Service Instance Details

Click on a service name to view instance details:

- **Instance ID** - Unique identifier for the instance
- **Status** - Current health status
- **Host Name** - Server hostname
- **IP Address** - Instance IP address
- **Port** - Service port number
- **Secure Port** - HTTPS port (if configured)
- **Home Page URL** - Service home page
- **Status Page URL** - Health check endpoint
- **Health Check URL** - Health check endpoint
- **Metadata** - Custom metadata

### Dashboard Features

1. **Refresh** - Manually refresh the service list
2. **Filter** - Filter services by name
3. **Last N minutes** - View services updated in last N minutes
4. **Status** - View services by status (UP, DOWN, etc.)

## Service Registry

### REST API Endpoints

Eureka provides a RESTful API for service registration and discovery:

#### Get All Applications

```bash
GET /eureka/apps
```

**Response:**
```xml
<applications>
  <versions__delta>1</versions__delta>
  <apps__hashcode>UP_1_</apps__hashcode>
  <application>
    <name>AUTH-SERVICE</name>
    <instance>
      <instanceId>auth-service:8081</instanceId>
      <hostName>localhost</hostName>
      <app>AUTH-SERVICE</app>
      <ipAddr>127.0.0.1</ipAddr>
      <status>UP</status>
      <port enabled="true">8081</port>
      <securePort enabled="false">8443</securePort>
    </instance>
  </application>
</applications>
```

#### Get Specific Application

```bash
GET /eureka/apps/{app-name}
```

**Example:**
```bash
curl http://localhost:8761/eureka/apps/AUTH-SERVICE
```

#### Get Application Instance

```bash
GET /eureka/apps/{app-name}/{instance-id}
```

**Example:**
```bash
curl http://localhost:8761/eureka/apps/AUTH-SERVICE/auth-service:8081
```

#### Register Service Instance

```bash
POST /eureka/apps/{app-name}
Content-Type: application/json

{
  "instance": {
    "instanceId": "auth-service:8081",
    "hostName": "localhost",
    "app": "AUTH-SERVICE",
    "ipAddr": "127.0.0.1",
    "status": "UP",
    "port": {
      "$": 8081,
      "@enabled": "true"
    },
    "securePort": {
      "$": 8443,
      "@enabled": "false"
    },
    "healthCheckUrl": "http://localhost:8081/actuator/health",
    "statusPageUrl": "http://localhost:8081/actuator/info",
    "homePageUrl": "http://localhost:8081/"
  }
}
```

#### Send Heartbeat

```bash
PUT /eureka/apps/{app-name}/{instance-id}
```

**Example:**
```bash
curl -X PUT http://localhost:8761/eureka/apps/AUTH-SERVICE/auth-service:8081
```

#### Cancel Registration

```bash
DELETE /eureka/apps/{app-name}/{instance-id}
```

**Example:**
```bash
curl -X DELETE http://localhost:8761/eureka/apps/AUTH-SERVICE/auth-service:8081
```

### Service Registration Process

1. **Service Startup** → Service connects to Eureka
2. **Registration Request** → Service sends POST to `/eureka/apps/{app-name}`
3. **Registry Update** → Eureka adds service to registry
4. **Heartbeat** → Service sends PUT every 30 seconds
5. **Health Monitoring** → Eureka tracks service health
6. **Eviction** → If heartbeat missed for 90 seconds, service is evicted

### Service Discovery Process

1. **Client Query** → Client queries `/eureka/apps/{app-name}`
2. **Get Instances** → Eureka returns list of available instances
3. **Filter Healthy** → Client filters to only UP instances
4. **Load Balance** → Client selects instance (round-robin, random, etc.)
5. **Make Request** → Client makes request to selected instance

### Heartbeat Mechanism

- **Interval**: Services send heartbeat every 30 seconds
- **Timeout**: If heartbeat not received for 90 seconds, service is marked DOWN
- **Eviction**: Unhealthy services are evicted after timeout period
- **Renewal**: Each heartbeat renews the service lease

### Service Status

Services can have the following statuses:

- **UP** - Service is healthy and available
- **DOWN** - Service is not responding
- **STARTING** - Service is starting up
- **OUT_OF_SERVICE** - Service is manually taken out of service
- **UNKNOWN** - Status is unknown

## Monitoring

### Health Checks

The Discovery Service exposes health endpoints via Spring Boot Actuator:

```bash
# Basic health check
curl http://localhost:8761/actuator/health

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
curl http://localhost:8761/actuator/metrics

# Specific metric
curl http://localhost:8761/actuator/metrics/jvm.memory.used
```

**Key Metrics:**
- `jvm.memory.used` - JVM memory usage
- `jvm.gc.pause` - Garbage collection pauses
- `process.cpu.usage` - CPU usage
- `http.server.requests` - HTTP request metrics

### Logging

**Log Location:** `logs/discovery-service.log`

**View Logs:**
```bash
# Real-time logs
tail -f logs/discovery-service.log

# Search for errors
grep -i error logs/discovery-service.log

# Last 100 lines
tail -n 100 logs/discovery-service.log
```

**Log Format:**
```
2025-01-20 10:30:00.123 INFO  [main] DiscoveryServiceApplication - 🚀 Starting Discovery Service (Eureka Server)...
2025-01-20 10:30:05.456 INFO  [main] DiscoveryServiceApplication - ✅ Service Discovery started successfully on port 8761
```

### Service Registration Events

Monitor service registration in logs:

```
INFO  c.n.e.registry.AbstractInstanceRegistry - Registered instance AUTH-SERVICE/auth-service:8081 with status UP
INFO  c.n.e.registry.AbstractInstanceRegistry - Renewed instance AUTH-SERVICE/auth-service:8081
INFO  c.n.e.registry.AbstractInstanceRegistry - Cancelled instance AUTH-SERVICE/auth-service:8081
```

## Troubleshooting

### Common Issues

#### 1. Discovery Service fails to start - Port already in use

**Error:**
```
Port 8761 is already in use
```

**Solution:**
```bash
# Find process using port
lsof -i :8761  # macOS/Linux
netstat -ano | findstr :8761  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# Or change port
export DISCOVERY_SERVER_PORT=8762
```

#### 2. Services not registering with Eureka

**Error:**
```
Services don't appear in Eureka dashboard
```

**Solution:**
1. Verify Eureka is running: `curl http://localhost:8761/actuator/health`
2. Check service configuration:
   - `eureka.client.service-url.defaultZone` should point to Eureka
   - `eureka.client.register-with-eureka` should be `true`
3. Check service logs for registration errors
4. Verify network connectivity between service and Eureka
5. Check firewall rules

#### 3. Services appear as DOWN in dashboard

**Error:**
```
Service status shows DOWN in Eureka dashboard
```

**Solution:**
1. Check if service is actually running
2. Verify service health endpoint: `curl http://localhost:8081/actuator/health`
3. Check service logs for errors
4. Verify heartbeat is being sent (check logs)
5. Check network connectivity
6. Verify service configuration matches Eureka expectations

#### 4. Services being evicted too quickly

**Error:**
```
Services are removed from registry even though they're running
```

**Solution:**
1. Increase eviction interval:
   ```yaml
   eureka:
     server:
       eviction-interval-timer-in-ms: 60000  # 60 seconds
   ```
2. Enable self-preservation mode:
   ```yaml
   eureka:
     server:
       enable-self-preservation: true
   ```
3. Check network latency between service and Eureka
4. Verify heartbeat interval in service configuration

#### 5. Cannot access Eureka dashboard

**Error:**
```
Cannot connect to http://localhost:8761
```

**Solution:**
1. Verify service is running: `ps aux | grep discovery`
2. Check service logs for errors
3. Verify port is correct: `netstat -an | grep 8761`
4. Check firewall rules
5. Try accessing via IP instead of localhost

#### 6. Eureka cluster not replicating

**Error:**
```
Eureka nodes in cluster not syncing
```

**Solution:**
1. Verify `register-with-eureka: true` on all nodes
2. Verify `fetch-registry: true` on all nodes
3. Check `service-url.defaultZone` points to peer nodes
4. Verify network connectivity between nodes
5. Check logs for replication errors

### Debugging Tips

#### Enable Debug Logging

Add to `application.yml`:
```yaml
logging:
  level:
    com.netflix.eureka: DEBUG
    com.netflix.discovery: DEBUG
    com.edumind: DEBUG
```

#### Check Service Registry

```bash
# View all registered services
curl http://localhost:8761/eureka/apps

# View specific service
curl http://localhost:8761/eureka/apps/AUTH-SERVICE

# View service instance
curl http://localhost:8761/eureka/apps/AUTH-SERVICE/auth-service:8081
```

#### Monitor Service Heartbeats

Watch logs for heartbeat renewals:
```bash
tail -f logs/discovery-service.log | grep "Renewed"
```

#### Test Service Registration

Manually register a service:
```bash
curl -X POST http://localhost:8761/eureka/apps/AUTH-SERVICE \
  -H "Content-Type: application/json" \
  -d '{
    "instance": {
      "instanceId": "test-instance",
      "hostName": "localhost",
      "app": "AUTH-SERVICE",
      "ipAddr": "127.0.0.1",
      "status": "UP",
      "port": {"$": 8081, "@enabled": "true"}
    }
  }'
```

#### Check Network Connectivity

```bash
# Test connectivity from service to Eureka
curl http://localhost:8761/eureka/

# Test from service machine
telnet eureka-host 8761

# Check DNS resolution
nslookup eureka-host
```

#### View Eureka Server Status

```bash
# Check server status
curl http://localhost:8761/actuator/health

# View server info
curl http://localhost:8761/actuator/info
```

## Deployment

### Building the Service

```bash
# Build JAR file
cd backend/discovery-service
mvn clean package

# JAR location
# target/service-discovery-1.0.0-SNAPSHOT.jar
```

### Running as JAR

```bash
# Set environment variables
export DISCOVERY_SERVER_PORT=8761
export EUREKA_HOSTNAME=localhost

# Run JAR
java -jar target/service-discovery-1.0.0-SNAPSHOT.jar
```

### Docker Deployment

**Dockerfile Example:**
```dockerfile
FROM openjdk:21-jdk-slim

WORKDIR /app

COPY target/service-discovery-1.0.0-SNAPSHOT.jar app.jar

EXPOSE 8761

ENTRYPOINT ["java", "-jar", "app.jar"]
```

**Build and Run:**
```bash
# Build image
docker build -t discovery-service:1.0.0 .

# Run container
docker run -d \
  -p 8761:8761 \
  -e DISCOVERY_SERVER_PORT=8761 \
  -e EUREKA_HOSTNAME=localhost \
  --name discovery-service \
  discovery-service:1.0.0
```

### Kubernetes Deployment

**Deployment YAML:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: discovery-service
spec:
  replicas: 2  # For high availability
  selector:
    matchLabels:
      app: discovery-service
  template:
    metadata:
      labels:
        app: discovery-service
    spec:
      containers:
      - name: discovery-service
        image: discovery-service:1.0.0
        ports:
        - containerPort: 8761
        env:
        - name: DISCOVERY_SERVER_PORT
          value: "8761"
        - name: EUREKA_HOSTNAME
          value: "discovery-service"
        livenessProbe:
          httpGet:
            path: /actuator/health/liveness
            port: 8761
          initialDelaySeconds: 60
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /actuator/health/readiness
            port: 8761
          initialDelaySeconds: 30
          periodSeconds: 5
```

**Service YAML:**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: discovery-service
spec:
  selector:
    app: discovery-service
  ports:
  - port: 8761
    targetPort: 8761
  type: ClusterIP
```

### Production Considerations

#### High Availability

- **Eureka Cluster**: Deploy at least 2 Eureka nodes
- **Load Balancer**: Use load balancer in front of Eureka cluster
- **Health Checks**: Configure health checks for automatic failover
- **Graceful Shutdown**: Allow time for services to deregister

#### Performance

- **JVM Tuning**: Configure appropriate heap size
  ```bash
  java -Xms512m -Xmx1024m -jar service-discovery.jar
  ```
- **Connection Pooling**: Tune connection pool sizes
- **Eviction Interval**: Adjust based on network conditions

#### Security

- **HTTPS/TLS**: Enable SSL/TLS in production
- **Authentication**: Enable HTTP Basic Authentication
- **Network Security**: Restrict access to Eureka endpoints
- **IP Whitelisting**: Allow only trusted services to register

#### Monitoring

- **Metrics**: Export metrics to Prometheus/Grafana
- **Logging**: Centralized logging (ELK Stack, CloudWatch)
- **Alerts**: Set up alerts for service registration failures
- **Dashboard**: Monitor Eureka dashboard regularly

## Best Practices

### Configuration

1. **Use Environment Variables**
   - Never hardcode configuration values
   - Use environment variables for all settings
   - Use secrets management in production

2. **Enable Self-Preservation in Production**
   ```yaml
   eureka:
     server:
       enable-self-preservation: true
       renewal-percent-threshold: 0.85
   ```

3. **Configure Appropriate Eviction Interval**
   ```yaml
   eureka:
     server:
       eviction-interval-timer-in-ms: 60000  # 60 seconds
   ```

### High Availability

1. **Deploy Eureka Cluster**
   - Minimum 2 nodes for high availability
   - Use odd number of nodes (3, 5) for better consensus
   - Deploy across multiple availability zones

2. **Peer-to-Peer Replication**
   - Configure all nodes to register with each other
   - Ensure all nodes can communicate
   - Monitor replication status

3. **Load Balancer**
   - Use load balancer in front of Eureka cluster
   - Configure health checks
   - Enable session affinity if needed

### Service Registration

1. **Service Naming**
   - Use consistent naming convention (UPPERCASE)
   - Example: `AUTH-SERVICE`, `API-GATEWAY`
   - Match service name in all configurations

2. **Instance ID**
   - Use unique instance IDs
   - Format: `{service-name}:{port}`
   - Include hostname or IP for uniqueness

3. **Health Checks**
   - Configure proper health check endpoints
   - Ensure health checks are fast (< 1 second)
   - Return proper HTTP status codes

### Monitoring

1. **Dashboard Monitoring**
   - Regularly check Eureka dashboard
   - Monitor service registration/deregistration
   - Watch for services going DOWN

2. **Log Monitoring**
   - Monitor registration events
   - Track heartbeat renewals
   - Alert on eviction events

3. **Metrics Collection**
   - Track number of registered services
   - Monitor registration/deregistration rates
   - Track eviction events

### Security

1. **Authentication**
   - Enable HTTP Basic Authentication
   - Use strong passwords
   - Rotate credentials regularly

2. **Network Security**
   - Restrict access to Eureka endpoints
   - Use firewall rules
   - Enable HTTPS/TLS

3. **Service Validation**
   - Validate service registration requests
   - Reject unauthorized services
   - Monitor for suspicious activity

### Performance

1. **Resource Allocation**
   - Allocate sufficient memory (minimum 512MB)
   - Monitor CPU and memory usage
   - Scale horizontally if needed

2. **Eviction Tuning**
   - Balance between fast eviction and stability
   - Consider network latency
   - Monitor eviction rates

3. **Connection Management**
   - Tune connection pool sizes
   - Monitor connection usage
   - Handle connection failures gracefully

### Troubleshooting

1. **Logging**
   - Enable appropriate log levels
   - Use structured logging
   - Include correlation IDs

2. **Health Checks**
   - Implement comprehensive health checks
   - Check dependencies
   - Return meaningful status

3. **Documentation**
   - Document all configuration options
   - Keep deployment guides updated
   - Document troubleshooting procedures

---

**Last Updated:** 2025-01-20  
**Version:** 1.0.0-SNAPSHOT  
**Maintainers:** EduMind Development Team

