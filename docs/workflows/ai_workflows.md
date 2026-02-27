# AI Module Workflows

This document describes all AI-driven workflows implemented in the EduMind LMS system. The AI module provides four core features: **Lesson Embeddings**, **Lesson Summaries**, **Quiz Generation**, and **RAG Chat** — all built on Spring AI with Google Gemini.

---

## 1. AI Module Architecture Overview

```mermaid
graph TB
    subgraph API["API Layer — AiController (/api/ai/**)"]
        direction LR
        C1["/chat/courses/{id}"]
        C2["/quizzes/generate"]
        C3["/summaries/lesson/{id}"]
        C4["/jobs/{id}"]
        C5["/admin/reindex-embeddings"]
    end

    subgraph Services["Service Layer"]
        RagSvc["RagServiceImpl<br>(RAG Chat)"]
        QuizSvc["AiQuizServiceImpl<br>(Quiz Gen)"]
        SumSvc["AiSummaryServiceImpl<br>(Summary)"]
        EmbSvc["EmbeddingServiceImpl<br>(Embedding)"]
        JobSvc["AiJobService<br>(Job Tracking)"]
        RateLimit["RateLimitHelper<br>(Rate Limiting)"]
    end

    subgraph AsyncLayer["Async Processors (@Async)"]
        EmbProc["AsyncEmbeddingProcessor"]
        SumProc["AsyncSummaryProcessor"]
        QuizProc["AsyncQuizProcessor"]
    end

    subgraph Gemini["Google Gemini (Spring AI)"]
        ChatModel["gemini-2.5-flash-lite<br>temp=0.3, max=4096 tokens"]
        EmbModel["gemini-embedding-001<br>768 dimensions"]
    end

    subgraph DB["PostgreSQL — ai schema"]
        JobLog["ai.ai_job_logs"]
        Embeddings["ai.lesson_embeddings<br>(pgvector)"]
        Summaries["ai.lesson_summaries"]
        Quizzes["ai.generated_quizzes"]
        Attempts["ai.quiz_attempts"]
        RateDB["ai.ai_rate_limits"]
        GapDB["ai.knowledge_gap_questions"]
    end

    subgraph Events["Event-Driven"]
        Event["LessonContentUpdatedEvent<br>(@TransactionalEventListener<br>AFTER_COMMIT)"]
    end

    C1 --> RagSvc
    C2 --> QuizSvc
    C3 --> SumSvc
    C4 --> JobSvc
    C5 --> EmbSvc

    Event --> EmbSvc
    Event --> SumSvc

    RagSvc --> RateLimit --> RateDB
    RagSvc --> EmbModel
    RagSvc --> ChatModel
    RagSvc --> Embeddings
    RagSvc --> GapDB

    QuizSvc --> JobSvc --> JobLog
    SumSvc --> JobSvc
    EmbSvc --> JobSvc

    QuizSvc --> QuizProc
    SumSvc --> SumProc
    EmbSvc --> EmbProc

    QuizProc --> ChatModel
    QuizProc --> Quizzes
    SumProc --> ChatModel
    SumProc --> Summaries
    EmbProc --> EmbModel
    EmbProc --> Embeddings
```

### Key Design Principles

- **Async Job Pattern**: All generation tasks (`EMBEDDING`, `LESSON_SUMMARY`, `QUIZ_GENERATION`) return `202 Accepted` immediately with a `jobId`. Clients poll `GET /api/ai/jobs/{id}` for status.
- **Event-Driven Triggers**: Embedding and summary generation fire automatically after lesson content is committed to the database via `@TransactionalEventListener(AFTER_COMMIT)`.
- **ACL Enforcement**: Every endpoint validates enrollment (student) or course ownership (instructor) via cross-module API contracts — never direct repository imports.
- **Graceful Degradation**: `GEMINI_API_KEY` is optional at startup. The `ChatClient` and `EmbeddingModel` beans are `@ConditionalOnProperty` — the application boots without them, returning errors only when AI endpoints are called.

---

## 2. Async Job State Machine

All AI generation operations share a unified job tracking system (`ai.ai_job_logs`).

```mermaid
stateDiagram-v2
    state "DELAYED (future retry queue)" as DELAYED

    [*] --> PENDING : Job created (202 Accepted)
    PENDING --> PROCESSING : Async processor picks up job
    PENDING --> DELAYED : Future enhancement
    PROCESSING --> COMPLETED : Generation successful
    PROCESSING --> FAILED : Exception thrown / Gemini error
    DELAYED --> PROCESSING : Retry scheduled
    FAILED --> [*] : Terminal (no auto-retry)
    COMPLETED --> [*] : Terminal
    DELAYED --> [*] : Abandoned
```

| Status | Description |
|--------|-------------|
| `PENDING` | Job created, waiting for async thread |
| `PROCESSING` | Async processor started, Gemini call in progress |
| `COMPLETED` | Generation finished, result persisted |
| `FAILED` | Exception occurred; `errorMessage` field populated |
| `DELAYED` | Reserved for future retry queue (not yet active) |

