# EduMind Platform - C4 Model: Component Diagrams

> **Level 3 - Component Diagrams**
> Zooms into individual containers to show the major components and their interactions.

---

## Auth Service Components

```mermaid
flowchart TB
    subgraph AuthService["Auth Service"]
        subgraph Controllers["REST Controllers"]
            AuthCtrl["Auth Controller<br/>Login, Register, Refresh"]
            UserCtrl["User Controller<br/>Profile, Update"]
            AdminCtrl["Admin Controller<br/>User CRUD, Roles"]
            TwoFaCtrl["2FA Controller<br/>Setup, Verify"]
            UploadCtrl["Upload Controller<br/>Profile Pictures"]
        end

        subgraph Services["Business Logic"]
            AuthSvc["Auth Service<br/>JWT, Password"]
            UserSvc["User Service<br/>User CRUD"]
            TwoFaSvc["TwoFactor Service<br/>TOTP, Backup Codes"]
            EmailSvc["Email Service<br/>Verification, Reset"]
            OAuth2["OAuth2 Handler<br/>Google OAuth2"]
        end

        subgraph Security["Security Layer"]
            JWT["JWT Provider<br/>Token Gen/Validation"]
            Filter["Security Filter<br/>Auth/Authz"]
        end

        subgraph Repos["Data Access"]
            UserRepo["User Repository"]
            TokenRepo["Token Repository"]
        end
    end

    subgraph External["External Systems"]
        AuthDB[(Auth Database<br/>PostgreSQL)]
        Cloudinary["Cloudinary<br/>Media CDN"]
        Gmail["Gmail SMTP<br/>Email"]
        Google["Google OAuth2"]
    end

    AuthCtrl --> AuthSvc
    AuthCtrl --> JWT
    UserCtrl --> UserSvc
    AdminCtrl --> UserSvc
    TwoFaCtrl --> TwoFaSvc
    UploadCtrl --> Cloudinary

    AuthSvc --> UserRepo
    AuthSvc --> TokenRepo
    AuthSvc --> EmailSvc
    OAuth2 --> Google
    OAuth2 --> UserSvc

    UserRepo --> AuthDB
    TokenRepo --> AuthDB
    EmailSvc --> Gmail
```

### Key Components

| Component | Responsibility |
|-----------|----------------|
| **Auth Controller** | Handles login, registration, token refresh, and logout. |
| **User Controller** | Profile retrieval and updates. |
| **Admin Controller** | User management, role assignment, application review. |
| **2FA Controller** | Two-factor authentication setup and verification. |
| **JWT Provider** | Generates and validates JWT access/refresh tokens. |
| **OAuth2 Handler** | Manages Google OAuth2 login flow and user linking. |
| **Email Service** | Sends verification, password reset, and notification emails. |

---

## LMS Core Service Components

```mermaid
flowchart TB
    subgraph LMSCore["LMS Core Service (Modular Monolith)"]
        subgraph Modules["Business Modules"]
            CourseM["Course Module<br/>course schema"]
            EnrollM["Enrollment Module<br/>course schema"]
            ReviewM["Review Module<br/>course schema"]
            PaymentM["Payment Module<br/>payment schema"]
            GamifyM["Gamification Module<br/>gamification schema"]
        end

        subgraph Controllers["REST Controllers"]
            CourseCtrl["Course Controller<br/>/courses/**"]
            CartCtrl["Cart Controller<br/>/cart/**"]
            CheckoutCtrl["Checkout Controller<br/>/checkout/**"]
            OrderCtrl["Order Controller<br/>/orders/**"]
            InvoiceCtrl["Invoice Controller<br/>/invoices/**"]
            EarningCtrl["Earning Controller<br/>/teacher/earnings/**"]
            ReviewCtrl["Review Controller<br/>/reviews/**"]
            WebhookCtrl["Webhook Controller<br/>/payments/webhook/**"]
        end

        subgraph Integrations["Integrations"]
            PayGateway["Payment Gateway Adapter<br/>Mock / PayPal / SePay"]
            InvoiceGen["Invoice Generator<br/>iText PDF"]
            AuthClient["Auth Client<br/>Feign Client"]
        end

        subgraph Repos["Data Access"]
            CourseRepo["Course Repository<br/>course.* tables"]
            PaymentRepo["Payment Repository<br/>payment.* tables"]
        end
    end

    subgraph External["External Systems"]
        LMSDB[(LMS Database<br/>PostgreSQL Multi-Schema)]
        PaymentGW["Payment Gateway<br/>PayPal / SePay"]
        Cloud["Cloudinary<br/>Media CDN"]
    end

    CourseCtrl --> CourseM
    CartCtrl --> PaymentM
    CheckoutCtrl --> PaymentM
    OrderCtrl --> PaymentM
    InvoiceCtrl --> InvoiceGen
    EarningCtrl --> PaymentM
    ReviewCtrl --> ReviewM
    WebhookCtrl --> PayGateway

    PaymentM --> PayGateway
    PaymentM --> EnrollM
    PayGateway --> PaymentGW

    CourseM --> CourseRepo
    PaymentM --> PaymentRepo
    CourseRepo --> LMSDB
    PaymentRepo --> LMSDB
    CourseM --> Cloud
```

