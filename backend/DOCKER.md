# Guide for Docker for EduMind Platform

This document guides how to build and run Docker images for the microservices of the EduMind Platform.

## 📋 Table of Contents

- [Overview](#overview)
- [Requirements](#requirements)
- [Docker Structure](#docker-structure)
- [Build Docker Images](#build-docker-images)
- [Run with Docker Compose](#run-with-docker-compose)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)
- [Development Workflow](#development-workflow)
- [Reference Documentation](#reference-documentation)

## 📦 Overview

The project uses Docker to containerize the microservices:

- **discovery-service** (Port 8761): Eureka Server for service discovery
- **api-gateway** (Port 8080): Spring Cloud Gateway
- **auth-service** (Port 8081): Authentication & Authorization service
- **lms-core-service** (Port 8083): Core Learning Management System service
- **postgres-auth** (Port 5432): PostgreSQL database for Auth
- **postgres-lms-core** (Port 5433): PostgreSQL database for LMS Core
- **redis** (Port 6379): Redis for rate limiting

## 🔧 Requirements

- Docker Engine >= 20.10
- Docker Compose >= 2.0
- Maven >= 3.9 (to build images)
- Java 21 (to build locally if needed)

Check version:
```bash
docker --version
docker compose version
```

## 📁 Docker Structure

```
backend/
├── docker-compose.yml          # Orchestration for all services
├── .dockerignore               # Files/folders to ignore when build
├── discovery-service/
│   └── Dockerfile              # Dockerfile for discovery-service
├── api-gateway/
│   └── Dockerfile              # Dockerfile for api-gateway
├── auth-service/
│   └── Dockerfile              # Dockerfile for auth-service
└── lms-core-service/
    └── Dockerfile              # Dockerfile for lms-core-service
```

## 🏗️ Build Docker Images

### Method 1: Build each service separately

Build from the `backend/` directory:

```bash
# Build discovery-service
docker build -f discovery-service/Dockerfile -t edumind/discovery-service:latest .

# Build api-gateway
docker build -f api-gateway/Dockerfile -t edumind/api-gateway:latest .

# Build auth-service
docker build -f auth-service/Dockerfile -t edumind/auth-service:latest .

# Build lms-core-service
docker build -f lms-core-service/Dockerfile -t edumind/lms-core-service:latest .
```

### Method 2: Build all with docker-compose

```bash
# Build all images
docker compose build

# Build from scratch (without cache)
docker compose build --no-cache

# Build a specific service
docker compose build discovery-service
```

### Check built images

```bash
docker images | grep edumind
```

Expected result:
```
edumind/discovery-service   latest    ...    ...    ...
edumind/api-gateway         latest    ...    ...    ...
edumind/auth-service        latest    ...    ...    ...
edumind/lms-core-service    latest    ...    ...    ...
```

## 🚀 Run with Docker Compose

### Step 1: Create .env file

Create `.env` file in the `backend/` directory with the necessary environment variables:

```bash
# Auth Service Database
AUTH_DB_NAME=edumind_auth
AUTH_DB_USERNAME=postgres
AUTH_DB_PASSWORD=your_secure_password

# LMS Core Service Database
LMS_CORE_DB_NAME=edumind_core
LMS_CORE_DB_USERNAME=postgres
LMS_CORE_DB_PASSWORD=your_secure_password

# JWT
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters_long
JWT_EXPIRATION=86400000
JWT_REFRESH_EXPIRATION=604800000

# Email (Gmail SMTP)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_FROM=noreply@edumind.com
MAIL_ENABLED=true

# Cloudinary (Required for LMS Core)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Google OAuth2 (if used)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI={baseUrl}/api/auth/login/oauth2/code/google

# Encryption
AUTH_SERVICE_ENCRYPTION_KEY=your_encryption_key
LMS_CORE_SERVICE_ENCRYPTION_KEY=your_encryption_key

# Frontend URL
FRONTEND_URL=http://localhost:3000

# PayPal (Optional)
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_MODE=sandbox

# Ports (optional, default values)
DISCOVERY_SERVER_PORT=8761
API_GATEWAY_PORT=8080
AUTH_SERVICE_PORT=8081
LMS_CORE_SERVICE_PORT=8083
REDIS_PORT=6379
```

**⚠️ Note:** The `.env` file contains sensitive information, do not commit to Git!

### Step 2: Start all services

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# View logs of a specific service
docker compose logs -f discovery-service
docker compose logs -f api-gateway
docker compose logs -f auth-service
docker compose logs -f lms-core-service
```

### Step 3: Check running services

```bash
# List all containers
docker compose ps

# Check health status
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
```

### Step 4: Access services

- **Discovery Service Dashboard**: http://localhost:8761
- **API Gateway**: http://localhost:8080
- **Auth Service**: http://localhost:8081
- **LMS Core Service**: http://localhost:8083
- **API Gateway Health**: http://localhost:8080/actuator/health
- **Auth Service Health**: http://localhost:8081/actuator/health
- **LMS Core Service Health**: http://localhost:8083/actuator/health

### Stop and Cleanup

```bash
# Stop all services (keep containers and volumes)
docker compose stop

# Stop and remove containers (keep volumes)
docker compose down

# Stop and remove containers + volumes (delete data)
docker compose down -v

# Stop and remove containers + volumes + images
docker compose down -v --rmi all
```

## 🔐 Environment Variables

### Discovery Service

| Variable | Default | Description |
|----------|---------|-------|
| `DISCOVERY_SERVER_PORT` | 8761 | Port of Eureka Server |
| `EUREKA_HOSTNAME` | localhost | Hostname of Eureka |

### API Gateway

| Variable | Default | Description |
|----------|---------|-------|
| `API_GATEWAY_PORT` | 8080 | Port of API Gateway |
| `REDIS_HOST` | redis | Redis hostname (in Docker network) |
| `REDIS_PORT` | 6379 | Redis port |
| `REDIS_PASSWORD` | - | Redis password (if any) |
| `EUREKA_DEFAULT_ZONE` | http://discovery-service:8761/eureka/ | Eureka server URL |

### Auth Service

| Variable | Default | Description |
|----------|---------|-------|
| `AUTH_SERVICE_PORT` | 8081 | Port of Auth Service |
| `AUTH_DB_URL` | jdbc:postgresql://postgres-auth:5432/edumind_auth | Database URL |
| `AUTH_DB_USERNAME` | postgres | Database username |
| `AUTH_DB_PASSWORD` | - | Database password (required) |
| `JWT_SECRET` | - | JWT secret key (required, min 32 chars) |
| `JWT_EXPIRATION` | 86400000 | JWT expiration (ms) |
| `MAIL_USERNAME` | - | Email username (required) |
| `MAIL_PASSWORD` | - | Email password (required) |
| `GOOGLE_CLIENT_ID` | - | Google OAuth client ID |
| `AUTH_SERVICE_ENCRYPTION_KEY` | - | Encryption key (required) |

### LMS Core Service

| Variable | Default | Description |
|----------|---------|-------|
| `LMS_CORE_SERVICE_PORT` | 8083 | Port of LMS Core Service |
| `LMS_CORE_DB_URL` | jdbc:postgresql://postgres-lms-core:5432/edumind_core | Database URL |
| `LMS_CORE_DB_USERNAME` | postgres | Database username |
| `LMS_CORE_DB_PASSWORD` | - | Database password (required) |
| `JWT_SECRET` | - | JWT secret key (required, shared with Auth Service) |
| `CLOUDINARY_CLOUD_NAME` | - | Cloudinary cloud name (required) |
| `CLOUDINARY_API_KEY` | - | Cloudinary API key (required) |
| `CLOUDINARY_API_SECRET` | - | Cloudinary API secret (required) |
| `LMS_CORE_SERVICE_ENCRYPTION_KEY` | - | Encryption key (required) |

## 🐛 Troubleshooting

### 1. Build fails with "parent POM not found" or "Child module does not exist"

**Reason:** Docker build context is incorrect or missing module POMs.

**Solution:** 
All Dockerfiles are optimized to resolve the "Reactor" error by copying ALL module POMs at the beginning of the build. Ensure you run the build from the `backend/` root directory:
```bash
cd backend
docker build -f discovery-service/Dockerfile -t edumind/discovery-service:latest .
```

### 2. Service cannot connect to database

**Reason:** Service starts before database is ready.

**Solution:** Docker Compose has `depends_on` with healthcheck. Check:
```bash
docker compose ps
# Ensure postgres-auth / postgres-lms-core has status "healthy"
```

### 3. Service cannot register with Eureka

**Reason:** 
- Discovery service has not started
- Network configuration is incorrect
- Hostname cannot be resolved

**Solution:**
```bash
# Check discovery-service is running
docker compose logs discovery-service

# Check network
docker network inspect backend_edumind-network

# Check Eureka dashboard
curl http://localhost:8761/eureka/apps
```

### 4. Port is already in use

**Reason:** Port is already occupied by another process.

**Solution:**
```bash
# Find process using port
lsof -i :8080  # macOS/Linux
netstat -ano | findstr :8080  # Windows

# Or change port in .env
API_GATEWAY_PORT=8082
```

### 5. Out of memory when build

**Reason:** Maven build needs a lot of memory.

**Solution:** Increase Docker memory limit or build with less memory:
```bash
docker build --memory=2g -f discovery-service/Dockerfile -t edumind/discovery-service:latest .
```

### 6. JAR file not found

**Reason:** Build path is incorrect or JAR is not created.

**Solution:**
```bash
# Check if JAR is created
ls -la discovery-service/target/*.jar

# Build again with verbose
docker build --progress=plain -f discovery-service/Dockerfile -t edumind/discovery-service:latest .
```

### 7. Health check fails

**Reason:** Service has not started yet or health endpoint is not available.

**Solution:**
```bash
# Check logs
docker compose logs auth-service

# Test health endpoint manually
docker exec edumind-auth-service wget -O- http://localhost:8081/actuator/health

# Increase start_period in docker-compose.yml
healthcheck:
  start_period: 120s  # Increase from 60s to 120s
```

## 📝 Best Practices

1. **Always use multi-stage build** with `mvn dependency:go-offline` layer to improve build speed and caching.
2. **Use .dockerignore** to remove unnecessary files.
3. **Set health checks** for all services.
4. **Use environment variables** instead of hardcoded values.
5. **Tag images with version** instead of using `latest`:
   ```bash
   docker build -t edumind/discovery-service:1.0.0 .
   ```
6. **Do not commit .env file** to Git.
7. **Use docker compose** for development/testing environments.

## 🔄 Development Workflow

### Suggested Workflow:

1. **Development:**
   ```bash
   # Start infrastructure (DB, Redis, Discovery)
   docker compose up -d postgres-auth postgres-lms-core redis discovery-service
   
   # Run services locally with IDE (IntelliJ/VS Code)
   # Services connect to Docker containers
   ```

2. **Testing Docker images:**
   ```bash
   # Build images
   docker compose build
   
   # Start all
   docker compose up -d
   
   # Test APIs
   curl http://localhost:8080/actuator/health
   ```

3. **Production:**
   ```bash
   # Build with production tags
   docker build -t edumind/discovery-service:v1.0.0 .
   
   # Push to registry
   docker push edumind/discovery-service:v1.0.0
   ```

## 📚 Reference Documentation

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Spring Boot Docker Guide](https://spring.io/guides/gs/spring-boot-docker/)
- [Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)

---

**Note:** This is a basic guide. For production, additional:
- Security scanning (Trivy, Snyk, etc.)
- Image signing (Docker Content Trust, etc.)
- Secret management (Vault, AWS Secrets Manager, etc.)
- Monitoring and logging (Prometheus, ELK, etc.)
- CI/CD pipeline (GitHub Actions, GitLab CI, etc.)