**Job ownership**: `GET /api/ai/jobs/{id}` validates the requesting user matches `AiJobLog.userId`. Cross-user access returns `403 Forbidden`.

**Retry policy**: Spring AI retry is disabled (`max-attempts: 1`). Each processor catches exceptions, persists the error message to `AiJobLog`, and marks the job `FAILED`. Retrying requires re-triggering the original action.

---

## 3. Workflow 1 — Lesson Embedding

Lesson embeddings power the RAG Chat feature. They are generated automatically whenever lesson content changes and stored as 768-dimensional vectors in `ai.lesson_embeddings` using the `pgvector` extension.

### 3.1 Trigger Flow — Event-Driven Embedding

```mermaid
sequenceDiagram
    participant Instructor
    participant LessonService as LessonService<br/>(course module)
    participant EventBus as Spring Event Bus<br/>(@TransactionalEventListener)
    participant AiEventListener
    participant EmbeddingService
    participant JobService as AiJobService
    participant AsyncProc as AsyncEmbeddingProcessor
    participant Gemini as Gemini Embedding API<br/>(gemini-embedding-001)
    participant DB as ai.lesson_embeddings

    Instructor->>LessonService: Save/update lesson content
    LessonService->>LessonService: Commit transaction
    LessonService->>EventBus: publish LessonContentUpdatedEvent(lessonId, userId)
    Note over EventBus: AFTER_COMMIT — fires only after DB commit succeeds

    EventBus->>AiEventListener: onLessonContentUpdated()
    AiEventListener->>EmbeddingService: requestEmbedding(lessonId, userId)
    EmbeddingService->>JobService: createJob(EMBEDDING, lessonId, userId)
    JobService-->>EmbeddingService: AiJobLog (PENDING)
    EmbeddingService->>AsyncProc: process(jobId, lessonId) [@Async]
    EmbeddingService-->>AiEventListener: returns (fire-and-forget)

    Note over AsyncProc: Runs on ai-executor thread pool<br/>core=2, max=5, queue=50

    AsyncProc->>JobService: updateStatus(PROCESSING)
    AsyncProc->>LessonService: getLessonContent(lessonId)
    alt Content is blank
        AsyncProc->>JobService: updateStatus(FAILED, "no content")
    else Content exists
        AsyncProc->>AsyncProc: splitIntoChunks(content)<br/>window=500 words, step=450 words
        AsyncProc->>DB: deleteByLessonId(lessonId) — idempotent cleanup
        loop For each chunk
            AsyncProc->>Gemini: embed(chunkText) → float[768]
            Gemini-->>AsyncProc: vector[768]
            AsyncProc->>DB: insertChunk(lessonId, courseId, chunkIndex, chunkText, vector)
        end
        AsyncProc->>JobService: updateStatus(COMPLETED)
    end
```

### 3.2 Chunking Strategy

The chunking algorithm ensures context continuity at chunk boundaries through overlapping windows.

```
Lesson Content (word array):
┌─────────────────────────────────────────────────────────────────┐
│ word[0] ... word[449] | word[450] ... word[499] | word[500] ... │
└───────────────────────────────────────────────────────────────┬─┘
                                                                │
chunk_0: word[0]   → word[499]   (500 words)                   │
chunk_1: word[450] → word[949]   (500 words, 50-word overlap)  │
chunk_2: word[900] → word[1399]  (500 words, 50-word overlap)  │
                ...                                             │
```

- **Window size**: 500 words
- **Step size**: 450 words (50-word backward overlap)
- **Purpose**: Prevents important concepts at chunk boundaries from losing context

### 3.3 Vector Storage (Native SQL)

Spring Data JPA does not natively support `pgvector` column types. The repository uses raw SQL for all vector operations:

```sql
-- Insert (LessonEmbeddingRepository.insertChunk)
INSERT INTO ai.lesson_embeddings (lesson_id, course_id, chunk_index, chunk_text, embedding)
VALUES (:lessonId, :courseId, :chunkIndex, :chunkText, CAST(:vector AS vector))

-- Index definition (V32 migration)
CREATE INDEX ON ai.lesson_embeddings
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### 3.4 Admin Manual Reindex

```mermaid
sequenceDiagram
    participant Admin
    participant Controller as AiController
    participant EmbeddingService
    participant LessonQueryService

    Admin->>Controller: POST /api/ai/admin/reindex-embeddings
    Controller->>EmbeddingService: reindexAll()
    EmbeddingService->>LessonQueryService: findAllLessonsWithContent()
    loop For each lesson with non-empty content
        EmbeddingService->>EmbeddingService: requestEmbedding(lessonId, adminUserId)
        Note over EmbeddingService: Creates PENDING job per lesson<br/>and fires @Async processor
    end
    EmbeddingService-->>Controller: (void)
    Controller-->>Admin: 200 OK
