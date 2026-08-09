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
| **AI / LLM** | Spring AI + Google Gemini | 1.1.2 |
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

*(Note: `common-lib` provides shared DTOs, utilities, and security configuration for `auth-service` and `lms-core-service`. `api-gateway` and `discovery-service` do not depend on it.)*

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
    - `ai` **(active)**: AI job logs, lesson embeddings, lesson summaries, generated quizzes, quiz attempts, AI rate limits
    - `assessment`, `gamification`, `notification` **(reserved only)**: schemas exist from the initial migration but have no corresponding Java modules/entities yet — not implemented

- **Redis (`redis`, port 6379)**  
  - Rate limiting for API Gateway (IP-based).  
  - Ready for future caching use cases.

- **pgvector (PostgreSQL extension)**  
  - Lives **inside the LMS Core database** (`edumind_core`, port 5433) — not a separate/external vector database or service.
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
    - `/api/auth/**`, `/api/auth/oauth2/**`, `/api/auth/login/oauth2/**` → `auth-service`
    - `/api/admin/**` (incl. `/api/admin/dashboard/**`, `/api/admin/enrollment-reports/**`) → `auth-service` (admin endpoints)
    - `/api/users/**`, `/api/upload/**`, `/api/teacher-application/**` → `auth-service`
    - `/api/courses/**`, `/api/categories/**`, `/api/sections/**`, `/api/lessons/**` → `lms-core-service`
    - `/api/enrollments/**`, `/api/certificates/**`, `/api/progress/**` → `lms-core-service`
    - `/api/reviews/**`, `/api/wishlist/**` → `lms-core-service`
    - `/api/cart/**`, `/api/checkout/**`, `/api/orders/**`, `/api/invoices/**` → `lms-core-service`
    - `/api/teacher/earnings/**`, `/api/teacher/analytics/**` → `lms-core-service`
    - `/api/payments/refunds/**`, `/api/payments/webhook/**`, `/api/instructors/payouts/**` → `lms-core-service`
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
    - **Not yet implemented**: `assessment`, `gamification`, `notification` — schemas reserved by migration, no Java module exists for them yet.
  - Follows strict layering per module: **Controller → Service → Repository → Entity**, with DTOs at the edges.
  - Integrates with:
    - Auth Service via OpenFeign (`UserClient`, etc.) and shared JWT validation.
    - Cloudinary for media uploads (course thumbnails, lesson assets, etc.).

### Shared Library: `common-lib`

