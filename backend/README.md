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
| **AI / LLM** | Spring AI + Google Gemini | 1.0.0 |
| **Vector DB** | pgvector (PostgreSQL extension) | 0.8+ |
| **Transcription** | Groq Whisper API (`whisper-large-v3-turbo`) | - |

---

## 🏗 Architecture

The system follows a hybrid microservices architecture:

1.  **Microservices**: For infrastructure/cross-cutting concerns (Gateway, Auth, Discovery).
2.  **Modular Monolith (`lms-core-service`)**: Hosts core business logic to **minimize deployment costs** and operational overhead. It enforces strict isolation via **separate database schemas** (`course`, `payment`, `ai`, `assessment`, `gamification`, `notification`), ensuring easier extraction into independent microservices when scaling is required.

### Service Landscape

| Service | Port | Description |
| :--- | :--- | :--- |
| **Discovery Service** | `8761` | Service Registry (Eureka). |
| **API Gateway** | `8080` | Entry point, Rate Limiting, Routing. |
| **Auth Service** | `8081` | Identity, OAuth2, 2FA, JWT issuance. |
| **LMS Core Service** | `8083` | Core business logic (Courses, Payments, AI, future Assessments/Gamification). |

*(Note: `common-lib` provides shared DTOs, utilities, and security configuration across all services)*

---

### Databases & Storage

The backend uses two PostgreSQL databases plus Redis:

- **Auth DB (`postgres-auth`, port 5432)**  
  - Database: `edumind_auth`  
  - Schema: `public`  
  - Purpose: users, roles, user-role mappings, refresh tokens, verification tokens, password reset tokens.

- **LMS Core DB (`postgres-lms-core`, port 5433)**  
  - Database: `edumind_core`  
  - Schemas:
    - `course`: courses, sections, lessons, enrollments, categories, reviews, wishlists
    - `payment`: cart items, orders, order items, invoices, earnings, payouts, refunds, platform config
    - `ai`: AI job logs, lesson embeddings, lesson summaries, generated quizzes, quiz attempts, AI rate limits
    - `assessment`, `gamification`, `notification`: reserved/partially prepared for future modules

- **Redis (`redis`, port 6379)**  
  - Rate limiting for API Gateway (IP-based).  
  - Ready for future caching use cases.

- **pgvector (PostgreSQL extension)**  
  - Used in `ai.lesson_embeddings` for semantic search / RAG.  
  - Vectors stored as `vector(768)` with ivfflat index (`vector_cosine_ops`).

### Service Responsibilities

- **Discovery Service (`discovery-service`)**
  - Eureka registry – all other services register here.
  - Gateway uses logical service names (`lb://AUTH-SERVICE`, `lb://LMS-CORE-SERVICE`).

- **API Gateway (`api-gateway`)**
  - Single public entry point on `8080`.
  - Responsibilities:
    - Routing to backend services via Eureka.
    - IP-based rate limiting using Redis.
    - CORS configuration for `localhost:3000` (React user app) and `localhost:4200` (Angular admin app).
    - Request/response logging and health checks.
  - Key routes (see `api-gateway/src/main/resources/application.yml` for exact rules):
    - `/api/auth/**` → `auth-service`
    - `/api/admin/**` → `auth-service` (admin endpoints)
    - `/api/courses/**` → `lms-core-service`
    - `/api/enrollments/**` → `lms-core-service`
    - `/api/payments/**` → `lms-core-service`
    - `/api/reviews/**` → `lms-core-service`
    - `/api/ai/**` → `lms-core-service`

- **Auth Service (`auth-service`)**
  - User registration, login, and profile management.
  - JWT issuance (access + refresh), token rotation on refresh.
  - OAuth2 login (e.g. Google) and 2FA (TOTP).
  - Email verification and password reset flows.
  - Encrypts sensitive data (2FA secrets, OAuth tokens) via `EncryptionService`.

- **LMS Core Service (`lms-core-service`)**
  - Modular monolith implementing the main LMS domains:
    - **Course module (`course` schema)**: courses, sections, lessons, enrollments, reviews, wishlists.
    - **Payment module (`payment` schema)**: cart, checkout, orders, invoices, earnings, payouts, refunds.
    - **AI module (`ai` schema)**: RAG chat, lesson embeddings, AI summaries, quiz generation & attempts, rate limits, Groq Whisper transcription.
    - **Future**: `assessment`, `gamification`, `notification` modules (schemas already reserved).
  - Follows strict layering per module: **Controller → Service → Repository → Entity**, with DTOs at the edges.
  - Integrates with:
    - Auth Service via OpenFeign (`UserClient`, etc.) and shared JWT validation.
    - Cloudinary for media uploads (course thumbnails, lesson assets, etc.).

### Shared Library: `common-lib`

All services depend on `common-lib` for cross-cutting concerns:

- **API contracts**
  - `ApiResponse<T>` – standard success wrapper.
  - `PagedResponse<T>` – pagination wrapper.
  - `ErrorResponse`, `MessageResponse` – standard error / message formats.

- **Error handling**
  - `GlobalExceptionHandler` (`@RestControllerAdvice`) – centralizes error mapping.
  - Shared exception types (`ResourceNotFoundException`, `BadRequestException`, etc.).