```

**Use case**: Run after initial deployment to backfill embeddings for existing lessons, or after a bulk content migration.

---

## 4. Workflow 2 — Lesson Summary Generation

Lesson summaries provide structured learning aids (`summaryText`, `keyPoints[]`, `vocabulary[]`). They are co-triggered by the same `LessonContentUpdatedEvent` as embeddings, running in parallel on separate async threads.

### 4.1 Trigger Flow

```mermaid
sequenceDiagram
    participant EventBus as Spring Event Bus
    participant AiEventListener
    participant SummaryService as AiSummaryServiceImpl
    participant JobService as AiJobService
    participant AsyncProc as AsyncSummaryProcessor
    participant PromptBuilder as AiPromptBuilder
    participant Gemini as Gemini Chat API<br/>(gemini-2.5-flash-lite)
    participant DB as ai.lesson_summaries

    EventBus->>AiEventListener: onLessonContentUpdated() [AFTER_COMMIT]
    Note over AiEventListener: Fires BOTH requestEmbedding<br/>AND requestSummaryGeneration in parallel

    AiEventListener->>SummaryService: requestSummaryGeneration(lessonId, userId)
    SummaryService->>JobService: createJob(LESSON_SUMMARY, lessonId, userId)
    JobService-->>SummaryService: AiJobLog (PENDING)
    SummaryService->>AsyncProc: process(jobId, lessonId) [@Async]

    AsyncProc->>JobService: updateStatus(PROCESSING)
    AsyncProc->>AsyncProc: fetchLessonContent(lessonId)
    AsyncProc->>PromptBuilder: buildSummaryPrompt(title, content)
    Note over PromptBuilder: Content truncated to 15,000 chars<br/>Instructs Gemini: JSON only, no markdown

    AsyncProc->>Gemini: chat(prompt)
    Gemini-->>AsyncProc: JSON response

    AsyncProc->>AsyncProc: parseResponse()
    Note over AsyncProc: ObjectMapper deserializes:<br/>summaryText (String)<br/>keyPoints (String[])<br/>vocabulary ([{term, definition}])

    AsyncProc->>DB: upsert(lessonId, summaryText, keyPoints, vocabulary)
    Note over DB: INSERT ... ON CONFLICT (lesson_id) DO UPDATE<br/>Idempotent — safe to re-trigger

    AsyncProc->>JobService: updateStatus(COMPLETED)
```

### 4.2 Gemini Prompt Structure

```
System: You are an educational content expert. Analyze the following lesson content
        and generate a structured summary in strict JSON format. No markdown. No explanation.

User:   Lesson: {lessonTitle}
        Content: {content (max 15,000 chars)}

        Return exactly this JSON structure:
        {
          "summaryText": "2-3 paragraph summary...",
          "keyPoints": ["Point 1", "Point 2", ...],
          "vocabulary": [
            {"term": "...", "definition": "..."}
          ]
        }
```

### 4.3 Summary Retrieval

```mermaid
sequenceDiagram
    participant Client
    participant Controller as AiController
    participant SummaryService as AiSummaryServiceImpl
    participant EnrollmentQueryService
    participant CourseQueryService
    participant DB as ai.lesson_summaries

    Client->>Controller: GET /api/ai/summaries/lesson/{lessonId}
    Controller->>SummaryService: getSummaryByLesson(userId, lessonId)

    SummaryService->>EnrollmentQueryService: isEnrolled(userId, courseId)
    SummaryService->>CourseQueryService: isInstructor(userId, courseId)

    alt Neither enrolled nor instructor
        SummaryService-->>Controller: throw 403 Forbidden
    else Authorized
        SummaryService->>DB: findByLessonId(lessonId)
        alt Summary exists
            DB-->>SummaryService: LessonSummary entity
            SummaryService-->>Controller: LessonSummaryResponse
            Controller-->>Client: 200 OK { summaryText, keyPoints[], vocabulary[], updatedAt }
        else Summary not yet generated
            SummaryService-->>Controller: throw 404 Not Found
        end
    end
