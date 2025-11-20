# EduMind Platform - Backend

Backend microservices architecture for EduMind Platform - An AI-Powered Learning Platform built with Spring Boot and Spring Cloud.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Services](#services)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Configuration](#configuration)
- [Running Services](#running-services)
- [Service Dependencies](#service-dependencies)
- [API Gateway Routes](#api-gateway-routes)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Additional Resources](#additional-resources)

## Overview

EduMind Platform Backend is a microservices-based architecture designed for scalability, maintainability, and high availability. The platform is built using:

- **Spring Boot 3.5.6** - Modern Java framework
- **Spring Cloud 2025.0.0** - Microservices infrastructure
- **Java 21** - Latest LTS Java version
- **PostgreSQL 16** - Relational database
- **Redis 7** - Caching and rate limiting
- **Eureka** - Service discovery
- **Spring Cloud Gateway** - API Gateway with routing and rate limiting

### Key Features

- ✅ **Microservices Architecture** - Loosely coupled, independently deployable services
- ✅ **Service Discovery** - Automatic service registration and discovery via Eureka
- ✅ **API Gateway** - Single entry point with routing, rate limiting, and CORS
- ✅ **JWT Authentication** - Secure token-based authentication
- ✅ **OAuth2 Integration** - Social login (Google)
- ✅ **Two-Factor Authentication** - TOTP-based 2FA
- ✅ **Database Migrations** - Version-controlled schema with Flyway
- ✅ **Rate Limiting** - Redis-based rate limiting at API Gateway
- ✅ **Health Monitoring** - Spring Boot Actuator for health checks
- ✅ **Centralized Logging** - Structured logging with log rotation

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│                    (React/Angular)                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ HTTP/HTTPS
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                    API Gateway                               │
│              (Spring Cloud Gateway)                          │
│              Port: 8080                                      │
│  • Routing                                                  │
│  • Rate Limiting (Redis)                                    │
│  • CORS                                                     │
│  • Load Balancing                                           │
└───────┬───────────────────────────────────┬─────────────────┘
        │                                   │
        │                                   │
┌───────▼──────────┐              ┌────────▼──────────────┐
│  Eureka Server   │              │   Auth Service        │
│  (Discovery)     │              │   Port: 8081          │
│  Port: 8761      │              │                       │
│                  │              │  • Authentication     │
│  • Service       │              │  • Authorization      │
│    Registry      │              │  • User Management    │
│  • Health        │              │  • JWT Tokens         │
│    Monitoring    │              │  • OAuth2             │
└──────────────────┘              │  • 2FA                │
                                  └───────┬───────────────┘
                                          │
                          ┌───────────────┼───────────────┐
                          │               │               │
                  ┌───────▼────┐  ┌──────▼────┐  ┌──────▼────┐
                  │ PostgreSQL │  │   Redis   │  │ Cloudinary │
                  │  Port:5432 │  │ Port:6379 │  │  (Cloud)   │
                  │            │  │           │  │            │
                  │ • Users    │  │ • Rate    │  │ • File     │
                  │ • Roles    │  │   Limit   │  │   Upload   │
                  │ • Tokens   │  │ • Cache   │  │            │
                  └────────────┘  └───────────┘  └────────────┘
```

### Service Communication Flow

1. **Client Request** → API Gateway (Port 8080)
2. **API Gateway** → Eureka Server (Service Discovery)
3. **Eureka** → Returns service instance (e.g., AUTH-SERVICE:8081)
4. **API Gateway** → Routes request to Auth Service
5. **Auth Service** → Processes request, queries PostgreSQL
6. **Response** → API Gateway → Client

## Services

### 1. Discovery Service (Eureka Server)

**Port:** 8761  
**Purpose:** Service registry and discovery

- Registers all microservices
- Provides service discovery for API Gateway
- Health monitoring of registered services
- Web UI dashboard at http://localhost:8761

**Technology:** Spring Cloud Netflix Eureka Server

### 2. API Gateway

**Port:** 8080  
**Purpose:** Single entry point for all client requests

- Routes requests to appropriate microservices
- Rate limiting (10 requests/second, burst: 20)
- CORS configuration
- Load balancing across service instances
- Request/Response filtering

**Technology:** Spring Cloud Gateway, Redis (rate limiting)

### 3. Auth Service

**Port:** 8081  
**Purpose:** Authentication and authorization

**Features:**
- User registration and login
- JWT token generation and validation
- OAuth2 authentication (Google)
- Two-Factor Authentication (2FA)
- Email verification
- Password reset
- User profile management
- Role-based access control (RBAC)
- Teacher application system
- File upload (profile pictures)

**Technology:** Spring Boot, Spring Security, JWT, PostgreSQL, Flyway, Cloudinary

**Database:** `edumind_auth`

**Documentation:** See [auth-service/README.md](./auth-service/README.md) for detailed documentation.

### 4. Common Library

**Purpose:** Shared code and utilities across services

**Contains:**
- Common DTOs and response models
- Exception handlers
- Constants
- Utility classes

**Technology:** Spring Boot (shared library)

## Prerequisites

Before setting up the backend, ensure you have the following installed:

### Required

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

- **Docker & Docker Compose** (for running PostgreSQL and Redis)
  ```bash
  docker --version
  docker-compose --version
  ```

### Optional (for production)

- **PostgreSQL 16+** (if not using Docker)
- **Redis 7+** (if not using Docker)
- **Git** (for version control)

### Development Tools (Recommended)

- **IDE:** IntelliJ IDEA, Eclipse, or VS Code
- **Postman** or **Insomnia** (for API testing)
- **pgAdmin** or **DBeaver** (for database management)

## Project Structure

```
backend/
├── discovery-service/          # Eureka Service Discovery Server
│   ├── src/
│   ├── pom.xml
│   └── README.md
│
├── api-gateway/                # Spring Cloud Gateway
│   ├── src/
│   ├── pom.xml
│   └── README.md
│
├── auth-service/               # Authentication & Authorization Service
│   ├── src/
│   │   └── main/
│   │       ├── java/
│   │       └── resources/
│   │           ├── application.yml
│   │           └── db/migration/  # Flyway migrations
│   ├── pom.xml
│   └── README.md
│
├── common-lib/                 # Shared library
│   ├── src/
│   └── pom.xml
│
├── docker-compose.yml          # Docker services (PostgreSQL, Redis)
├── pom.xml                     # Parent POM
└── README.md                   # This file
```

## Quick Start

### 1. Clone and Navigate

```bash
cd backend
```

### 2. Start Infrastructure Services

```bash
# Start PostgreSQL and Redis
docker-compose up -d
```

### 3. Configure Environment Variables

Create a `.env` file in the `backend` directory (see [Configuration](#configuration) section).

### 4. Build All Services

```bash
mvn clean install
```

### 5. Start Services (in order)

**Terminal 1 - Discovery Service:**
```bash
cd discovery-service
mvn spring-boot:run
```

**Terminal 2 - Auth Service:**
```bash
cd auth-service
mvn spring-boot:run
```

**Terminal 3 - API Gateway:**
```bash
cd api-gateway
mvn spring-boot:run
```

### 6. Verify Services

- **Eureka Dashboard:** http://localhost:8761
- **API Gateway:** http://localhost:8080
- **Auth Service Health:** http://localhost:8081/actuator/health

## Detailed Setup

### Step 1: Environment Setup

#### Install Java 21

**macOS (using Homebrew):**
```bash
brew install openjdk@21
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install openjdk-21-jdk
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
```

**Windows:**
- Download from [Adoptium](https://adoptium.net/)
- Set `JAVA_HOME` environment variable

#### Install Maven

**macOS (using Homebrew):**
```bash
brew install maven
```

**Linux:**
```bash
sudo apt install maven
```

**Windows:**
- Download from [Maven](https://maven.apache.org/download.cgi)
- Add to PATH

#### Install Docker

**macOS/Windows:**
- Download [Docker Desktop](https://www.docker.com/products/docker-desktop)

**Linux:**
```bash
sudo apt install docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
```

### Step 2: Database Setup

#### Option A: Using Docker Compose (Recommended)

```bash
# From backend directory
docker-compose up -d

# Verify containers are running
docker-compose ps

# Check logs
docker-compose logs -f postgres-auth
docker-compose logs -f redis
```

#### Option B: Manual Setup

**PostgreSQL:**
```bash
# Install PostgreSQL 16
sudo apt install postgresql-16

# Create database
sudo -u postgres psql
CREATE DATABASE edumind_auth;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE edumind_auth TO postgres;
\q
```

**Redis:**
```bash
# Install Redis
sudo apt install redis-server

# Start Redis
sudo systemctl start redis
sudo systemctl enable redis
```

### Step 3: Build Project

```bash
# From backend directory
mvn clean install

# This will:
# 1. Build common-lib
# 2. Build discovery-service
# 3. Build api-gateway
# 4. Build auth-service
```

**Note:** First build may take 5-10 minutes as Maven downloads dependencies.

### Step 4: Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
# Database Configuration
export AUTH_DB_URL="jdbc:postgresql://localhost:5432/edumind_auth"
export AUTH_DB_USERNAME="postgres"
export AUTH_DB_PASSWORD="postgres"

# JWT Configuration
export JWT_SECRET="your-super-secret-jwt-key-minimum-32-characters-long-for-security"
export JWT_EXPIRATION="86400000"
export JWT_REFRESH_EXPIRATION="604800000"

# Eureka Configuration
export EUREKA_DEFAULT_ZONE="http://localhost:8761/eureka/"

# Email Configuration (Gmail SMTP)
export MAIL_HOST="smtp.gmail.com"
export MAIL_PORT="587"
export MAIL_USERNAME="your-email@gmail.com"
export MAIL_PASSWORD="your-app-password"
export MAIL_FROM="noreply@edumind.com"
export MAIL_ENABLED="true"

# Google OAuth2
export GOOGLE_CLIENT_ID="your-google-client-id"
export GOOGLE_CLIENT_SECRET="your-google-client-secret"
export GOOGLE_REDIRECT_URI="{baseUrl}/login/oauth2/code/google"

# Cloudinary (File Upload)
export CLOUDINARY_CLOUD_NAME="your-cloud-name"
export CLOUDINARY_API_KEY="your-api-key"
export CLOUDINARY_API_SECRET="your-api-secret"

# Encryption
export ENCRYPTION_KEY="your-encryption-key-32-characters"

# Frontend URL
export FRONTEND_URL="http://localhost:3000"

# Service Ports (optional, defaults shown)
export DISCOVERY_SERVER_PORT="8761"
export API_GATEWAY_PORT="8080"
export AUTH_SERVICE_PORT="8081"

# Redis Configuration (optional, defaults shown)
export REDIS_HOST="localhost"
export REDIS_PORT="6379"
export REDIS_PASSWORD=""
```

**Load environment variables:**

**macOS/Linux:**
```bash
# Using direnv (recommended)
echo "dotenv" > .envrc
direnv allow

# Or manually source
source .env
```

**Windows (PowerShell):**
```powershell
# Load .env file
Get-Content .env | ForEach-Object {
    if ($_ -match '^export\s+(\w+)=(.*)$') {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
    }
}
```

## Configuration

### Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `AUTH_DB_URL` | PostgreSQL connection URL | `jdbc:postgresql://localhost:5432/edumind_auth` | Yes |
| `AUTH_DB_USERNAME` | Database username | `postgres` | Yes |
| `AUTH_DB_PASSWORD` | Database password | - | Yes |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | - | Yes |
| `JWT_EXPIRATION` | Access token expiration (ms) | `86400000` (24h) | No |
| `JWT_REFRESH_EXPIRATION` | Refresh token expiration (ms) | `604800000` (7d) | No |
| `EUREKA_DEFAULT_ZONE` | Eureka server URL | `http://localhost:8761/eureka/` | No |
| `MAIL_USERNAME` | Email username | - | Yes* |
| `MAIL_PASSWORD` | Email password/app password | - | Yes* |
| `GOOGLE_CLIENT_ID` | Google OAuth2 client ID | - | Yes* |
| `GOOGLE_CLIENT_SECRET` | Google OAuth2 secret | - | Yes* |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | - | Yes* |
| `CLOUDINARY_API_KEY` | Cloudinary API key | - | Yes* |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | - | Yes* |
| `ENCRYPTION_KEY` | Encryption key (32 chars) | - | Yes |
| `FRONTEND_URL` | Frontend application URL | `http://localhost:3000` | No |
| `DISCOVERY_SERVER_PORT` | Eureka server port | `8761` | No |
| `API_GATEWAY_PORT` | API Gateway port | `8080` | No |
| `AUTH_SERVICE_PORT` | Auth service port | `8081` | No |
| `REDIS_HOST` | Redis host | `localhost` | No |
| `REDIS_PORT` | Redis port | `6379` | No |

*Required only if using that feature

### Application Configuration Files

Each service has its own `application.yml`:

- `discovery-service/src/main/resources/application.yml`
- `api-gateway/src/main/resources/application.yml`
- `auth-service/src/main/resources/application.yml`

These files contain default configurations and can be overridden by environment variables.

## Running Services

### Service Startup Order

Services must be started in the following order due to dependencies:

1. **Infrastructure** (PostgreSQL, Redis) - via Docker Compose
2. **Discovery Service** (Eureka) - Port 8761
3. **Auth Service** - Port 8081 (registers with Eureka)
4. **API Gateway** - Port 8080 (discovers services via Eureka)

### Method 1: Manual Startup (Development)

#### Terminal 1: Start Infrastructure

```bash
cd backend
docker-compose up -d
```

#### Terminal 2: Start Discovery Service

```bash
cd backend/discovery-service
mvn spring-boot:run
```

Wait for: `Started ServiceDiscoveryApplication` (takes ~30 seconds)

#### Terminal 3: Start Auth Service

```bash
cd backend/auth-service
mvn spring-boot:run
```

Wait for: `Started AuthServiceApplication` and service registered with Eureka

#### Terminal 4: Start API Gateway

```bash
cd backend/api-gateway
mvn spring-boot:run
```

Wait for: `Started ApiGatewayApplication`

### Method 2: Using IDE

1. **Start Infrastructure:**
   ```bash
   docker-compose up -d
   ```

2. **Run Services in IDE:**
   - Open project in IntelliJ IDEA or Eclipse
   - Run `DiscoveryServiceApplication.java`
   - Run `AuthServiceApplication.java`
   - Run `ApiGatewayApplication.java`

### Method 3: Using JAR Files

```bash
# Build all services
cd backend
mvn clean package

# Start Discovery Service
java -jar discovery-service/target/service-discovery-1.0.0-SNAPSHOT.jar

# Start Auth Service (in new terminal)
java -jar auth-service/target/auth-service-1.0.0-SNAPSHOT.jar

# Start API Gateway (in new terminal)
java -jar api-gateway/target/api-gateway-1.0.0-SNAPSHOT.jar
```

### Verifying Services

#### 1. Check Eureka Dashboard

Open http://localhost:8761 in your browser.

You should see:
- **AUTH-SERVICE** registered
- **API-GATEWAY** registered

#### 2. Check Service Health

```bash
# Discovery Service
curl http://localhost:8761/actuator/health

# Auth Service
curl http://localhost:8081/actuator/health

# API Gateway
curl http://localhost:8080/actuator/health
```

Expected response: `{"status":"UP"}`

#### 3. Test API Gateway Routing

```bash
# Test auth endpoint through API Gateway
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "usernameOrEmail": "admin@edumind.com",
    "password": "password123"
  }'
```

## Service Dependencies

### Dependency Graph

```
┌─────────────────┐
│  API Gateway    │
│   (Port 8080)   │
└────────┬────────┘
         │
         ├─── Depends on ───┐
         │                  │
         ▼                  ▼
┌─────────────────┐  ┌─────────────────┐
│  Eureka Server  │  │  Auth Service   │
│   (Port 8761)   │  │   (Port 8081)   │
└─────────────────┘  └────────┬────────┘
                              │
                              ├─── Depends on ───┐
                              │                  │
                              ▼                  ▼
                    ┌─────────────────┐  ┌─────────────────┐
                    │   PostgreSQL    │  │     Redis       │
                    │   (Port 5432)   │  │   (Port 6379)   │
                    └─────────────────┘  └─────────────────┘
```

### Startup Sequence

1. **PostgreSQL & Redis** (Docker Compose)
   - Must be running before any service starts
   - Check: `docker-compose ps`

2. **Discovery Service (Eureka)**
   - No dependencies
   - Must be running before other services register
   - Check: http://localhost:8761

3. **Auth Service**
   - Depends on: PostgreSQL, Eureka
   - Registers itself with Eureka
   - Runs database migrations on startup
   - Check: http://localhost:8081/actuator/health

4. **API Gateway**
   - Depends on: Eureka, Redis
   - Discovers services via Eureka
   - Uses Redis for rate limiting
   - Check: http://localhost:8080/actuator/health

## API Gateway Routes

All client requests go through the API Gateway at `http://localhost:8080`.

### Route Configuration

| Route Pattern | Target Service | Internal Path | Rate Limit |
|---------------|----------------|---------------|------------|
| `/api/auth/**` | AUTH-SERVICE | `/auth/**` | 10 req/s |
| `/api/admin/**` | AUTH-SERVICE | `/admin/**` | 10 req/s |
| `/api/users/**` | AUTH-SERVICE | `/users/**` | 10 req/s |
| `/api/upload/**` | AUTH-SERVICE | `/upload/**` | 10 req/s |
| `/api/teacher-application/**` | AUTH-SERVICE | `/teacher-application/**` | 10 req/s |

### Example API Calls

#### Through API Gateway (Recommended)

```bash
# Register user
curl -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "SecurePassword123!",
    "fullName": "John Doe"
  }'

# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "usernameOrEmail": "admin@edumind.com",
    "password": "password123"
  }'
```

#### Direct to Service (Development Only)

```bash
# Direct to Auth Service (bypasses Gateway)
curl -X POST http://localhost:8081/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "usernameOrEmail": "admin@edumind.com",
    "password": "password123"
  }'
```

### Rate Limiting

API Gateway implements rate limiting:
- **Rate:** 10 requests per second
- **Burst:** 20 requests
- **Key:** IP address

When rate limit is exceeded:
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded"
}
```

## Development Workflow

### 1. Making Changes

```bash
# 1. Make code changes
# 2. Rebuild affected service
cd backend/auth-service
mvn clean install

# 3. Restart service
mvn spring-boot:run
```

### 2. Database Migrations

When adding new migrations:

```bash
# 1. Create migration file
# File: auth-service/src/main/resources/db/migration/V17__Your_migration.sql

# 2. Restart service (migrations run automatically)
cd backend/auth-service
mvn spring-boot:run
```

### 3. Viewing Logs

```bash
# Service logs
tail -f discovery-service/logs/service-discovery.log
tail -f auth-service/logs/auth-service.log
tail -f api-gateway/logs/api-gateway.log

# Docker logs
docker-compose logs -f postgres-auth
docker-compose logs -f redis
```

### 4. Hot Reload (Development)

For faster development, use Spring Boot DevTools:

```xml
<!-- Add to pom.xml -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <scope>runtime</scope>
    <optional>true</optional>
</dependency>
```

Changes will auto-reload (except for `application.yml` changes).

## Testing

### Unit Tests

```bash
# Run all tests
mvn test

# Run tests for specific service
cd auth-service
mvn test
```

### Integration Tests

```bash
# Run integration tests
mvn verify
```

### Manual API Testing

#### Using cURL

```bash
# Register
curl -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test123!",
    "fullName": "Test User"
  }'

# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "usernameOrEmail": "test@example.com",
    "password": "Test123!"
  }'

# Get current user (with token)
curl http://localhost:8080/api/users/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### Using Postman

1. Import collection (if available)
2. Set base URL: `http://localhost:8080`
3. Test endpoints

### Demo Users

For testing, use these demo accounts:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@edumind.com` | `password123` |
| Teacher | `teacher@edumind.com` | `password123` |
| Student | `student@edumind.com` | `password123` |
| Guest | `guest@edumind.com` | `password123` |

## Troubleshooting

### Common Issues

#### 1. Services fail to start - Port already in use

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
```

#### 2. Auth Service fails - Database connection error

**Error:**
```
org.postgresql.util.PSQLException: Connection refused
```

**Solution:**
```bash
# Check PostgreSQL is running
docker-compose ps

# Start PostgreSQL
docker-compose up -d postgres-auth

# Check connection
docker-compose exec postgres-auth psql -U postgres -d edumind_auth -c "SELECT 1;"
```

#### 3. Services not registering with Eureka

**Error:**
```
com.netflix.discovery.shared.transport.TransportException: Cannot execute request
```

**Solution:**
1. Ensure Eureka is running: http://localhost:8761
2. Check `EUREKA_DEFAULT_ZONE` environment variable
3. Verify network connectivity: `curl http://localhost:8761/eureka/`
4. Check service logs for connection errors

#### 4. API Gateway cannot route to services

**Error:**
```
503 Service Unavailable
```

**Solution:**
1. Check Eureka dashboard: http://localhost:8761
2. Verify service is registered (should see AUTH-SERVICE)
3. Check service health: `curl http://localhost:8081/actuator/health`
4. Verify Redis is running: `docker-compose ps redis`

#### 5. Rate limiting not working

**Error:**
```
Rate limiting not applied
```

**Solution:**
1. Check Redis is running: `docker-compose ps redis`
2. Verify Redis connection in API Gateway logs
3. Check `REDIS_HOST` and `REDIS_PORT` environment variables

#### 6. Database migrations fail

**Error:**
```
org.flywaydb.core.api.FlywayException: Validate failed
```

**Solution:**
1. Check migration files for syntax errors
2. Verify database schema matches expected state
3. Review Flyway logs in service logs
4. For existing databases, ensure `baseline-on-migrate: true` is set

#### 7. JWT token validation fails

**Error:**
```
io.jsonwebtoken.security.SignatureException: JWT signature does not match
```

**Solution:**
1. Ensure `JWT_SECRET` is set and consistent
2. Verify `JWT_SECRET` is at least 32 characters
3. Check token was signed with same secret

### Debugging Tips

#### Enable Debug Logging

Add to `application.yml`:
```yaml
logging:
  level:
    com.edumind: DEBUG
    org.springframework.cloud.gateway: DEBUG
    org.springframework.security: DEBUG
```

#### Check Service Logs

```bash
# Real-time logs
tail -f auth-service/logs/auth-service.log

# Search logs
grep "ERROR" auth-service/logs/auth-service.log
```

#### Database Debugging

```bash
# Connect to database
docker-compose exec postgres-auth psql -U postgres -d edumind_auth

# List tables
\dt

# Check users
SELECT * FROM users;

# Check migrations
SELECT * FROM flyway_schema_history;
```

#### Network Debugging

```bash
# Check if ports are listening
netstat -an | grep 8080
netstat -an | grep 8081
netstat -an | grep 8761

# Test connectivity
curl http://localhost:8761/eureka/
curl http://localhost:8081/actuator/health
curl http://localhost:8080/actuator/health
```

## Additional Resources

### Documentation

- [Auth Service README](./auth-service/README.md) - Detailed auth service documentation
- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [Spring Cloud Documentation](https://spring.io/projects/spring-cloud)
- [Eureka Documentation](https://github.com/Netflix/eureka)
- [Spring Cloud Gateway Documentation](https://spring.io/projects/spring-cloud-gateway)

### Useful Commands

```bash
# Build all services
mvn clean install

# Build specific service
cd auth-service && mvn clean install

# Run tests
mvn test

# Check Docker containers
docker-compose ps

# View Docker logs
docker-compose logs -f

# Stop all services
docker-compose down

# Clean Docker volumes (⚠️ deletes data)
docker-compose down -v

# Check service health
curl http://localhost:8080/actuator/health
curl http://localhost:8081/actuator/health
curl http://localhost:8761/actuator/health
```

### Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| Eureka Dashboard | http://localhost:8761 | Service registry UI |
| API Gateway | http://localhost:8080 | Main entry point |
| Auth Service | http://localhost:8081 | Direct access (dev only) |
| API Gateway Health | http://localhost:8080/actuator/health | Health check |
| Auth Service Health | http://localhost:8081/actuator/health | Health check |

### Support

For issues or questions:
1. Check [Troubleshooting](#troubleshooting) section
2. Review service-specific README files
3. Check service logs
4. Contact the development team

---

**Last Updated:** 2025-01-20  
**Version:** 1.0.0-SNAPSHOT