### Key Modules

| Module | Database Schema | Responsibility |
|--------|-----------------|----------------|
| **Course Module** | `course` | CRUD for Courses, Sections, Lessons, Categories. |
| **Enrollment Module** | `course` | Student enrollments, progress tracking, completion. |
| **Review Module** | `course` | Course reviews, ratings, instructor replies. |
| **Payment Module** | `payment` | Shopping cart, checkout, orders, invoices, instructor earnings. |
| **Gamification Module** | `gamification` | (Future) Badges, points, leaderboards. |

### Key Design Pattern: Payment Gateway Adapter

The payment system uses the **Strategy Pattern** to support multiple gateways:
- **MockGateway**: For local development and testing.
- **PayPalGateway**: For production payments (configurable).
- **SePayGateway**: For Vietnam-specific payments (configurable).

---

## AI Service Components (🚧 Planned)

```mermaid
flowchart TB
    subgraph AIService["🤖 AI Service (Planned)"]
        subgraph Controllers["REST Controllers"]
            ChatCtrl["Chat Controller<br/>/ai/chat/**"]
            RecommendCtrl["Recommendation Controller<br/>/ai/recommend/**"]
            ContentCtrl["Content Generation Controller<br/>/ai/generate/**"]
        end

        subgraph Core["Core Services"]
            RAGEngine["RAG Engine<br/>LangChain + Vector DB"]
            LLMAdapter["LLM Adapter<br/>OpenAI / Gemini / Local"]
            EmbeddingSvc["Embedding Service<br/>Text Embeddings"]
            PromptMgr["Prompt Manager<br/>Template Engine"]
        end

        subgraph DataAccess["Data Access"]
            VectorDB[(Vector Database<br/>Pinecone / Qdrant)]
            Cache[(Redis Cache<br/>Response Caching)]
        end
    end

    subgraph External["External LLM Providers"]
        OpenAI["OpenAI API"]
        Gemini["Google Gemini"]
        LocalLLM["Local LLM<br/>Ollama"]
    end

    ChatCtrl --> RAGEngine
    RecommendCtrl --> RAGEngine
    ContentCtrl --> LLMAdapter

    RAGEngine --> EmbeddingSvc
    RAGEngine --> VectorDB
    RAGEngine --> LLMAdapter
    LLMAdapter --> PromptMgr

    LLMAdapter --> OpenAI
    LLMAdapter --> Gemini
    LLMAdapter -.-> LocalLLM

    RAGEngine --> Cache

    style AIService fill:#fffbe6,stroke:#ffc107
```

### Planned AI Features

| Feature | Description | Status |
|---------|-------------|--------|
| **AI Chat Assistant** | Conversational AI for learning assistance | 🚧 Planned |
| **Course Recommendations** | ML-powered personalized suggestions | 🚧 Planned |
| **Content Generation** | AI-assisted course descriptions, quizzes | 🚧 Planned |
| **RAG (Retrieval Augmented Generation)** | Context-aware answers from course content | 🚧 Planned |

---

## Navigation

-   [← Level 1: System Context](./c4-context.md)
-   [← Level 2: Container Diagram](./c4-container.md)