`auth-service` and `lms-core-service` depend on `common-lib` for cross-cutting concerns (`api-gateway` and `discovery-service` do not):

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
  - Instructors submit a lesson video URL; the service resolves the audio source, sends it to Groq's Whisper API, and writes the transcript back as the lesson's article content.
  - **Supported sources (recommended → fallback):**
    - **Cloudinary (recommended, production path)** – the video's Cloudinary URL is rewritten to an MP3 delivery URL (`vc_none,ac_mp3,br_32k` transformation) and downloaded as a temp file. No CLI dependency; works reliably on any deployment target, including VPS.
    - **YouTube (supported, not recommended for VPS production)** – `yt-dlp --write-auto-sub` fetches existing auto-captions first (free, skips Groq entirely); if none are found, falls back to `yt-dlp -x --audio-format mp3` to download and transcribe the audio. Requires the `yt-dlp` binary on PATH and is subject to YouTube-side throttling/IP blocking, so it's better suited to local/dev use than a production VPS.
  - **Caption generation & upload**: when transcribing an audio file via Groq (not the YouTube-caption shortcut), the response is requested as `verbose_json` to get segment timestamps, which are converted into a WebVTT file and uploaded to Cloudinary (`captions/` folder, raw resource type). The resulting caption URL is persisted on the lesson (`LessonWriteService.updateCaptionUrl`) for use by the video player. Caption upload failure is non-fatal — the transcript itself is still saved.
  - **25 MB limit** enforced before sending to Groq.
  - Uses the same **async job pattern** (`202 Accepted` + `jobId`). Job states: `PENDING → PROCESSING → COMPLETED | FAILED | DELAYED`.
  - **`DELAYED`** state: a Groq HTTP 429 sets `nextRetryAt` (`now + ai.groq.retry-delay-seconds`, default 60 s) and job status `DELAYED`. `TranscriptionRetryScheduler` polls every 30 s for jobs past their `nextRetryAt` and re-queues them.
  - Configured via `GROQ_API_KEY` (optional — app starts without it, but transcription endpoints fail until it's set) and `YTDLP_PATH` (optional, defaults to `yt-dlp` on PATH).
  - Dedicated executor, isolated from the Gemini pool: `whisperTaskExecutor` (core=1, max=1 — deliberately serialized to respect Groq's rate limit; queue capacity via `WHISPER_QUEUE_CAPACITY`, default 10).

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


### Local Development

#### 1. Start Infrastructure (Docker Compose, built from source)

`docker-compose.yml` builds every service from local source and starts the **full stack** — not just databases:

```bash
cd backend
docker compose up -d
# Builds & starts: discovery-service, postgres-auth, postgres-lms-core, redis,
# auth-service, lms-core-service, api-gateway (all 7 services)
```

If you only want the databases/cache and plan to run app services natively via `mvn spring-boot:run`, start a subset instead:

```bash
docker compose up -d postgres-auth postgres-lms-core redis
```

#### 2. Configure Environment

Create a `.env` file in the `backend/` root. You can start by copying `.env.example` if available, or populate it with required keys (Database credentials, JWT secrets, OAuth keys).

#### 3. Build the Platform

Build common libraries and all services:

```bash
mvn clean install
```

#### 4. Run Services Natively (alternative to Docker Compose)

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

### Production

`docker-compose.prod.yml` runs the platform from **prebuilt images published to GitHub Container Registry (GHCR)** instead of building from source:

```bash
cd backend
IMAGE_TAG=<short-sha> docker compose -f docker-compose.prod.yml up -d
# IMAGE_TAG defaults to "latest" if not set
# Images: ghcr.io/<owner>/edumind-{discovery-service,auth-service,lms-core-service,api-gateway}:<tag>
```

Differences from the local compose file:
- Application services (`discovery-service`, `auth-service`, `lms-core-service`, `api-gateway`) pull GHCR images instead of building a `Dockerfile` from `context: .`.
- Every service (including the two Postgres containers and Redis) has a `healthcheck`, and app services `depends_on` their dependencies with `condition: service_healthy`.
- `postgres-auth-data`, `postgres-lms-core-data`, and `redis-data` are named Docker volumes, so data survives container restarts/recreation.
- `.env` still supplies secrets (`JWT_SECRET`, `GEMINI_API_KEY`, `GROQ_API_KEY`, Cloudinary/OAuth/mail credentials, etc.) — never bake secrets into the image.

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

- **Auth** (all handled by `auth-service`)
  - `/api/auth/**`, `/api/auth/oauth2/**`, `/api/auth/login/oauth2/**` – registration, login, refresh, OAuth2, profile, etc.
  - `/api/admin/**`, `/api/admin/dashboard/**`, `/api/admin/enrollment-reports/**` – admin-only user/role management & reporting
  - `/api/users/**` – user profile lookups
  - `/api/upload/**` – file upload (avatars, etc.)
  - `/api/teacher-application/**` – instructor application flow

- **LMS Core** (all handled by `lms-core-service`)  
  - `/api/courses/**`, `/api/categories/**`, `/api/sections/**`, `/api/lessons/**` – course catalog & content
  - `/api/enrollments/**`, `/api/certificates/**`, `/api/progress/**` – enrollments, lesson progress, certificates
  - `/api/reviews/**`, `/api/wishlist/**` – reviews/ratings and wishlist
  - `/api/cart/**`, `/api/checkout/**`, `/api/orders/**`, `/api/invoices/**` – cart, checkout, orders, invoices
  - `/api/teacher/earnings/**`, `/api/teacher/analytics/**` – instructor earnings & dashboard analytics
  - `/api/payments/refunds/**`, `/api/instructors/payouts/**`, `/api/payments/webhook/**` – refunds, payouts, payment gateway webhooks
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

