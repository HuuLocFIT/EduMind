# 🧠 EduMind Platform - Backend

> **Architecture:** Microservices + Modular Monolith
> **Framework:** Spring Boot 3.5.6 + Spring Cloud 2025.0.0
> **Language:** Java 21 (LTS)

Welcome to the **EduMind** backend repository. This project implements a scalable, secure, and high-performance microservices architecture for an AI-powered learning platform.

---

## 🛠 Technology Stack

We use a modern Java ecosystem designed for enterprise-grade scalability.

| Domain | Technnology | version |
| :--- | :--- | :--- |
| **Framework** | Spring Boot | v3.5.6 |
| **Cloud** | Spring Cloud | v2025.0.0 |
| **Discovery** | Netflix Eureka | - |
| **Gateway** | Spring Cloud Gateway | - |
| **Database** | PostgreSQL | v16 |
| **Caching** | Redis | v7 |
| **Security** | Spring Security + JWT | - |
| **Migration** | Flyway | v10.x |
| **Build** | Maven | 3.6+ |

---

## 🏗 Architecture

The system follows a hybrid microservices architecture:

1.  **Microservices**: For infrastructure/cross-cutting concerns (Gateway, Auth, Discovery).
2.  **Modular Monolith (`lms-core-service`)**: Hosts core business logic to **minimize deployment costs** and operational overhead. It enforces strict isolation via **separate database schemas** (course, payment, gamification), ensuring easier extraction into independent microservices when scaling is required.

### Service Landscape

| Service | Port | Description |
| :--- | :--- | :--- |
| **Discovery Service** | `8761` | Service Registry (Eureka). |
| **API Gateway** | `8080` | Entry point, Rate Limiting, Routing. |
| **Auth Service** | `8081` | Identity, OAuth2, 2FA, JWT issuance. |
| **LMS Core Service** | `8082`* | Core business logic (Course, Payment, Teacher). (*Default port, check config) |

*(Note: `common-lib` provides shared DTOs, utilities, and security configuration across all services)*

---

## 📦 Project Structure

```text
backend/
├── api-gateway/            # 🚪 System Entry Point (Routing, Rate Limiting)
├── auth-service/           # 🔐 Identity & Access Management
├── discovery-service/      # 🗺️ Service Registry (Eureka)
├── lms-core-service/       # 🧠 Core Business Logic (Modular Monolith)
├── common-lib/             # 📚 Shared Code (DTOs, Exceptions, Utils)
├── scripts/                # 🛠️ Utility Scripts (Key generation, etc)
├── docker-compose.yml      # 🐳 Infrastructure (Postgres, Redis)
└── pom.xml                 # 📄 Parent POM
```

---

## 🚀 Getting Started

### Prerequisites

- **Java**: JDK 21+
- **Docker**: For running databases (PostgreSQL, Redis)
- **Maven**: 3.6+

### 1. Start Infrastructure

Use Docker Compose to spin up the required databases:

```bash
cd backend
docker-compose up -d
# Starts: PostgreSQL (5432) & Redis (6379)
```

### 2. Configure Environment

Create a `.env` file in the `backend/` root. You can start by copying `.env.example` if available, or populate it with required keys (Database credentials, JWT secrets, OAuth keys).

### 3. Build the Platform

Build common libraries and all services:

```bash
mvn clean install
```

### 4. Run Services

Start them in the following order to ensure dependencies are met:

1.  **Discovery Service**
    ```bash
    cd discovery-service && mvn spring-boot:run
    ```
2.  **Auth Service**
    ```bash
    cd auth-service && mvn spring-boot:run
    ```
3.  **LMS Core Service**
    ```bash
    cd lms-core-service && mvn spring-boot:run
    ```
4.  **API Gateway**
    ```bash
    cd api-gateway && mvn spring-boot:run
    ```

---

## 🔒 Security & Standards

- **Authentication**: Stateless JWT Authentication.
- **Authorization**: Role-Based Access Control (RBAC).
- **Encryption**: Sensitive data encrypted at rest using `EncryptionService`.
- **Communication**: Inter-service communication via Feign Clients (REST).
- **API Standards**:
    - Unified `ApiResponse<T>` wrapper.
    - Global Exception Handling (`common-lib`).

---

## 🛠 Development Utilities

### Key Generation
Generate secure keys for JWT and Encryption (never use these in prod):

```bash
./scripts/generate-all-service-keys.sh
```

### Database Operations (Flyway CLI)

We have configured the `flyway-maven-plugin` to allow direct CLI control. Ensure your `.env` variables are loaded before running these commands.

#### 1. Migrate (Apply pending changes)
```bash
# Auth Service
cd auth-service
mvn flyway:migrate

# LMS Core Service
cd lms-core-service
mvn flyway:migrate
```

#### 2. Clean / Reset (Drop all tables)
**⚠️ Destructive Operation:** Drops the configured schemas to give you a clean slate.

```bash
mvn flyway:clean
```

#### 3. Info (Status Check)
See which migrations are applied, pending, or failed.

```bash
mvn flyway:info
```

#### 4. Repair (Fix Metadata)
Use this if a migration failed and you've manually fixed the SQL, but Flyway is complaining about checksums or failed versions.

```bash
mvn flyway:repair
```

#### 5. Validate (Check Integrity)
Validates applied migrations against local files.

```bash
mvn flyway:validate
```

---

#### 💡 Troubleshooting
If you see connection errors:
1. Ensure `.env` is loaded (`source ../.env`).
2. Verify Docker containers are running (`docker-compose ps`).
3. Check defaults in `pom.xml` match your local DB credentials.

---

## 📚 API Guidelines

All requests should be routed through the **API Gateway** (`http://localhost:8080`).

- **Auth**: `/api/auth/**` → Auth Service
- **LMS**: `/api/lms/**` (example) → LMS Core Service

Check `api-gateway/src/main/resources/application.yml` for exact routing rules.