- **Security utilities**
  - `EncryptionService` – AES/GCM encryption; each service uses its own encryption key.
  - JWT helpers used consistently across services.

- **Constants & utilities**
  - `ErrorCode`, `ResponseStatus`, and other reusable constants.
  - Cloudinary integration helpers.

### AI & RAG Overview (Backend Perspective)

The AI feature set is implemented inside `lms-core-service` (under the `ai` module):

- **RAG Chat**
  - Lesson content is chunked and embedded using Google Gemini embeddings (`gemini-embedding-001`, 768 dimensions).
  - Queries embed into the same space and perform vector similarity search via pgvector cosine distance.
  - Confidence classification (HIGH / MEDIUM / GAP) based on distance thresholds; low-confidence queries are logged as knowledge gaps.
  - Supports both standard JSON responses and SSE streaming for token-by-token responses.

- **Lesson Summaries & Quizzes**
  - Summaries: async jobs generate structured summaries (text, key points, vocabulary) per lesson.
  - Quizzes: instructor-triggered quiz generation → multiple-choice questions with explanations; students only see options until submission.
  - All AI generation follows an **async job pattern**: `202 Accepted` with `jobId`, then `GET /api/ai/jobs/{id}` to poll status.

- **Groq Whisper Transcription**
  - Instructors submit a lesson video URL; the service downloads the audio and sends it to Groq's Whisper API to produce a transcript, which is written back as the lesson's article content.
  - **Supported sources:**
    - **Cloudinary** – URL rewritten to extract MP3 (`vc_none,ac_mp3,br_32k` transformation) and downloaded as a temp file.
    - **YouTube** – captions fetched first via `yt-dlp --write-auto-sub` (parsed from `.en.vtt`); falls back to `yt-dlp -x --audio-format mp3` if captions are absent.
  - **25 MB limit** enforced before sending to Groq.
  - Uses the same **async job pattern** (`202 Accepted` + `jobId`). Job states: `PENDING → PROCESSING → COMPLETED | FAILED | DELAYED`.
  - **`DELAYED`** state: Groq HTTP 429 triggers retry scheduling. `TranscriptionRetryScheduler` re-queues eligible jobs every 30 s.
  - Configured via `GROQ_API_KEY` (required) and `YTDLP_PATH` (optional, defaults to `yt-dlp` on PATH).
  - Thread pool isolated from the Gemini pool: `whisperTaskExecutor` (capacity controlled by `WHISPER_QUEUE_CAPACITY`).

- **AI Rate Limiting & Safety**
  - Per-user daily limits (e.g., RAG chat requests) backed by Postgres with atomic UPSERTs.
  - Async executors configured via `application.yml` + env vars (`AI_CORE_POOL_SIZE`, etc.).
  - AI configuration is conditional: `GEMINI_API_KEY` for Gemini features, `GROQ_API_KEY` for transcription; the app starts without either but the respective AI endpoints will not work.

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
- **yt-dlp** *(optional)*: Required only for YouTube-based Whisper transcription.
  ```bash
  brew install yt-dlp          # macOS
  pip install yt-dlp           # Linux/Windows (pip)
  ```

### 🐳 Docker Support

For detailed instructions on running the platform with Docker and Docker Compose, please refer to **[DOCKER.md](DOCKER.md)**.


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
- **Communication**: Inter-service communication via Feign Clients (REST) with JWT propagation via a shared `FeignConfig`.
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

- **Auth**  
  - `/api/auth/**` → Auth Service (registration, login, refresh, profile, etc.)
  - `/api/admin/**` → Auth Service (admin-only user/role management)

- **LMS Core** (all handled by `lms-core-service`)  
  - `/api/courses/**` – course, section, lesson, category, review, wishlist APIs  
  - `/api/enrollments/**` – enrollments, progress, access checks  
  - `/api/payments/**` – cart, checkout, orders, earnings, invoices, refunds, payouts  
  - `/api/reviews/**` – reviews/ratings where separated  
  - `/api/ai/**` – RAG chat, AI summaries, AI quiz generation & attempts, Groq Whisper transcription (`POST /api/ai/transcribe/lessons/{lessonId}`)

Exact routes and filters are defined in `api-gateway/src/main/resources/application.yml`. Always prefer going through the Gateway (even in local dev) to match production behavior.

---

## 🧪 Testing & Conventions (Backend-wide)

- **Testing**
  - Each service has its own test suite (`mvn test` from service root).
  - LMS Core uses Testcontainers for Postgres + pgvector in AI and repository tests.
  - Coverage reports can be generated with `mvn test jacoco:report` (where configured).

- **Coding Patterns**
  - Follow the standard Spring layering: **Controller → Service → Repository → Entity**.
  - Use DTOs for request/response, never expose JPA entities directly over the wire.
  - Always return `ApiResponse<T>` or `PagedResponse<T>` from controllers (via `common-lib`).
  - Throw exceptions and rely on `GlobalExceptionHandler` instead of manual error responses.

For deeper backend implementation details, see `backend/CLAUDE.md` and the per-service READMEs (especially `lms-core-service/README.md` and `api-gateway/README.md`).