```

---

## 5. Workflow 3 — Quiz Generation & Attempts

Instructors generate multiple-choice quizzes from lesson content. Students take the quiz without seeing answers; correct answers and explanations are revealed only after submission.

### 5.1 Quiz Generation Flow (Instructor)

```mermaid
sequenceDiagram
    participant Instructor
    participant Controller as AiController
    participant QuizService as AiQuizServiceImpl
    participant LessonQueryService
    participant JobService as AiJobService
    participant AsyncProc as AsyncQuizProcessor
    participant PromptBuilder as AiPromptBuilder
    participant Gemini as Gemini Chat API
    participant DB as ai.generated_quizzes

    Instructor->>Controller: POST /api/ai/quizzes/generate<br>{ lessonId, questionCount (1-20) }

    Controller->>QuizService: requestQuizGeneration(userId, request)
    QuizService->>LessonQueryService: findLesson(lessonId)

    alt Lesson not found
        QuizService-->>Controller: throw 404 Not Found
    end

    QuizService->>LessonQueryService: isInstructorOfLesson(userId, lessonId)
    alt Not instructor
        QuizService-->>Controller: throw 403 Forbidden
    end

    QuizService->>LessonQueryService: getLessonContent(lessonId)
    alt Content is blank
        QuizService-->>Controller: throw 400 Bad Request (cannot quiz empty lesson)
    end

    QuizService->>JobService: createJob(QUIZ_GENERATION, lessonId, userId)
    JobService-->>QuizService: AiJobLog (PENDING, jobId)
    QuizService->>AsyncProc: process(jobId, lessonId, questionCount) [@Async]

    QuizService-->>Controller: AiJobResponse (jobId, PENDING)
    Controller-->>Instructor: 202 Accepted { jobId }

    Note over AsyncProc: Async processing begins

    AsyncProc->>JobService: updateStatus(PROCESSING)
    AsyncProc->>PromptBuilder: buildQuizPrompt(title, content, questionCount)
    Note over PromptBuilder: Content truncated to 12,000 chars<br/>Strict JSON array output required

    AsyncProc->>Gemini: chat(prompt)
    Gemini-->>AsyncProc: JSON array of questions

    AsyncProc->>AsyncProc: parseAndValidate(response)
    Note over AsyncProc: Validates count matches requested N<br/>Each question: {question, options[4],<br>correctIndex, explanation}

    AsyncProc->>DB: save(GeneratedQuiz { lessonId, questions as JSONB })
    AsyncProc->>JobService: updateStatus(COMPLETED, referenceId=quizId)

    Instructor->>Controller: GET /api/ai/jobs/{jobId}
    Controller-->>Instructor: { status: COMPLETED, referenceId: quizId }
```

### 5.2 Student Quiz Flow

```mermaid
sequenceDiagram
    participant Student
    participant Controller as AiController
    participant QuizService as AiQuizServiceImpl
    participant EnrollmentQueryService
    participant QuizRepo as GeneratedQuizRepository
    participant AttemptRepo as QuizAttemptRepository

    Student->>Controller: GET /api/ai/quizzes/lesson/{lessonId}/take
    Controller->>QuizService: getLatestQuizForStudent(userId, lessonId)

    QuizService->>EnrollmentQueryService: isEnrolled(userId, courseId)
    alt Not enrolled
        QuizService-->>Controller: throw 403 Forbidden
    end

    QuizService->>QuizRepo: findTopByLessonIdOrderByCreatedAtDesc(lessonId)
    alt No quiz generated yet
        QuizService-->>Controller: throw 404 Not Found
    end

    QuizService->>QuizService: mapToStudentView(questions)
    Note over QuizService: Strips correctIndex & explanation<br/>Returns StudentQuizQuestionDto only

    QuizService-->>Controller: { quizId, questions[{ question, options[] }] }
    Controller-->>Student: 200 OK (no answers exposed)

    Student->>Controller: POST /api/ai/quizzes/attempts<br>{ lessonId, quizId, answers: [int, int, ...] }
    Controller->>QuizService: submitAttempt(userId, request)

    QuizService->>QuizRepo: findById(quizId)
    QuizService->>QuizService: validateQuizBelongsToLesson(quiz, lessonId)
    Note over QuizService: Prevents cross-lesson cheating

    QuizService->>QuizService: scoreAnswers(answers, correctIndices)
    Note over QuizService: score = count(answers[i] == correctIndex[i])

    QuizService->>AttemptRepo: save(QuizAttempt { score, total, percentage, answers as JSONB })

    QuizService-->>Controller: QuizAttemptResponse
    Controller-->>Student: 200 OK {<br>  score, totalQuestions, percentage,<br>  questions[{ question, options, correctIndex, explanation }]<br>}
```

### 5.3 Instructor Quiz Review

```mermaid
sequenceDiagram
    participant Instructor
    participant Controller as AiController
    participant QuizService as AiQuizServiceImpl
    participant CourseQueryService
    participant QuizRepo as GeneratedQuizRepository

    Instructor->>Controller: GET /api/ai/quizzes/lesson/{lessonId}
    Controller->>QuizService: getQuizzesByLesson(userId, lessonId)

    QuizService->>CourseQueryService: isInstructor(userId, courseId)
    alt Not instructor
        QuizService-->>Controller: throw 403 Forbidden
    end

    QuizService->>QuizRepo: findByLessonIdOrderByCreatedAtDesc(lessonId)
    QuizService-->>Controller: List<GeneratedQuizResponse> (with full answers)
    Controller-->>Instructor: 200 OK (correctIndex + explanation included)
