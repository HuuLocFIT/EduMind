# EduMind Platform - C4 Model: System Context

> **Level 1 - System Context Diagram**
> Shows the EduMind Platform as a black box and its relationships with users and external systems.

---

## Diagram

```mermaid
flowchart TB
    subgraph Actors["Actors"]
        Student["👨‍🎓 Student<br/>Learns courses, takes quizzes"]
        Teacher["👨‍🏫 Teacher<br/>Creates courses, earns revenue"]
        Admin["👨‍💼 Administrator<br/>Manages users, moderates content"]
    end

    EduMind["🧠 EduMind Platform<br/>AI-Powered Learning Platform"]

    subgraph External["External Systems"]
        Email["📧 Email Service<br/>Gmail SMTP"]
        OAuth["🔐 Google OAuth2<br/>Social Login"]
        Cloudinary["☁️ Cloudinary<br/>Media CDN"]
        Payment["💳 Payment Gateway<br/>PayPal / SePay"]
        Gemini["💎 Google Gemini<br/>Chat + Embeddings"]
        Groq["⚡ Groq<br/>Whisper API"]
    end

    Student --> EduMind
    Teacher --> EduMind
    Admin --> EduMind

    EduMind --> Email
    EduMind --> OAuth
    EduMind --> Cloudinary
    EduMind --> Payment
    EduMind --> Gemini
    EduMind --> Groq
```

---

## Actors

| Actor | Description |
|-------|-------------|
| **Student** | End-user who browses courses, enrolls, learns, and leaves reviews. |
| **Teacher** | Content creator who publishes courses, manages lessons, and earns revenue from sales. |
| **Administrator** | Platform operator who manages users, reviews teacher applications, and moderates content. |

---

## External Systems

| System | Technology | Purpose | Status |
|--------|------------|---------|--------|
| **Email Service** | Gmail SMTP | Sends verification, password reset, and notification emails. | ✅ Active |
| **Google OAuth2** | OpenID Connect | Provides social login for faster onboarding. | ✅ Active |
| **Cloudinary** | Cloud Media CDN | Stores profile pictures, course thumbnails, and lesson videos. | ✅ Active |
| **Payment Gateway** | PayPal / SePay | Processes course purchases and handles payouts to instructors. | ✅ Active |
| **Google Gemini** | `gemini-2.5-flash-lite` (chat), `gemini-embedding-001` (embeddings) | Powers RAG chat, lesson summaries, and quiz generation via Spring AI. | ✅ Active |
| **Groq Whisper API** | `whisper-large-v3-turbo` | Transcribes lesson audio/video into article content. | ✅ Active |

---

## Narrative

The EduMind Platform is an **AI-Powered Learning Management System (LMS)**. It provides a marketplace for instructors to sell courses and for students to purchase and learn.

**Key Interactions:**
1.  **Students** browse the course catalog, enroll (free or paid), consume video lessons, complete assessments, and leave reviews.
2.  **Teachers** apply for an instructor account, create course content (sections, lessons, quizzes), set pricing, and receive earnings from sales.
3.  **Administrators** review teacher applications, manage user accounts, and ensure platform integrity.
4.  The platform integrates with **external systems** for email delivery, social authentication, media hosting, and payment processing.
5.  An **AI module** within the LMS Core Service provides a RAG-based chat assistant for learning support, automatic lesson summaries, AI-generated quizzes, and lecture transcription (audio/video and YouTube) — powered by Google Gemini and Groq Whisper.
