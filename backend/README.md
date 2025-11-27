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
│                        Frontend                             │
│                    (React/Angular)                          │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ HTTP/HTTPS
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                    API Gateway                              │
│              (Spring Cloud Gateway)                         │
│              Port: 8080                                     │
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
                  ┌───────▼────┐  ┌───────▼────┐  ┌───────▼────┐
                  │ PostgreSQL │  │   Redis    │  │ Cloudinary │
                  │  Port:5432 │  │ Port:6379  │  │  (Cloud)   │
                  │            │  │            │  │            │
                  │ • Users    │  │ • Rate     │  │ • File     │
                  │ • Roles    │  │   Limit    │  │   Upload   │
                  │ • Tokens   │  │ • Cache    │  │            │
                  └────────────┘  └────────────┘  └────────────┘
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
- **Response Models:**
  - `ApiResponse<T>` - Standardized API response wrapper
  - `PagedResponse<T>` - Paginated response wrapper
  - `ErrorResponse` - Standardized error response
  - `MessageResponse` - Simple message response

- **Exception Handling:**
  - `GlobalExceptionHandler` - Centralized exception handling
  - `BadRequestException` - 400 Bad Request
  - `ResourceNotFoundException` - 404 Not Found
  - `TokenRefreshException` - Token refresh errors
  - `EmailSendException` - Email sending errors
  - `FileUploadException` - File upload errors
  - `TooManyRequestsException` - 429 Rate Limit errors

- **Constants:**
  - `ErrorCode` - Standardized error codes
  - `ResponseStatus` - Response status constants

- **Security Utilities:**
  - `EncryptionService` - Data encryption/decryption utilities
  - `RateLimitService` - Rate limiting utilities

**Technology:** Spring Boot (shared library)

**Usage:** All services depend on `common-lib` for consistent response formats and error handling.

## Scripts and Utilities

The `backend/scripts/` directory contains utility scripts for development and deployment:

### Available Scripts

#### `generate-all-service-keys.sh`

Generates secure encryption keys for all microservices.

**Usage:**
```bash
cd backend/scripts
chmod +x generate-all-service-keys.sh
./generate-all-service-keys.sh
```

**What it does:**
- Generates unique 32-byte (256-bit) encryption keys for each service
- Outputs keys in format ready for `.env` file
- Provides security warnings and best practices

**Output:**
- Encryption keys for Auth Service (2FA secrets, OAuth tokens)

**Security Notes:**
- ⚠️ Never commit keys to version control
- 🔒 Use different keys for dev/staging/production
- 🔑 Store production keys in secure vault (AWS Secrets Manager, HashiCorp Vault)
- 🔄 Rotate keys quarterly

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
export GOOGLE_REDIRECT_URI="{baseUrl}/api/auth/login/oauth2/code/google"

# Cloudinary (File Upload)
export CLOUDINARY_CLOUD_NAME="your-cloud-name"
export CLOUDINARY_API_KEY="your-api-key"
export CLOUDINARY_API_SECRET="your-api-secret"

# Encryption
export AUTH_SERVICE_ENCRYPTION_KEY="your-encryption-key-32-characters"
export LMS_CORE_SERVICE_ENCRYPTION_KEY="your-encryption-key-32-characters"

# Frontend URL
export FRONTEND_URL="http://localhost:3000"

# Gateway URL
export GATEWAY_URL="http://localhost:8080"

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
| `AUTH_SERVICE_ENCRYPTION_KEY` | Encryption key (32 chars) | - | Yes |
| `LMS_CORE_SERVICE_ENCRYPTION_KEY` | Encryption key (32 chars) | - | Yes |
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

### API Documentation

**Base URL:** `http://localhost:8080` (via API Gateway)

**Authentication:**
- Most endpoints require JWT token in `Authorization` header
- Format: `Authorization: Bearer <token>`

