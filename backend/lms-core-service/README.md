## LMS Core Service

Core Learning Management System (LMS) business logic for the EduMind platform, implemented as a **modular monolith**.  
This service owns course, assessment, gamification, payment, and notification domains and exposes REST APIs consumed by the frontend applications and other backend services.

### Table of Contents

- **[Overview](#overview)**
- **[Architecture & Modules](#architecture--modules)**
- **[Features](#features)**
- **[Prerequisites](#prerequisites)**
- **[Setup Instructions](#setup-instructions)**
- **[Configuration](#configuration)**
- **[Database Migrations](#database-migrations)**
- **[Running the Service](#running-the-service)**
- **[API Overview](#api-overview)**
- **[Payments](#payments)**  
- **[Logging & Monitoring](#logging--monitoring)**
- **[Testing](#testing)**
- **[Troubleshooting](#troubleshooting)**

## Overview

The **LMS Core Service** is a Spring Boot microservice responsible for the main EduMind teaching and learning workflows.

**Currently implemented (MVP):**

- **Course lifecycle** (categories, courses, sections, lessons, wishlist, reviews)
- **Student enrollment & access control** (via course/enrollment controllers)
- **E‑commerce & payments** (cart, checkout, orders, earnings, invoices, webhooks)

**Planned / in progress:**

- **Assessments & quizzes**
- **Student progress tracking beyond basic lesson progress**
- **Gamification** (badges, achievements, points)
- **Richer notifications & cross‑service integrations**

It is designed as a **modular monolith**, grouping functionality by domain (`course`, `assessment`, `gamification`, `payment`, `notification`) while still running as a single deployable Spring Boot service.

## Architecture & Modules

Source root:

```text
src/main/java/com/edumind/lms
  ├─ config/           # Shared configuration (security, Jackson, Feign, etc.)
  ├─ modules/
  │   ├─ course/       # Course entities, services, controllers
  │   ├─ assessment/   # Quizzes, questions, submissions, grading
  │   ├─ gamification/ # Badges, points, achievements
  │   ├─ payment/      # Cart, checkout, orders, earnings, invoices
  │   └─ notification/ # Domain events & notifications (where applicable)
  └─ shared/           # Shared DTOs, mappers, utilities
```

Database schemas are separated per module and managed by Flyway:

- **Schemas:** `course`, `assessment`, `gamification`, `payment`, `notification`, `public`
- **Migrations path:** `src/main/resources/db/migration`

This service:

- Uses **PostgreSQL** for persistence
- Uses **Flyway** for schema migrations
- Registers with **Eureka Discovery Service**
- Validates **JWT** tokens issued by the Auth Service
- Integrates with **Cloudinary** for file uploads (e.g., course assets, documents)

## Features

### Implemented (Current Progress)

- **Course Management**
  - Course catalog with categories, sections, lessons
  - Course creation and updates (teacher/admin)
  - Publish / unpublish courses
  - Course reviews and wishlists
  - Pricing and effective price calculation in coordination with the payment module

- **Enrollment & Access**
  - Enrollment flows driven by successful orders
  - Controllers for enrollments and lesson progress
  - Validation for unpublished / unavailable courses

- **Payments & Orders**
  - Cart management (add/remove items, preview checkout)
  - Checkout flow and order creation
  - Earnings tracking for instructors
  - Invoices (entities, services, controllers)
  - Webhook handling for payment gateway callbacks
  - Pluggable payment gateways with a fully working **mock gateway** and initial PayPal/SePay integration classes

- **Operational**
  - **Service Discovery** via Eureka
  - **Database migrations** via Flyway
  - **Structured logging** with rolling log files
  - **Health, info, and metrics** via Spring Boot Actuator

### Planned / In Progress

- **Assessments**
  - Question banks, quizzes, assignments and submission workflows
  - Automated scoring and result history

- **Gamification**
  - Badges and achievements for milestones
  - Points, leaderboards, and progress indicators

- **Notifications & Integrations**
  - Richer domain events for enrollments, completions, payments
  - Deeper integrations with other services via Feign clients and messaging

## Prerequisites

Before running the LMS Core Service, ensure you have:

- **Java 21** or higher
- **Maven 3.6+**
- **PostgreSQL 16+**
- **Eureka Discovery Service** (must be running)
- **Auth Service** and **API Gateway** (recommended for end‑to‑end flows)
- **Environment variables** configured (see [Configuration](#configuration))

### Optional Dependencies

- **Docker & Docker Compose** – for running PostgreSQL quickly
- **Cloudinary Account** – for handling file uploads

## Setup Instructions

### Step 1: Navigate to the Module

```bash
cd backend/lms-core-service
```

### Step 2: Set Up the Database

You have two options:

#### Option A: Using Docker / Docker Compose (Recommended)

From the `backend` directory you can extend `docker-compose.yml` to add a dedicated core DB, or run PostgreSQL manually.  
The service expects (by default):

- **Host:** `localhost`
- **Port:** `5433`
- **Database:** `edumind_core`
- **User:** `postgres`
- **Password:** `postgres` (change via env var)

Example manual setup:

```sql
CREATE DATABASE edumind_core;
```

> Flyway is configured to **create schemas automatically** for  
> `course, assessment, gamification, payment, notification, public`.

#### Option B: Existing PostgreSQL Instance

- Ensure PostgreSQL is running and reachable on the configured port.
- Ensure a database named `edumind_core` (or custom name) exists.
- Provide connection details via environment variables (see below).

### Step 3: Build the Project

From the `backend/lms-core-service` directory:

```bash
mvn clean install
```

Or build all backend services from the `backend` root:

```bash
cd backend
mvn clean install
```

### Step 4: Configure Environment Variables

You can create a `.env` file in the `backend` directory or export variables in your shell:

```bash
# Database Configuration
export LMS_CORE_DB_URL="jdbc:postgresql://localhost:5433/edumind_core"
export LMS_CORE_DB_USERNAME="postgres"
export LMS_CORE_DB_PASSWORD="postgres"
export LMS_CORE_DB_DRIVER="org.postgresql.Driver"

# Service Port (default: 8083)
export LMS_CORE_SERVICE_PORT="8083"

# Eureka Discovery Service
export EUREKA_DEFAULT_ZONE="http://localhost:8761/eureka/"

# JWT Configuration (validation only)
export JWT_SECRET="your-shared-jwt-secret-min-32-chars"
export JWT_EXPIRATION="900000"        # 15 minutes in milliseconds

# Cloudinary Configuration
export CLOUDINARY_CLOUD_NAME="your-cloud-name"
export CLOUDINARY_API_KEY="your-api-key"
export CLOUDINARY_API_SECRET="your-api-secret"

# Encryption Key (for sensitive fields)
export LMS_CORE_SERVICE_ENCRYPTION_KEY="your-32-char-encryption-key"

# Review Auto-Approval (if used by modules)
export REVIEW_AUTO_APPROVE_ENABLED="true"
export REVIEW_AUTO_APPROVE_THRESHOLD="0"

# Payment Gateway Configuration
export PAYMENT_GATEWAY="mock"         # mock | paypal | sepay

# PayPal (future/optional)
export PAYPAL_CLIENT_ID=""
export PAYPAL_CLIENT_SECRET=""
export PAYPAL_MODE="sandbox"          # sandbox | live
export PAYPAL_WEBHOOK_ID=""

# SePay (future/optional)
export SEPAY_API_KEY=""
export SEPAY_MERCHANT_ID=""
export SEPAY_SECRET_KEY=""
export SEPAY_BASE_URL="https://my.sepay.vn"
export SEPAY_WEBHOOK_SECRET=""
```

> **Important:**  
> - `LMS_CORE_SERVICE_ENCRYPTION_KEY` must be **exactly 32 characters** for AES‑256.  
> - `JWT_SECRET` must be consistent with the Auth Service and long enough for HS256.

## Configuration

### Application Configuration

Main configuration file:

```text
src/main/resources/application.yml
```

Key sections:

- **`server`**
  - Port configuration (default: `8083`)
  - Context path (`/`)

- **`spring.datasource`**
  - PostgreSQL connection (`LMS_CORE_DB_URL`, `LMS_CORE_DB_USERNAME`, `LMS_CORE_DB_PASSWORD`)
  - HikariCP pool settings
  - Schemas: `course,assessment,gamification,payment,notification,public`

- **`spring.jpa`**
  - `ddl-auto: validate` (schema is managed by Flyway)
  - PostgreSQL dialect and performance‑oriented Hibernate settings

- **`spring.flyway`**
  - Migrations enabled with `baseline-on-migrate: true`
  - Locations: `classpath:db/migration`
  - Schemas: `course,assessment,gamification,payment,notification,public`

- **`eureka`**
  - Configuration for Eureka client registration and discovery.

- **`jwt`**
  - `secret` and `expiration` (for validating incoming tokens).

- **`cloudinary`**
  - Credentials for file upload integration.

- **`payment`**
  - Gateway selection (`mock | paypal | sepay`)
  - Per‑gateway configuration blocks.

- **`logging` / `management`**
  - Log levels, patterns, log file location
  - Exposed Actuator endpoints (`health`, `info`, `metrics`)

### Database Operations (Flyway CLI)

The `flyway-maven-plugin` is configured in `pom.xml` for direct CLI usage.

- **Create / Adjust Migrations**  
  Add SQL files under:

  ```text
  src/main/resources/db/migration
  ```

- **Migrate Database**

  ```bash
  mvn flyway:migrate
  ```

- **Clean Database (Dangerous – resets schemas)**

  ```bash
  mvn flyway:clean
  ```

- **Info / Status**

  ```bash
  mvn flyway:info
  ```

## Database Migrations

Migrations are located in:

```text
src/main/resources/db/migration/
```

They cover:

- Core course / content tables (`course` schema)
- Assessment entities (`assessment` schema)
- Gamification entities (`gamification` schema)
- Payment domain (cart, orders, earnings, invoices) in the `payment` schema
- Shared lookup and support tables (`public` or other schemas as needed)

Migrations run **automatically on application startup**.  
Check logs for `"Flyway migration completed successfully"` to confirm.

## Running the Service

### Prerequisites Check

Before starting:

1. **PostgreSQL** is running and accessible on the configured port.
2. **Database `edumind_core`** exists.
3. **Eureka Discovery Service** is running on port `8761`.
4. All required **environment variables** are set.

### Option 1: Using Maven

From `backend/lms-core-service`:

```bash
mvn spring-boot:run
```

### Option 2: Using JAR

```bash
# Build
mvn clean package

# Run
java -jar target/lms-core-service-1.0.0-SNAPSHOT.jar
```

### Option 3: Using IDE

Run the `LmsCoreServiceApplication` main class from your IDE.

### Verify the Service is Running

1. **Check logs** – you should see lines similar to:

   ```text
   🚀 Starting LMS Core Service...
   ✅ LMS Core Service started successfully on port 8083
   ```

2. **Health Endpoint**

   ```bash
   curl http://localhost:8083/actuator/health
   ```

   Expected: `{"status":"UP"}`

3. **Service Info**

   ```bash
   curl http://localhost:8083/actuator/info
   ```

4. **Eureka Dashboard**

   - Open `http://localhost:8761`
   - Look for `LMS-CORE-SERVICE` in the registered services list (depends on configuration)

## API Overview

The LMS Core Service exposes REST APIs (JSON) grouped by domain.  
Common patterns:

- **Base path:** typically rooted at `/api/...` (per module)
- **Authentication:** `Authorization: Bearer {accessToken}` (JWT issued by Auth Service)

High‑level examples (exact paths may vary by implementation):

- **Course**
  - `GET /courses` – list courses with filtering and pagination
  - `GET /courses/{id}` – course details
  - `POST /courses` – create course (teacher/admin)
  - `PUT /courses/{id}` – update course
  - `PATCH /courses/{id}/publish` – publish/unpublish course

- **Enrollment**
  - `GET /me/enrollments` – current user enrollments
  - `GET /courses/{id}/content` – course content for enrolled students

- **Assessments**
  - `GET /courses/{id}/assessments` – assessments for a course
  - `POST /assessments/{id}/submit` – submit answers
  - `GET /me/assessment-results` – view results/history

- **Payment**
  - `GET /cart` / `POST /cart/items` / `DELETE /cart/items/{id}`
  - `POST /checkout` – start / complete checkout
  - `GET /orders` / `GET /orders/{id}`
  - `GET /earnings` – teacher/admin earnings dashboards

Refer to the controllers under `com.edumind.lms.modules.*.controller` for exact contracts.

## Payments

The payment module is designed to abstract payment gateways:

- **Mock Gateway (`PAYMENT_GATEWAY=mock`)**
  - Used for development and testing
  - Supports configurable delay and success rate:
    - `payment.mock.delay-ms`
    - `payment.mock.success-rate`
  - Special card number suffixes (documented in code) can force success/failure.

- **PayPal (`PAYMENT_GATEWAY=paypal`) – planned**
  - Uses `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE`, `PAYPAL_WEBHOOK_ID`.

- **SePay (`PAYMENT_GATEWAY=sepay`) – planned**
  - Uses `SEPAY_API_KEY`, `SEPAY_MERCHANT_ID`, `SEPAY_SECRET_KEY`, `SEPAY_BASE_URL`, `SEPAY_WEBHOOK_SECRET`.

> For known payment module risks and ongoing refactors, see `PAYMENT_BUGS.md`.

## Logging & Monitoring

### Logs

Logs are written to:

```text
logs/lms-core-service.log
```

To tail logs in real time:

```bash
cd backend/lms-core-service
tail -f logs/lms-core-service.log
```

Log configuration is controlled by:

- `src/main/resources/application.yml`
- `src/main/resources/logback-spring.xml`

### Health & Metrics

Using Spring Boot Actuator:

```bash
curl http://localhost:8083/actuator/health
curl http://localhost:8083/actuator/info
curl http://localhost:8083/actuator/metrics
```

## Testing

### Unit & Integration Tests

Tests are located under:

```text
src/test/java/com/edumind/lms
```

Test configuration:

- `src/test/resources/application-test.yml`
- `src/test/resources/schema.sql`

Run tests:

```bash
mvn test
```

Payment module tests (cart, checkout, earnings, etc.) are covered with controller, service, and integration tests.  
Check Surefire reports under `target/surefire-reports` for detailed output.

## Troubleshooting

### 1. Service fails to start – Database connection error

**Symptom (example):**

```text
org.postgresql.util.PSQLException: Connection refused
```

**Checklist:**

- Verify PostgreSQL is running and listening on the configured host/port.
- Confirm `LMS_CORE_DB_URL`, `LMS_CORE_DB_USERNAME`, `LMS_CORE_DB_PASSWORD` are correct.
- Ensure database `edumind_core` exists.

### 2. Flyway migration fails

**Symptom (example):**

```text
org.flywaydb.core.api.FlywayException: Validate failed
```

**Checklist:**

- Check that the target database is empty or compatible with existing migrations.
- Review SQL migration files for syntax errors.
- Use `mvn flyway:info` to inspect the migration history.

### 3. JWT token validation fails

**Symptom (example):**

```text
io.jsonwebtoken.security.SignatureException: JWT signature does not match
```

**Checklist:**

- Ensure `JWT_SECRET` matches the secret used by the Auth Service.
- Ensure the token has not expired (`JWT_EXPIRATION` alignment).

### 4. Service not registered in Eureka

**Symptom (example):**

```text
com.netflix.discovery.shared.transport.TransportException: Cannot execute request on any known server
```

**Checklist:**

- Verify Eureka Discovery Service is running on `http://localhost:8761`.
- Check `EUREKA_DEFAULT_ZONE` environment variable.
- Confirm there are no network/firewall restrictions.

### 5. File upload issues (Cloudinary)

**Symptom (example):**

```text
Invalid cloud_name or api_key
```

**Checklist:**

- Verify `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- Ensure the Cloudinary account is active and not over quota.

### 6. Payment anomalies

- Review `PAYMENT_BUGS.md` for known issues and mitigation steps, especially around:
  - Order creation with invalid/removed courses
  - Enrollment creation after successful payments
  - Long‑running payment gateway calls inside DB transactions

## Additional Resources

- **Spring Boot:** `https://spring.io/projects/spring-boot`
- **Spring Data JPA:** `https://spring.io/projects/spring-data-jpa`
- **Spring Security:** `https://spring.io/projects/spring-security`
- **Spring Cloud / Eureka:** `https://spring.io/projects/spring-cloud`
- **Flyway:** `https://flywaydb.org/documentation/`
- **PostgreSQL:** `https://www.postgresql.org/docs/`

## Support

For questions or issues, please contact the EduMind backend team or open an issue in the project repository.


