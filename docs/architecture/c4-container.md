# EduMind Platform - C4 Model: Container Diagram

> **Level 2 - Container Diagram**
> Shows the high-level technology choices and how containers (applications/services) communicate.

---

## Diagram

```mermaid
flowchart TB
    subgraph Actors["Actors"]
        Student["👨‍🎓 Student"]
        Teacher["👨‍🏫 Teacher"]
        Admin["👨‍💼 Admin"]
    end

    subgraph Frontend["Frontend (Nx Monorepo)"]
        UserApp["User Application<br/>React 19, Vite, Zustand"]
        AdminApp["Admin Application<br/>Angular 20"]
    end

    subgraph Backend["Backend (Spring Boot)"]
        Gateway["API Gateway<br/>Spring Cloud Gateway<br/>:8080"]
        Discovery["Discovery Service<br/>Netflix Eureka<br/>:8761"]
        AuthSvc["Auth Service<br/>Spring Boot<br/>:8081"]
        LMSCore["LMS Core Service<br/>Modular Monolith<br/>:8083"]
    end

    subgraph DataStores["Data Stores"]
        AuthDB[(Auth DB<br/>PostgreSQL)]
        LMSDB[(LMS DB<br/>PostgreSQL)]
        Redis[(Redis<br/>Cache)]
    end

    subgraph External["External Systems"]
        Cloudinary["Cloudinary"]
        PaymentGW["Payment Gateway"]
        Email["Email Service"]
        OAuth["Google OAuth2"]
        Gemini["Google Gemini"]
        Groq["Groq (Whisper)"]
    end

    Student --> UserApp
    Teacher --> UserApp
    Admin --> AdminApp

    UserApp --> Gateway
    AdminApp --> Gateway

    Gateway --> Discovery
    Gateway --> AuthSvc
    Gateway --> LMSCore
    Gateway --> Redis

    AuthSvc --> AuthDB
    AuthSvc --> Email
    AuthSvc --> OAuth
    AuthSvc --> Cloudinary

    LMSCore --> LMSDB
    LMSCore --> Cloudinary
    LMSCore --> PaymentGW
    LMSCore --> Gemini
    LMSCore --> Groq

    AuthSvc --> Discovery
    LMSCore --> Discovery
```

---

## Container Descriptions

### Frontend Containers

| Container | Technology | Description |
|-----------|------------|-------------|
| **User Application** | React 19, Vite 7, Zustand, TanStack Query | Primary portal for Students and Teachers. Handles browsing, enrollment, learning, and course creation. |
| **Admin Application** | Angular 20, RxJS | Dashboard for Administrators. Manages users, teacher applications, categories, and content moderation. |

### Backend Containers

| Container | Technology | Port | Status | Description |
|-----------|------------|------|--------|-------------|
| **API Gateway** | Spring Cloud Gateway | 8080 | ✅ Active | Single entry point. Handles routing, CORS, rate limiting (Redis). |
| **Discovery Service** | Netflix Eureka | 8761 | ✅ Active | Service registry for dynamic service discovery. |
| **Auth Service** | Spring Boot 3.5 | 8081 | ✅ Active | Identity management: JWT, OAuth2, 2FA, RBAC, Email Verification. |
| **LMS Core Service** | Spring Boot 3.5 (Modular Monolith) | 8083 | ✅ Active | Core business logic as a modular monolith with schema-based isolation (active: `course`, `payment`, `ai`; reserved for future: `assessment`, `gamification`, `notification`). Calls Google Gemini for RAG chat/embeddings/summaries/quizzes and Groq for Whisper transcription. |

### Data Stores

| Store | Technology | Purpose |
|-------|------------|---------|
| **Auth Database** | PostgreSQL | Persists users, roles, tokens, teacher applications. |
| **LMS Database** | PostgreSQL + pgvector | Persists courses, sections, lessons, enrollments, orders, invoices, reviews, plus the `ai` schema's `lesson_embeddings` table (ivfflat index) and other AI module tables. |
| **Redis** | Redis 7 | Rate limiting counters, session caching. |

---

## Key Design Decisions

1.  **Modular Monolith for LMS Core**: Chosen to **minimize deployment costs** while using **separate database schemas** (active: course, payment, ai; reserved for future: assessment, gamification, notification) for future microservice extraction.
2.  **API Gateway for Centralization**: All client traffic enters through a single point, simplifying security (rate limiting, CORS) and observability.
3.  **Eureka for Discovery**: Enables dynamic scaling and failover without hardcoded service addresses.