**Response Format:**
All API responses follow a standard format:
```json
{
  "status": "SUCCESS",
  "message": "Operation completed successfully",
  "data": { ... },
  "timestamp": "2025-01-20T10:30:00Z"
}
```

**Error Response Format:**
```json
{
  "status": "ERROR",
  "message": "Error description",
  "errorCode": "ERROR_CODE",
  "timestamp": "2025-01-20T10:30:00Z"
}
```

**Detailed API Documentation:**
- **Auth Service APIs:** See [auth-service/README.md](./auth-service/README.md#api-endpoints) for complete API documentation
- **API Endpoints Include:**
  - Authentication (login, signup, OAuth2, 2FA)
  - User Management (profile, update, search)
  - Admin Operations (user management, role management, application review)
  - Teacher Applications (apply, status, documents)
  - File Upload (profile pictures, documents)

**API Testing:**
- Use Postman or Insomnia collections (if available)
- Or use cURL commands (examples provided in sections above)
- Swagger/OpenAPI documentation (if configured)

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
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+1234567890"
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

## Security Best Practices

### Environment Variables

- ✅ **Never commit secrets to version control**
  - Use `.env` files (add to `.gitignore`)
  - Use environment-specific secret management in production

- ✅ **Use strong secrets**
  - `JWT_SECRET`: Minimum 32 characters, use random generator
  - `AUTH_SERVICE_ENCRYPTION_KEY`: Exactly 32 characters (256-bit) for Auth Service
  - `LMS_CORE_SERVICE_ENCRYPTION_KEY`: Exactly 32 characters (256-bit) for LMS Core Service
  - Generate using: `openssl rand -base64 32`

- ✅ **Rotate secrets regularly**
  - JWT secrets: Every 6 months
  - Encryption keys: Every 3 months for Auth Service and LMS Core Service
  - Database passwords: Every 3 months

### Production Security Checklist

- [ ] **HTTPS/TLS**: Enable SSL/TLS for all services
- [ ] **CORS**: Configure allowed origins for production domains only
- [ ] **Rate Limiting**: Verify rate limits are appropriate for production load
- [ ] **Database Security**:
  - Use strong database passwords
  - Enable SSL connections
  - Restrict network access (firewall rules)
  - Regular backups
- [ ] **Redis Security**:
  - Set Redis password (`REDIS_PASSWORD`)
  - Disable dangerous commands
  - Use Redis AUTH
- [ ] **JWT Configuration**:
  - Use short expiration times (15-30 minutes for access tokens)
  - Implement refresh token rotation
  - Store refresh tokens securely
- [ ] **OAuth2**:
  - Use production OAuth2 credentials
  - Configure proper redirect URIs
  - Enable OAuth2 state parameter validation
- [ ] **2FA**:
  - Enforce 2FA for admin accounts
  - Store 2FA secrets encrypted
  - Implement backup code management
- [ ] **Logging**:
  - Don't log sensitive data (passwords, tokens)
  - Use structured logging
  - Implement log rotation and retention policies
- [ ] **Monitoring**:
  - Monitor failed login attempts
  - Alert on suspicious activity
  - Track rate limit violations

### Secret Management

**Development:**
- Use `.env` files (not committed to Git)
- Use `scripts/generate-all-service-keys.sh` for key generation

**Production:**
- Use AWS Secrets Manager, HashiCorp Vault, or similar
- Implement secret rotation policies
- Use IAM roles for service access
- Enable audit logging for secret access

### Network Security

- **Firewall Rules**: Only expose necessary ports
  - API Gateway: 8080 (HTTPS in production)
  - Eureka: 8761 (internal only in production)
  - Services: Internal only (not exposed publicly)
- **Service-to-Service Communication**: Use internal network
- **Database Access**: Restrict to application servers only

## Deployment and Production Considerations

### Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations tested and ready
- [ ] Secrets stored in secure vault
- [ ] SSL/TLS certificates obtained
- [ ] Health checks configured
- [ ] Logging and monitoring set up
- [ ] Backup strategy in place
- [ ] Disaster recovery plan documented

### Deployment Options

#### Option 1: Docker Compose (Development/Staging)

```bash
# Build all services
mvn clean package

# Start infrastructure
docker-compose up -d

# Start services (manual or via docker-compose)
# See Running Services section
```

#### Option 2: Kubernetes (Production Recommended)

**Prerequisites:**
- Kubernetes cluster (1.20+)
- kubectl configured
- Helm (optional, for easier deployment)

**Deployment Steps:**
1. Create Kubernetes secrets for environment variables
2. Deploy PostgreSQL and Redis (or use managed services)
3. Deploy Discovery Service
4. Deploy Auth Service
5. Deploy API Gateway
6. Configure Ingress for external access

**Example Kubernetes Resources:**
- ConfigMaps for non-sensitive configuration
- Secrets for sensitive data (JWT secrets, DB passwords)
- Deployments for each service
- Services for service discovery
- Ingress for API Gateway

#### Option 3: Cloud Platforms

**AWS:**
- Use ECS/EKS for container orchestration
- RDS for PostgreSQL
- ElastiCache for Redis
- Application Load Balancer for API Gateway
- Secrets Manager for secret storage

**Azure:**
- Azure Kubernetes Service (AKS)
- Azure Database for PostgreSQL
- Azure Cache for Redis
- Azure Application Gateway

**GCP:**
- Google Kubernetes Engine (GKE)
- Cloud SQL for PostgreSQL
- Memorystore for Redis
- Cloud Load Balancing

### Production Configuration

#### Database

- **Connection Pooling**: Configure appropriate pool sizes
- **Read Replicas**: Consider read replicas for scaling
- **Backups**: Automated daily backups with retention policy
- **Monitoring**: Set up database performance monitoring

#### Redis

- **Persistence**: Configure RDB or AOF for data persistence
- **High Availability**: Use Redis Sentinel or Cluster mode
- **Memory Limits**: Set appropriate maxmemory policy

#### Service Scaling

- **Horizontal Scaling**: Run multiple instances of each service
- **Load Balancing**: Use load balancer for service instances
- **Auto-scaling**: Configure based on CPU/memory metrics

#### Monitoring and Observability

**Metrics:**
- Service health and availability
- Request rates and latencies
- Error rates
- Database connection pool usage
- Redis memory usage

**Logging:**
- Centralized logging (ELK Stack, CloudWatch, etc.)
- Structured logging (JSON format)
- Log aggregation and search

**Tracing:**
- Distributed tracing (Jaeger, Zipkin)
- Request correlation IDs
- Service dependency mapping

### Performance Optimization

- **Caching**: Implement Redis caching for frequently accessed data
- **Database Indexing**: Ensure proper indexes on query columns
- **Connection Pooling**: Tune connection pool sizes
- **JVM Tuning**: Configure appropriate heap sizes and GC settings
- **Rate Limiting**: Adjust rate limits based on expected load

### High Availability

- **Multi-AZ Deployment**: Deploy services across multiple availability zones
- **Database Replication**: Set up master-slave replication
- **Service Redundancy**: Run at least 2 instances of each service
- **Health Checks**: Configure liveness and readiness probes
- **Circuit Breakers**: Implement circuit breakers for service calls

## Monitoring and Observability

### Health Checks

All services expose health endpoints via Spring Boot Actuator:

```bash
# Service health checks
curl http://localhost:8080/actuator/health  # API Gateway
curl http://localhost:8081/actuator/health  # Auth Service
curl http://localhost:8761/actuator/health  # Discovery Service
```

**Health Check Endpoints:**
- `/actuator/health` - Basic health status
- `/actuator/health/liveness` - Kubernetes liveness probe
- `/actuator/health/readiness` - Kubernetes readiness probe

### Metrics

Spring Boot Actuator provides metrics at `/actuator/metrics`:

```bash
# Available metrics
curl http://localhost:8080/actuator/metrics

# Specific metric
curl http://localhost:8080/actuator/metrics/jvm.memory.used
```

**Key Metrics to Monitor:**
- `http.server.requests` - HTTP request metrics
- `jvm.memory.used` - JVM memory usage
- `jvm.gc.pause` - Garbage collection pauses
- `process.cpu.usage` - CPU usage
- `hikaricp.connections.active` - Database connection pool
- `redis.connections.active` - Redis connections

### Logging

**Log Locations:**
- `discovery-service/logs/discovery-service.log`
- `auth-service/logs/auth-service.log`
- `api-gateway/logs/api-gateway.log`

**Log Configuration:**
- Log rotation: 10MB per file, 30 days retention
- Structured logging with timestamps
- Log levels configurable via `application.yml`

**Viewing Logs:**
```bash
# Real-time logs
tail -f auth-service/logs/auth-service.log

# Search for errors
grep -i error auth-service/logs/auth-service.log

# Last 100 lines
tail -n 100 auth-service/logs/auth-service.log
```

### Eureka Dashboard

Monitor registered services at:
- **URL:** http://localhost:8761
- **Features:**
  - View all registered services
  - Service instance status
  - Health check status
  - Service metadata

### Recommended Monitoring Stack

**Development:**
- Spring Boot Actuator endpoints
- Eureka Dashboard
- Application logs

**Production:**
- **Metrics:** Prometheus + Grafana
- **Logging:** ELK Stack (Elasticsearch, Logstash, Kibana) or CloudWatch
- **Tracing:** Jaeger or Zipkin
- **APM:** New Relic, Datadog, or Application Insights
- **Alerts:** PagerDuty, OpsGenie, or similar

## Additional Resources

### Documentation

- [Auth Service README](./auth-service/README.md) - Detailed auth service documentation
- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [Spring Cloud Documentation](https://spring.io/projects/spring-cloud)
- [Eureka Documentation](https://github.com/Netflix/eureka)
- [Spring Cloud Gateway Documentation](https://spring.io/projects/spring-cloud-gateway)
- [Spring Boot Actuator](https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html)

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

## Technology Stack Summary

| Component | Technology | Version |
|-----------|-----------|---------|
| **Language** | Java | 21 (LTS) |
| **Framework** | Spring Boot | 3.5.6 |
| **Microservices** | Spring Cloud | 2025.0.0 |
| **Service Discovery** | Eureka | (via Spring Cloud) |
| **API Gateway** | Spring Cloud Gateway | (via Spring Cloud) |
| **Database** | PostgreSQL | 16 |
| **Cache/Rate Limiting** | Redis | 7 |
| **Migration Tool** | Flyway | 10.20.1 |
| **Authentication** | JWT (JJWT) | 0.12.6 |
| **Build Tool** | Maven | 3.6+ |
| **Containerization** | Docker | Latest |

## Project Status

**Current Phase:** Phase 0 - Core Infrastructure

**Services Status:**
- ✅ Discovery Service (Eureka) - Production Ready
- ✅ API Gateway - Production Ready
- ✅ Auth Service - Production Ready
- ✅ Common Library - Production Ready

**Future Services (Planned):**
- 🔄 Course Service
- 🔄 Content Service
- 🔄 Payment Service
- 🔄 Notification Service
- 🔄 Analytics Service

## Contributing

### Development Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow code style guidelines
   - Write unit tests
   - Update documentation

3. **Test Locally**
   ```bash
   mvn clean test
   docker-compose up -d
   # Test services manually
   ```

4. **Commit Changes**
   ```bash
   git commit -m "feat: your feature description"
   ```

5. **Push and Create Pull Request**

### Code Style

- Follow Java naming conventions
- Use meaningful variable and method names
- Add JavaDoc for public methods
- Keep methods focused and small
- Write unit tests for new features

### Commit Message Format

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

---

**Last Updated:** 2025-01-20  
**Version:** 1.0.0-SNAPSHOT  
**Maintainers:** EduMind Development Team