```

### 5.4 Answer Masking Strategy

| Field | Student View (`/take`) | Post-Submission (`/attempts`) | Instructor View |
|-------|----------------------|-------------------------------|-----------------|
| `question` | ✅ | ✅ | ✅ |
| `options[]` | ✅ | ✅ | ✅ |
| `correctIndex` | ❌ hidden | ✅ revealed | ✅ |
| `explanation` | ❌ hidden | ✅ revealed | ✅ |

---

## 6. Workflow 4 — RAG Chat (Synchronous & SSE Streaming)

The Retrieval-Augmented Generation chat allows students and instructors to ask natural-language questions about course material. The system retrieves the most semantically relevant lesson chunks, classifies answer confidence, and generates a grounded response using Gemini.

### 6.1 Full RAG Pipeline

```mermaid
sequenceDiagram
    participant Client
    participant Controller as AiController
    participant RagService as RagServiceImpl
    participant EnrollmentSvc as EnrollmentQueryService
    participant CourseSvc as CourseQueryService
    participant RateLimit as RateLimitHelper
    participant EmbModel as Gemini Embedding API
    participant VectorDB as ai.lesson_embeddings (pgvector)
    participant LessonQuerySvc as LessonQueryService
    participant GapDB as ai.knowledge_gap_questions
    participant PromptBuilder as AiPromptBuilder
    participant ChatModel as Gemini Chat API<br/>(gemini-2.5-flash-lite)

    Client->>Controller: POST /api/ai/chat/courses/{courseId}<br>{ question, history: [{role, content}] }

    Controller->>RagService: chat(userId, courseId, request)

    Note over RagService: Step 1 — ACL Check
    RagService->>EnrollmentSvc: isEnrolled(userId, courseId)
    RagService->>CourseSvc: isInstructor(userId, courseId)
    alt Neither enrolled nor instructor
        RagService-->>Controller: throw 403 Forbidden
    end

    Note over RagService: Step 2 — Rate Limit Check
    RagService->>RateLimit: incrementAndGet(userId, today)
    RateLimit->>RateLimit: UPSERT ai.ai_rate_limits<br>ON CONFLICT DO UPDATE count+1
    RateLimit-->>RagService: currentCount
    alt count > 20
        RagService-->>Controller: throw 429 Too Many Requests
    end

    Note over RagService: Step 3 — Embed Question
    RagService->>EmbModel: embed(question) → float[768]
    EmbModel-->>RagService: queryVector[768]

    Note over RagService: Step 4 — Vector Search (Top-5)
    RagService->>VectorDB: findTopK(courseId, queryVector, k=5)<br>ORDER BY embedding <=> :queryVector LIMIT 5
    VectorDB-->>RagService: List<LessonChunkProjection><br>{ lessonId, chunkText, distance }

    Note over RagService: Step 5 — Classify Confidence
    RagService->>RagService: avgDistance = mean(distances)
    Note over RagService: HIGH:   avgDistance < 0.30<br>MEDIUM: 0.30 ≤ avgDistance < 0.60<br>GAP:    avgDistance ≥ 0.60

    alt Confidence = GAP
        Note over RagService: Step 6 — Log Knowledge Gap
        RagService->>GapDB: save(userId, courseId, questionText, confidenceScore)
    end

    Note over RagService: Step 7 — Resolve Source Lessons
    RagService->>LessonQuerySvc: findLessonsByIds(deduplicated lessonIds)
    LessonQuerySvc-->>RagService: List<SourceLessonDto> { lessonId, title }

    Note over RagService: Step 8 — Build RAG Prompt
    RagService->>PromptBuilder: buildRagPrompt(chunks, question, history, tier)
    Note over PromptBuilder: Injects retrieved chunks as context<br>Includes conversation history<br>If GAP: instructs model to acknowledge<br>"I don't have info on this topic"

    Note over RagService: Step 9 — Generate Answer
    RagService->>ChatModel: call(prompt) — synchronous
    ChatModel-->>RagService: answerText

    RagService-->>Controller: ChatResponse<br>{ answer, sourceLessons[], confidenceTier }
    Controller-->>Client: 200 OK
```

### 6.2 SSE Streaming Flow

```mermaid
sequenceDiagram
    participant Client
    participant Controller as AiController
    participant RagService as RagServiceImpl
    participant SecurityCtx as DelegatingSecurityContextRunnable<br/>(WebMvcConfig)
    participant ChatModel as Gemini Chat API

    Client->>Controller: POST /api/ai/chat/courses/{courseId}/stream<br>Accept: text/event-stream

    Note over Controller: Same ACL, rate limit, embed, vector search,<br>confidence classification as sync flow (steps 1-8)

    Controller->>RagService: chatStream(userId, courseId, request)
    RagService-->>Controller: SseEmitter

    Note over SecurityCtx: WebMvcConfig wraps async threads with<br>DelegatingSecurityContextRunnable<br>Preserves JWT SecurityContext across thread boundary

    Controller-->>Client: HTTP 200, Content-Type: text/event-stream

    RagService->>ChatModel: stream(prompt) → Flux<String>

    Note over RagService: Sends metadata first
    RagService-->>Client: event: metadata<br>data: { "sourceLessons": [...], "confidenceTier": "HIGH" }

    loop Token streaming
        ChatModel-->>RagService: token chunk
        RagService-->>Client: data: {token}
    end

    RagService-->>Client: data: [DONE]
    RagService->>RagService: emitter.complete()

    alt Error during streaming
        RagService-->>Client: event: error<br>data: { "message": "Rate limit exceeded" }
        RagService->>RagService: emitter.completeWithError()
    end
```

### 6.3 Confidence Tier Classification

Confidence is determined by the average cosine distance of the top-5 retrieved chunks. Cosine distance is in the range `[0, 2]` where `0` = identical vectors.

```
avgDistance = mean(chunk.distance for top-5 chunks)

┌─────────────────┬────────────────────┬───────────────────────────────────────┐
│ Tier            │ Condition          │ Behaviour                             │
├─────────────────┼────────────────────┼───────────────────────────────────────┤
│ HIGH            │ avgDistance < 0.30 │ Strong semantic match; answer is      │
│                 │                    │ grounded in course material            │
├─────────────────┼────────────────────┼───────────────────────────────────────┤
│ MEDIUM          │ 0.30 ≤ dist < 0.60 │ Partial match; answer may be relevant │
│                 │                    │ but user is warned                     │
├─────────────────┼────────────────────┼───────────────────────────────────────┤
│ GAP             │ avgDistance ≥ 0.60 │ No relevant content found; question   │
│                 │                    │ logged to knowledge_gap_questions;     │
│                 │                    │ Gemini told to acknowledge the gap     │
└─────────────────┴────────────────────┴───────────────────────────────────────┘
```

### 6.4 Rate Limiting Detail

Rate limiting is enforced per user per day using a PostgreSQL UPSERT — atomic and race-condition-free.

```sql
-- RateLimitHelper.incrementAndGet()
INSERT INTO ai.ai_rate_limits (user_id, limit_date, message_count)
VALUES (:userId, CURRENT_DATE, 1)
ON CONFLICT (user_id, limit_date)
DO UPDATE SET message_count = ai.ai_rate_limits.message_count + 1
RETURNING message_count;
```

| Setting | Value |
|---------|-------|
| Daily limit | 20 queries / user / day |
| Reset | Midnight (new `limit_date` row) |
| Enforcement | Pre-call; increments before Gemini call |
| Error | `429 Too Many Requests` |

### 6.5 SSE Security Context Propagation

Spring async threads do not inherit the `SecurityContext` from the request thread by default. This causes `NullPointerException` when `RagServiceImpl` calls `SecurityContextHolder.getContext()` inside the SSE thread.

```mermaid
sequenceDiagram
    participant RequestThread as HTTP Request Thread<br>(has SecurityContext)
    participant WebMvcConfig
    participant AsyncThread as Async SSE Thread<br>(no SecurityContext by default)

    RequestThread->>WebMvcConfig: configureAsyncSupport()
    Note over WebMvcConfig: Registers DelegatingSecurityContextAsyncTaskExecutor<br>core=4, max=10, queue=50, timeout=5min

    RequestThread->>AsyncThread: spawn (via SseEmitter)
    WebMvcConfig->>AsyncThread: copy SecurityContext from parent thread

    AsyncThread->>AsyncThread: SecurityContextHolder.getContext() ✅
    Note over AsyncThread: JWT principal available inside SSE stream
```

---

## 7. Cross-Cutting Concerns

### 7.1 ACL Enforcement Matrix

| Feature | Endpoint | Instructor | Enrolled Student | Notes |
|---------|----------|:----------:|:----------------:|-------|
| Generate quiz | `POST /quizzes/generate` | ✅ | ❌ | Must own the lesson's course |
| View all quizzes (with answers) | `GET /quizzes/lesson/{id}` | ✅ | ❌ | Full `correctIndex` + `explanation` |
| Take latest quiz | `GET /quizzes/lesson/{id}/take` | ❌ | ✅ | Answers stripped |
| Submit attempt | `POST /quizzes/attempts` | ❌ | ✅ | Returns answers after scoring |
| View my attempts | `GET /quizzes/lesson/{id}/my-attempts` | ❌ | ✅ | Own attempts only |
| Get lesson summary | `GET /summaries/lesson/{id}` | ✅ | ✅ | Either role |
| RAG chat (sync) | `POST /chat/courses/{id}` | ✅ | ✅ | Rate-limited |
| RAG chat (stream) | `POST /chat/courses/{id}/stream` | ✅ | ✅ | Rate-limited |
| Poll job status | `GET /jobs/{id}` | ✅ | — | Job owner only |
| Reindex embeddings | `POST /admin/reindex-embeddings` | — | — | Admin role |

All ACL checks use cross-module API interfaces (`LessonQueryService`, `EnrollmentQueryService`, `CourseQueryService`) — no direct imports of other modules' repositories.

### 7.2 Thread Pool Configuration

```yaml
# application.yml — AI async executor
ai:
  executor:
    core-pool-size: 2      # Base threads always alive
    max-pool-size: 5       # Max concurrent AI generation jobs
    queue-capacity: 50     # Job queue depth before rejection

# WebMvcConfig — SSE async executor
WebMvcConfig:
  core: 4
  max: 10
  queue: 50
  timeout: 300_000ms       # 5 minutes max SSE connection
```

### 7.3 Gemini Configuration

```yaml
# application.yml
spring:
  ai:
    google:
      genai:
        api-key: ${GEMINI_API_KEY:}       # Optional at startup
        chat:
          model: gemini-2.5-flash-lite
          temperature: 0.3               # Low temperature for factual accuracy
          max-output-tokens: 4096
        embedding:
          model: gemini-embedding-001
          dimensions: 768
    retry:
      max-attempts: 1                    # No auto-retry; processors handle failures
```

---

## 8. Database Schema

### `ai.lesson_embeddings`

```sql
CREATE TABLE ai.lesson_embeddings (
    id          BIGSERIAL PRIMARY KEY,
    lesson_id   BIGINT NOT NULL,
    course_id   BIGINT NOT NULL,
    chunk_index INT NOT NULL,
    chunk_text  TEXT NOT NULL,
    embedding   vector(768),
    created_at  TIMESTAMP DEFAULT now()
);

-- pgvector IVFFlat index for approximate nearest-neighbour search
CREATE INDEX ON ai.lesson_embeddings
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### `ai.ai_rate_limits`

```sql
CREATE TABLE ai.ai_rate_limits (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT NOT NULL,
    limit_date    DATE NOT NULL,
    message_count INT DEFAULT 0,
    UNIQUE (user_id, limit_date)        -- Enforces one row per user per day
);
```

### `ai.ai_job_logs`

```sql
CREATE TABLE ai.ai_job_logs (
    id            UUID PRIMARY KEY,
    job_type      VARCHAR,              -- EMBEDDING, LESSON_SUMMARY, QUIZ_GENERATION, TRANSCRIPTION
    status        VARCHAR,              -- PENDING, PROCESSING, COMPLETED, FAILED, DELAYED
    user_id       BIGINT,
    reference_id  BIGINT,              -- lessonId on create; updated to quizId on quiz completion
    error_message TEXT,
    retry_count   INT DEFAULT 0,
    started_at    TIMESTAMP,
    completed_at  TIMESTAMP,
    created_at    TIMESTAMP DEFAULT now()
);
```

### `ai.knowledge_gap_questions`

```sql
CREATE TABLE ai.knowledge_gap_questions (
    id               BIGSERIAL PRIMARY KEY,
    user_id          BIGINT NOT NULL,
    course_id        BIGINT NOT NULL,
    question_text    TEXT NOT NULL,
    confidence_score DOUBLE PRECISION,  -- avgDistance at time of query
    asked_at         TIMESTAMP DEFAULT now()
);
```

### `ai.lesson_summaries`

```sql
CREATE TABLE ai.lesson_summaries (
    id           BIGSERIAL PRIMARY KEY,
    lesson_id    BIGINT UNIQUE NOT NULL,   -- UNIQUE enables upsert idempotency
    summary_text TEXT,
    key_points   JSONB,                    -- String[]
    vocabulary   JSONB,                    -- [{term: String, definition: String}]
    updated_at   TIMESTAMP DEFAULT now()
);
```

### `ai.generated_quizzes`

```sql
CREATE TABLE ai.generated_quizzes (
    id         UUID PRIMARY KEY,
    lesson_id  BIGINT NOT NULL,
    job_id     UUID,                       -- Reference back to the triggering job
    questions  JSONB,                      -- QuizQuestionDto[]
    created_at TIMESTAMP DEFAULT now()
);
```

### `ai.quiz_attempts`

```sql
CREATE TABLE ai.quiz_attempts (
    id           BIGSERIAL PRIMARY KEY,
    quiz_id      UUID NOT NULL,
    lesson_id    BIGINT NOT NULL,
    student_id   BIGINT NOT NULL,
    answers      JSONB,                    -- int[] (selected option indices)
    score        INT,
    total        INT,
    percentage   DOUBLE PRECISION,
    attempted_at TIMESTAMP DEFAULT now()
);
```

---

## 9. API Reference

All endpoints are under `/api/ai/**` (proxied through API Gateway on port 8080).

### Job Management

| Method | Path | Auth | Response | Description |
|--------|------|------|----------|-------------|
| `GET` | `/ai/jobs/{id}` | Job owner | `AiJobResponse` | Poll async job status |

### Embeddings (Admin)

| Method | Path | Auth | Response | Description |
|--------|------|------|----------|-------------|
| `POST` | `/ai/admin/reindex-embeddings` | Admin | `200 OK` | Backfill embeddings for all lessons |

### Lesson Summaries

| Method | Path | Auth | Response | Description |
|--------|------|------|----------|-------------|
| `GET` | `/ai/summaries/lesson/{lessonId}` | Enrolled / Instructor | `LessonSummaryResponse` | Retrieve generated summary |

### Quiz Generation & Attempts

| Method | Path | Auth | Response | Description |
|--------|------|------|----------|-------------|
| `POST` | `/ai/quizzes/generate` | Instructor | `202 { jobId }` | Request quiz generation |
| `GET` | `/ai/quizzes/lesson/{lessonId}` | Instructor | `List<GeneratedQuizResponse>` | All quizzes with answers |
| `GET` | `/ai/quizzes/lesson/{lessonId}/take` | Student | `StudentQuiz` (no answers) | Latest quiz for student |
| `POST` | `/ai/quizzes/attempts` | Student | `QuizAttemptResponse` | Submit answers, get scored results |
| `GET` | `/ai/quizzes/lesson/{lessonId}/my-attempts` | Student | `List<QuizAttemptResponse>` | Student's attempt history |

### RAG Chat

| Method | Path | Auth | Response | Description |
|--------|------|------|----------|-------------|
| `POST` | `/ai/chat/courses/{courseId}` | Enrolled / Instructor | `ChatResponse` | Synchronous RAG Q&A |
| `POST` | `/ai/chat/courses/{courseId}/stream` | Enrolled / Instructor | `text/event-stream` | SSE streaming RAG Q&A |

---

## 10. Error Scenarios

### Job Processing Errors

| Error | Cause | Outcome |
|-------|-------|---------|
| Lesson content is blank | Lesson has no text content | Job → `FAILED("no content")` |
| Gemini API key missing | `GEMINI_API_KEY` not set | `AsyncEmbeddingProcessor` guards with null check; Job → `FAILED` |
| Gemini API error | Network or quota issue | Exception caught; Job → `FAILED(errorMessage)` |
| JSON parse failure | Gemini returns malformed JSON | `AiResponseParseException` thrown; Job → `FAILED` |
| Quiz count mismatch | Gemini returns fewer questions than requested | Validation throws; Job → `FAILED` |

### RAG Chat Errors

| Error | Cause | HTTP Status |
|-------|-------|-------------|
| User not enrolled and not instructor | ACL check fails | `403 Forbidden` |
| Daily rate limit exceeded | `message_count > 20` | `429 Too Many Requests` |
| Gemini embedding fails | API error on question embed | `500 Internal Server Error` |
| No embeddings for course | Lessons have never been indexed | GAP tier response (not an error) |

### Quiz Attempt Errors

| Error | Cause | HTTP Status |
|-------|-------|-------------|
| Quiz not found | Invalid `quizId` | `404 Not Found` |
| Quiz-lesson mismatch | `quizId` does not belong to `lessonId` | `400 Bad Request` |
| Student not enrolled | ACL check fails | `403 Forbidden` |

---

## 11. Key Implementation Details

### Idempotency

- **Embeddings**: `AsyncEmbeddingProcessor` calls `deleteByLessonId()` before re-inserting chunks. Re-triggering the same lesson is safe.
- **Summaries**: `LessonSummaryRepository.upsert()` uses `INSERT ... ON CONFLICT (lesson_id) DO UPDATE`. Re-triggering overwrites with the latest result.
- **Quizzes**: Each generation creates a new `GeneratedQuiz` row. Multiple generations accumulate; students always receive the most recent one.

### Security Context in Async Threads

All async AI threads (SSE streaming via `SseEmitter`) require access to the JWT `SecurityContext` to call cross-module services that check the current user. `WebMvcConfig` registers a `DelegatingSecurityContextAsyncTaskExecutor` that copies the parent thread's context into each spawned thread.

### Cross-Module API Contracts

The AI module never imports internal classes from the `course` module. It depends exclusively on interfaces in `course/api/`:

```
modules/course/api/
  ├── LessonQueryService       (getLessonContent, findLesson, isInstructorOfLesson)
  ├── EnrollmentQueryService   (isEnrolled)
  └── CourseQueryService       (isInstructor, findCourse)
```

Implementations live in `course/api/impl/` — hidden behind the interface boundary.

### pgvector Cosine Similarity Query

```sql
-- LessonEmbeddingRepository.findTopK()
SELECT id, lesson_id, course_id, chunk_index, chunk_text,
       (embedding <=> CAST(:queryVector AS vector)) AS distance
FROM   ai.lesson_embeddings
WHERE  course_id = :courseId
ORDER  BY embedding <=> CAST(:queryVector AS vector)
LIMIT  :k
```

The `<=>` operator computes cosine distance (not similarity). A lower value = more similar. The ivfflat index with `lists=100` provides approximate nearest-neighbour search at scale.

---

**Last Updated**: Based on implementation in `modules/ai/` — `feature/ai-module` branch
**Status**: Core functionality complete (Embedding, Summary, Quiz, RAG Chat)
