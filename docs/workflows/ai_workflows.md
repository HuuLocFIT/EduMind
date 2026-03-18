# AI Module Workflows

This document describes all AI-driven workflows implemented in the EduMind LMS system. The AI module provides five core features: **Lesson Embeddings**, **Lesson Summaries**, **Quiz Generation**, **RAG Chat**, and **Auto-Transcription** — built on Spring AI with Google Gemini and Groq Whisper API.

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
        C7["/admin/reindex-summaries"]
        C6["/transcribe/lessons/{id}"]
    end

    subgraph Services["Service Layer"]
        RagSvc["RagServiceImpl<br>(RAG Chat)"]
        QuizSvc["AiQuizServiceImpl<br>(Quiz Gen)"]
        SumSvc["AiSummaryServiceImpl<br>(Summary)"]
        EmbSvc["EmbeddingServiceImpl<br>(Embedding)"]
        JobSvc["AiJobService<br>(Job Tracking)"]
        RateLimit["RateLimitHelper<br>(Rate Limiting)"]
        TransSvc["WhisperTranscriptionServiceImpl<br>(Transcription)"]
    end

    subgraph AsyncLayer["Async Processors (@Async)"]
        EmbProc["AsyncEmbeddingProcessor"]
        SumProc["AsyncSummaryProcessor"]
        QuizProc["AsyncQuizProcessor"]
        TransProc["WhisperTranscriptionServiceImpl<br>@Async whisperTaskExecutor<br>size=1, queue=10"]
    end

    subgraph Gemini["Google Gemini (Spring AI)"]
        ChatModel["gemini-2.5-flash-lite<br>temp=0.3, max=4096 tokens"]
        EmbModel["gemini-embedding-001<br>768 dimensions"]
    end

    subgraph Groq["Groq Whisper API"]
        GroqAPI["whisper-large-v3-turbo<br>25MB limit, 28,800s/day free"]
    end

    subgraph SourceResolvers["Transcription Source Resolvers"]
        Resolver["TranscriptionSourceResolver<br>(Strategy Pattern)"]
        CldExt["CloudinaryAudioExtractor<br>on-the-fly vc_none,ac_mp3,br_32k"]
        YtExt["YouTubeTranscriptExtractor<br>auto-captions first (free)"]
        YtDlp["YtDlpAudioDownloader<br>fallback (yt-dlp binary)"]
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
    C6 --> TransSvc

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
    TransSvc --> JobSvc

    QuizSvc --> QuizProc
    SumSvc --> SumProc
    EmbSvc --> EmbProc
    TransSvc --> TransProc

    QuizProc --> ChatModel
    QuizProc --> Quizzes
    SumProc --> ChatModel
    SumProc --> Summaries
    EmbProc --> EmbModel
    EmbProc --> Embeddings

    TransProc --> Resolver
    Resolver --> CldExt
    Resolver --> YtExt
    YtExt --> YtDlp
    CldExt --> GroqAPI
    YtDlp --> GroqAPI
    TransProc --> Event
```

### Key Design Principles

- **Async Job Pattern**: All generation tasks (`EMBEDDING`, `LESSON_SUMMARY`, `QUIZ_GENERATION`, `TRANSCRIPTION`) return `202 Accepted` immediately with a `jobId`. Clients poll `GET /api/ai/jobs/{id}` for status.
- **Event-Driven Triggers**: Embedding and summary generation fire automatically after lesson content is committed to the database via `@TransactionalEventListener(AFTER_COMMIT)`. Three sources publish `LessonContentUpdatedEvent`: (1) lesson creation with non-blank `articleContent`, (2) lesson update when `articleContent` changes, and (3) transcription completion via `LessonWriteService`.
- **ACL Enforcement**: Every endpoint validates enrollment (student) or course ownership (instructor) via cross-module API contracts — never direct repository imports.
- **Graceful Degradation**: `GEMINI_API_KEY` is optional at startup. The `ChatClient` and `EmbeddingModel` beans are `@ConditionalOnProperty` — the application boots without them. Similarly, `GROQ_API_KEY` is optional; transcription endpoint returns errors only when called.
- **Sequential Transcription**: `whisperTaskExecutor` (size=1, queue=10) serializes Groq API calls to stay within the 20 req/min rate limit. Groq 429 responses flip the job to `DELAYED`; `TranscriptionRetryScheduler` re-queues every 30 seconds.

---

## 2. Async Job State Machine

All AI generation operations share a unified job tracking system (`ai.ai_job_logs`).

```mermaid
stateDiagram-v2
    [*] --> PENDING : Job created (202 Accepted)
    PENDING --> PROCESSING : Async processor picks up job
    PROCESSING --> COMPLETED : Generation successful
    PROCESSING --> FAILED : Unrecoverable exception
    PROCESSING --> DELAYED : Groq HTTP 429 (rate limit hit)
    DELAYED --> PENDING : TranscriptionRetryScheduler picks up job<br>(every 30s, when nextRetryAt has passed)
    PENDING --> PROCESSING : Re-queued by scheduler
    FAILED --> [*] : Terminal (no auto-retry)
    COMPLETED --> [*] : Terminal
```

| Status | Description |
|--------|-------------|
| `PENDING` | Job created, waiting for async thread |
| `PROCESSING` | Async processor started, API call in progress |
| `COMPLETED` | Generation finished, result persisted |
| `FAILED` | Unrecoverable exception; `errorMessage` field populated |
| `DELAYED` | Groq rate limit hit (HTTP 429); `nextRetryAt` set to `now + retryDelaySeconds (60s)` |

**Job ownership**: `GET /api/ai/jobs/{id}` validates the requesting user matches `AiJobLog.userId`. Cross-user access returns `403 Forbidden`.

**Retry policy for non-transcription jobs**: Spring AI retry is disabled (`max-attempts: 1`). Each processor catches exceptions, persists the error message to `AiJobLog`, and marks the job `FAILED`. Retrying requires re-triggering the original action.

**Retry policy for `TRANSCRIPTION` jobs**: `GroqRateLimitException` (HTTP 429) transitions the job to `DELAYED` with `nextRetryAt = now + 60s`. `TranscriptionRetryScheduler` polls every 30 seconds, picks up all `DELAYED` jobs whose `nextRetryAt` has passed, resets them to `PENDING`, and re-submits to `whisperTaskExecutor`. If the queue is full, the job stays `DELAYED` with `nextRetryAt = now + 30s`.

---

## 3. Workflow 1 — Auto-Transcription (Groq Whisper)

Teachers paste a Cloudinary video URL or a YouTube URL. The system extracts text, writes it into the lesson's `articleContent`, and publishes `LessonContentUpdatedEvent` — automatically triggering embedding and summary generation.

**Why Groq instead of local Whisper**: The VPS has ~600 MB RAM left after the Spring Boot stack. Whisper medium needs 2 GB; Whisper base needs ~500 MB and is unstable under load. Groq API is free (28,800 s audio/day), ~10× faster than local inference, and consumes ≈ 0 MB VPS RAM.

### 3.1 High-Level Transcription Flow

```mermaid
sequenceDiagram
    participant Teacher
    participant Controller as AiController<br>POST /ai/transcribe/lessons/{lessonId}
    participant TransSvc as WhisperTranscriptionServiceImpl
    participant LessonQuerySvc as LessonQueryService
    participant JobRepo as AiJobLogRepository
    participant Executor as whisperTaskExecutor<br>(size=1, queue=10)
    participant Resolver as TranscriptionSourceResolver
    participant LessonWriteSvc as LessonWriteService
    participant EventBus as Spring Event Bus
    participant DB as ai.ai_job_logs

    Teacher->>Controller: POST { videoUrl } (TEACHER role)
    Controller->>TransSvc: requestTranscription(lessonId, videoUrl, userId)

    TransSvc->>LessonQuerySvc: getLessonInfo(lessonId)
    alt Lesson not found
        TransSvc-->>Controller: throw 404 Not Found
    end
    alt userId != lesson.instructorId
        TransSvc-->>Controller: throw 403 Forbidden
    end

    TransSvc->>JobRepo: save(AiJobLog { TRANSCRIPTION, PENDING, metadata=videoUrl })
    TransSvc->>Executor: processTranscriptionAsync(jobId, lessonId, videoUrl) [@Async]
    TransSvc-->>Controller: AiJobResponse (jobId, PENDING)
    Controller-->>Teacher: 202 Accepted { jobId }

    Note over Executor: Runs on whisperTaskExecutor — single thread<br>serialises all Groq calls

    Executor->>DB: update status=PROCESSING, startedAt=now
    Executor->>Resolver: resolve(videoUrl)
    Note over Resolver: Detects URL type and delegates<br>to correct AudioExtractor

    alt TranscriptionInput.DirectText (YouTube captions)
        Resolver-->>Executor: DirectText(text)
        Note over Executor: No Groq call needed — free path
    else TranscriptionInput.AudioFile (download required)
        Resolver-->>Executor: AudioFile(tempFile)
        Executor->>Executor: validate size < 25 MB
        alt size > 25 MB
            Executor->>DB: status=FAILED, errorMessage
        else size OK
            Executor->>Executor: sendToGroq(tempFile)
        end
    end

    Executor->>LessonWriteSvc: updateArticleContent(lessonId, transcript)
    LessonWriteSvc->>EventBus: publish LessonContentUpdatedEvent [AFTER_COMMIT]
    Note over EventBus: Auto-triggers embedding + summary generation

    Executor->>DB: status=COMPLETED, completedAt=now
    Executor->>Executor: Files.deleteIfExists(tempFile) [finally block]

    Teacher->>Controller: GET /api/ai/jobs/{jobId}
    Controller-->>Teacher: { status: COMPLETED }
```

### 3.2 Source Resolution Strategy (Strategy Pattern)

`TranscriptionSourceResolver` detects the URL type and delegates to the appropriate `AudioExtractor` implementation.

```
TranscriptionSourceResolver.resolve(url)
  │
  ├─ url.contains("res.cloudinary.com") ?
  │    └─→ CloudinaryAudioExtractor.extract(url)
  │         └─→ TranscriptionInput.AudioFile(tempFile)
  │
  ├─ url.contains("youtube.com/watch") or "youtu.be/" ?
  │    └─→ YouTubeTranscriptExtractor.extract(url)
  │         ├─ [Phase A] yt-dlp --write-auto-sub --skip-download → .vtt file
  │         │    ├─ VTT found & non-empty → TranscriptionInput.DirectText(parsedText)
  │         │    └─ VTT empty / not found → fallback to Phase B
  │         └─ [Phase B] YtDlpAudioDownloader.download(url) → TranscriptionInput.AudioFile(mp3)
  │
  └─ else → BadRequestException("Unsupported URL type")
```

**`TranscriptionInput`** is a sealed interface with two permitted records:

| Variant | Type | Description |
|---------|------|-------------|
| `DirectText(String text)` | No Groq call | YouTube auto-captions extracted from `.vtt` — free, instant |
| `AudioFile(Path tempFile)` | Groq API call | Downloaded audio file requiring Whisper transcription |

### 3.3 Cloudinary Audio Extraction

Cloudinary supports server-side media transformation via URL parameters. The extractor inserts transformation parameters right after `/upload/` — **no server-side processing, no VPS RAM usage**.

```
Original:   https://res.cloudinary.com/demo/video/upload/sample.mp4
Transformed: https://res.cloudinary.com/demo/video/upload/vc_none,ac_mp3,br_32k/sample.mp3
                                                          ───────────────────────
                                                          vc_none  = strip video
                                                          ac_mp3   = audio codec mp3
                                                          br_32k   = bitrate 32 kbps → ~14 MB/hour
```

The transformed URL is then downloaded to a temp file and returned as `TranscriptionInput.AudioFile`.

### 3.4 YouTube Extraction Flow

```mermaid
sequenceDiagram
    participant Extractor as YouTubeTranscriptExtractor
    participant YtDlp as yt-dlp binary
    participant Downloader as YtDlpAudioDownloader
    participant TmpDir as /tmp

    Extractor->>YtDlp: yt-dlp --write-auto-sub --sub-lang en --skip-download -o /tmp/ytdlp_sub_{uuid}_{%(id)s} <url>
    YtDlp-->>TmpDir: *.en.vtt (if captions exist)

    Extractor->>TmpDir: findGeneratedVtt(prefix)

    alt .vtt found
        Extractor->>Extractor: parseVttToText(vtt)
        Note over Extractor: Strip WEBVTT header, timestamps,<br>NOTE blocks, HTML tags<br>Deduplicate consecutive identical lines
        alt Parsed text non-empty
            Extractor-->>Caller: DirectText(transcript)
            Note over Extractor: Files.deleteIfExists(vtt) in finally
        else Parsed text blank
            Extractor->>Downloader: download(url) — fallback
        end
    else No .vtt file
        Extractor->>Downloader: download(url) — fallback
    end

    Downloader->>YtDlp: yt-dlp -x --audio-format mp3 --audio-quality 32K -o /tmp/ytdlp_audio_{uuid}.%(ext)s <url>
    YtDlp-->>TmpDir: ytdlp_audio_{uuid}.mp3
    Downloader-->>Caller: AudioFile(/tmp/ytdlp_audio_{uuid}.mp3)
```

**Timeouts**:
- Caption download: 5 minutes
- Audio download: 10 minutes

### 3.5 Groq API Call

Groq's API is OpenAI-compatible (`/openai/v1/audio/transcriptions`). The `RestClient` bean is pre-configured with `Authorization: Bearer <GROQ_API_KEY>` via `GroqClientConfig`.

```
POST https://api.groq.com/openai/v1/audio/transcriptions
Content-Type: multipart/form-data

file     = <audio file>
model    = whisper-large-v3-turbo
language = en

Response: { "text": "transcribed content..." }
```

**HTTP 429 handling**: The `RestClient` status handler detects `429 Too Many Requests` and throws `GroqRateLimitException`. The async processor catches it, sets `status=DELAYED`, and stores `nextRetryAt = now + 60s`.

### 3.6 Rate Limit & Retry Scheduler

```mermaid
sequenceDiagram
    participant Scheduler as TranscriptionRetryScheduler<br>@Scheduled(fixedDelay=30s)
    participant JobRepo as AiJobLogRepository
    participant Executor as whisperTaskExecutor
    participant TransSvc as WhisperTranscriptionService

    loop Every 30 seconds
        Scheduler->>JobRepo: findByStatusAndNextRetryAtBefore(DELAYED, now)
        alt No delayed jobs
            Scheduler-->>Scheduler: return (no-op)
        else Delayed jobs found
            loop For each delayed job
                Scheduler->>JobRepo: update status=PENDING, nextRetryAt=null
                Scheduler->>Executor: processTranscriptionAsync(jobId, lessonId, videoUrl)
                alt Executor queue full (TaskRejectedException)
                    Scheduler->>JobRepo: status=DELAYED, nextRetryAt=now+30s
                end
            end
        end
    end
```

### 3.7 Post-Transcription Event Chain

When transcription completes successfully, `LessonWriteService.updateArticleContent()` is called. This:

1. Persists the transcript to `lesson.article_content`
2. Detects content changed (old ≠ new)
3. Publishes `LessonContentUpdatedEvent` after the transaction commits
4. `AiEventListener` picks up the event on `taskExecutor` thread
5. Triggers **embedding generation** + **summary generation** in parallel (Workflows 4 and 2)

```
transcription COMPLETED
  └─→ LessonWriteService.updateArticleContent(lessonId, transcript)
        └─→ [AFTER_COMMIT] LessonContentUpdatedEvent
              └─→ AiEventListener.onLessonContentUpdated()
                    ├─→ EmbeddingService.requestEmbedding(lesson)   [Workflow 4]
                    └─→ AiSummaryService.requestSummaryGeneration(lesson) [Workflow 2]
```

### 3.8 File Lifecycle & Disk Safety

All temp files created during transcription are deleted in `finally` blocks to prevent disk leaks:

| File | Created by | Deleted in |
|------|-----------|------------|
| `cld_*.mp3` | `CloudinaryAudioExtractor` | `WhisperTranscriptionServiceImpl.processTranscriptionAsync` finally |
| `ytdlp_sub_*_*.en.vtt` | `YouTubeTranscriptExtractor` | `YouTubeTranscriptExtractor.extract` finally |
| `ytdlp_audio_*.mp3` | `YtDlpAudioDownloader` | `WhisperTranscriptionServiceImpl.processTranscriptionAsync` finally |

### 3.9 Concurrency & Thread Pool

```yaml
ai:
  executor:
    whisper-queue-capacity: ${WHISPER_QUEUE_CAPACITY:10}  # Max queued transcription jobs
  groq:
    retry-delay-seconds: 60   # Seconds to wait before retrying after Groq 429
```

`whisperTaskExecutor` is configured as **size=1** (single thread). This serialises all Groq API calls, avoiding concurrent requests that would quickly exhaust the 20 req/min Groq rate limit. The queue holds up to 10 pending jobs; additional requests beyond queue capacity trigger `TaskRejectedException` and are kept `DELAYED` for the scheduler.

---

## 4. Workflow 2 — Lesson Embedding

Lesson embeddings power the RAG Chat feature. They are generated automatically whenever lesson content is available — on creation (if `articleContent` is supplied) or on update (when content changes) — and stored as 768-dimensional vectors in `ai.lesson_embeddings` using the `pgvector` extension.

### 4.1 Trigger Flow — Event-Driven Embedding

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

    Instructor->>LessonService: Create lesson with articleContent, OR update articleContent
    LessonService->>LessonService: Commit transaction
    LessonService->>EventBus: publish LessonContentUpdatedEvent(lessonId, userId)
    Note over EventBus: AFTER_COMMIT — fires only after DB commit succeeds<br/>Triggers on: create (non-blank content) | update (content changed) | transcription done

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

### 4.2 Chunking Strategy

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

### 4.3 Vector Storage (Native SQL)

Spring Data JPA does not natively support `pgvector` column types. The repository uses raw SQL for all vector operations:

```sql
-- Insert (LessonEmbeddingRepository.insertChunk)
INSERT INTO ai.lesson_embeddings (lesson_id, course_id, chunk_index, chunk_text, embedding)
VALUES (:lessonId, :courseId, :chunkIndex, :chunkText, CAST(:vector AS vector))

-- Index definition (V32 migration)
CREATE INDEX ON ai.lesson_embeddings
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### 4.4 Admin Manual Reindex

```mermaid
sequenceDiagram
    participant Admin
    participant Controller as AiController
    participant EmbeddingService
    participant SummaryService as AiSummaryService
    participant LessonQueryService

    Note over Admin,LessonQueryService: Endpoint 1 — reindex embeddings only
    Admin->>Controller: POST /api/ai/admin/reindex-embeddings
    Controller->>EmbeddingService: reindexAll()
    EmbeddingService->>LessonQueryService: findAllWithArticleContent()
    loop For each lesson with non-empty content
        EmbeddingService->>EmbeddingService: createJob(EMBEDDING) + @Async process
        Note over EmbeddingService: Creates PENDING job per lesson<br/>and fires @Async processor
    end
    EmbeddingService-->>Controller: count
    Controller-->>Admin: 202 Accepted { "Queued N embedding jobs" }

    Note over Admin,LessonQueryService: Endpoint 2 — reindex summaries only
    Admin->>Controller: POST /api/ai/admin/reindex-summaries
    Controller->>SummaryService: reindexAll()
    SummaryService->>LessonQueryService: findAllWithArticleContent()
    loop For each lesson with non-empty content
        SummaryService->>SummaryService: createJob(LESSON_SUMMARY) + @Async process
        Note over SummaryService: Creates PENDING job per lesson<br/>and fires @Async processor
    end
    SummaryService-->>Controller: count
    Controller-->>Admin: 202 Accepted { "Queued N summary jobs" }
```

**Use case**: Run after initial deployment to backfill embeddings and summaries for existing lessons, or after a bulk content migration.

---

## 5. Workflow 3 — Lesson Summary Generation

Lesson summaries provide structured learning aids (`summaryText`, `keyPoints[]`, `vocabulary[]`). They are co-triggered by the same `LessonContentUpdatedEvent` as embeddings, running in parallel on separate async threads.

### 5.1 Trigger Flow

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

### 5.2 Gemini Prompt Structure

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

### 5.3 Summary Retrieval

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

## 6. Workflow 4 — Quiz Generation & Attempts

Instructors generate multiple-choice quizzes from lesson content. Students take the quiz without seeing answers; correct answers and explanations are revealed only after submission.

### 6.1 Quiz Generation Flow (Instructor)

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

### 6.2 Student Quiz Flow

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

### 6.3 Instructor Quiz Review

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

### 6.4 Answer Masking Strategy

| Field | Student View (`/take`) | Post-Submission (`/attempts`) | Instructor View |
|-------|----------------------|-------------------------------|-----------------|
| `question` | ✅ | ✅ | ✅ |
| `options[]` | ✅ | ✅ | ✅ |
| `correctIndex` | ❌ hidden | ✅ revealed | ✅ |
| `explanation` | ❌ hidden | ✅ revealed | ✅ |

---

## 7. Workflow 5 — RAG Chat (Synchronous & SSE Streaming)

The Retrieval-Augmented Generation chat allows students and instructors to ask natural-language questions about course material. The system retrieves the most semantically relevant lesson chunks, classifies answer confidence, and generates a grounded response using Gemini.

### 7.1 Full RAG Pipeline

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

### 7.2 SSE Streaming Flow

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

### 7.3 Confidence Tier Classification

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

### 7.4 Rate Limiting Detail

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

### 7.5 SSE Security Context Propagation

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

## 8. Cross-Cutting Concerns

### 8.1 ACL Enforcement Matrix

| Feature | Endpoint | Instructor | Enrolled Student | Notes |
|---------|----------|:----------:|:----------------:|-------|
| Request transcription | `POST /transcribe/lessons/{id}` | ✅ | ❌ | Must own the lesson's course; TEACHER role |
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
| Reindex summaries | `POST /admin/reindex-summaries` | — | — | Admin role |

All ACL checks use cross-module API interfaces (`LessonQueryService`, `EnrollmentQueryService`, `CourseQueryService`) — no direct imports of other modules' repositories.

### 8.2 Thread Pool Configuration

```yaml
# application.yml — AI async executors
ai:
  executor:
    ai-core-pool-size: ${AI_CORE_POOL_SIZE:2}        # Base threads for Gemini jobs
    ai-max-pool-size: ${AI_MAX_POOL_SIZE:5}          # Max concurrent Gemini jobs
    ai-queue-capacity: ${AI_QUEUE_CAPACITY:50}       # Job queue depth before rejection
    whisper-queue-capacity: ${WHISPER_QUEUE_CAPACITY:10}  # Max queued transcription jobs
  groq:
    retry-delay-seconds: 60              # Seconds before retrying a DELAYED job

# whisperTaskExecutor — single thread, serialises Groq calls
# Configured in AsyncConfig: corePoolSize=1, maxPoolSize=1, queueCapacity=whisper-queue-capacity

# WebMvcConfig — SSE async executor
WebMvcConfig:
  core: 4
  max: 10
  queue: 50
  timeout: 300_000ms                     # 5 minutes max SSE connection
```

### 8.3 Gemini Configuration

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

### 8.4 Groq Configuration

```yaml
# application.yml
ai:
  groq:
    api-url: https://api.groq.com/openai/v1/audio/transcriptions
    api-key: ${GROQ_API_KEY:}            # Optional at startup
    model: whisper-large-v3-turbo
    language: en
    retry-delay-seconds: 60
  ytdlp:
    path: ${YTDLP_PATH:yt-dlp}           # Override with full path e.g. /usr/local/bin/yt-dlp
```

---

## 9. Database Schema

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
    id            BIGSERIAL PRIMARY KEY,
    job_type      VARCHAR(50),          -- EMBEDDING, LESSON_SUMMARY, QUIZ_GENERATION, TRANSCRIPTION
    status        VARCHAR(20),          -- PENDING, PROCESSING, COMPLETED, FAILED, DELAYED
    user_id       BIGINT,
    reference_id  BIGINT,              -- lessonId on create; updated to quizId on quiz completion
    error_message TEXT,
    started_at    TIMESTAMP,
    completed_at  TIMESTAMP,
    next_retry_at TIMESTAMP,           -- Set when status=DELAYED; TranscriptionRetryScheduler checks this
    metadata      TEXT,               -- Job-specific data: videoUrl for TRANSCRIPTION jobs (V34 migration)
    created_at    TIMESTAMP,
    updated_at    TIMESTAMP
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

## 10. API Reference

All endpoints are under `/api/ai/**` (proxied through API Gateway on port 8080).

### Job Management

| Method | Path | Auth | Response | Description |
|--------|------|------|----------|-------------|
| `GET` | `/ai/jobs/{id}` | Job owner | `AiJobResponse` | Poll async job status |

### Embeddings (Admin)

| Method | Path | Auth | Response | Description |
|--------|------|------|----------|-------------|
| `POST` | `/ai/admin/reindex-embeddings` | Admin | `202 Accepted` | Backfill embeddings for all lessons with article content |
| `POST` | `/ai/admin/reindex-summaries` | Admin | `202 Accepted` | Backfill summaries for all lessons with article content |

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

### Auto-Transcription

| Method | Path | Auth | Response | Description |
|--------|------|------|----------|-------------|
| `POST` | `/ai/transcribe/lessons/{lessonId}` | Teacher (course owner) | `202 { jobId }` | Request transcription from Cloudinary or YouTube URL |

Request body: `{ "videoUrl": "https://..." }`

### RAG Chat

| Method | Path | Auth | Response | Description |
|--------|------|------|----------|-------------|
| `POST` | `/ai/chat/courses/{courseId}` | Enrolled / Instructor | `ChatResponse` | Synchronous RAG Q&A |
| `POST` | `/ai/chat/courses/{courseId}/stream` | Enrolled / Instructor | `text/event-stream` | SSE streaming RAG Q&A |

---

## 11. Error Scenarios

### Job Processing Errors

| Error | Cause | Outcome |
|-------|-------|---------|
| Lesson content is blank | Lesson has no text content | Job → `FAILED("no content")` |
| Gemini API key missing | `GEMINI_API_KEY` not set | `AsyncEmbeddingProcessor` guards with null check; Job → `FAILED` |
| Gemini API error | Network or quota issue | Exception caught; Job → `FAILED(errorMessage)` |
| JSON parse failure | Gemini returns malformed JSON | `AiResponseParseException` thrown; Job → `FAILED` |
| Quiz count mismatch | Gemini returns fewer questions than requested | Validation throws; Job → `FAILED` |

### Transcription Errors

| Error | Cause | HTTP Status / Outcome |
|-------|-------|----------------------|
| Lesson not found | Invalid `lessonId` | `404 Not Found` (sync, before job created) |
| Not lesson owner | `userId != lesson.instructorId` | `403 Forbidden` (sync, before job created) |
| Unsupported URL type | URL is neither Cloudinary nor YouTube | Job → `FAILED("Unsupported URL type")` |
| Audio file > 25 MB | Cloudinary/yt-dlp audio exceeds Groq limit | `AudioFileTooLargeException`; Job → `FAILED` |
| Groq rate limit (429) | > 20 req/min to Groq API | `GroqRateLimitException`; Job → `DELAYED`, retried after 60s |
| Groq API key missing | `GROQ_API_KEY` not set | Groq `RestClient` sends no auth header; Job → `FAILED(401)` |
| yt-dlp not installed | Binary not found on PATH | `IOException("yt-dlp binary not found")`; Job → `FAILED` |
| yt-dlp timeout | Video download exceeds 10 minutes | `IOException("Command timed out")`; Job → `FAILED` |
| Scheduler queue full | `whisperTaskExecutor` queue at capacity | Job kept `DELAYED`, `nextRetryAt = now + 30s` |

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

## 12. Key Implementation Details

### Idempotency

- **Embeddings**: `AsyncEmbeddingProcessor` calls `deleteByLessonId()` before re-inserting chunks. Re-triggering the same lesson is safe.
- **Summaries**: `LessonSummaryRepository.upsert()` uses `INSERT ... ON CONFLICT (lesson_id) DO UPDATE`. Re-triggering overwrites with the latest result.
- **Quizzes**: Each generation creates a new `GeneratedQuiz` row. Multiple generations accumulate; students always receive the most recent one.
- **Transcription**: Each call creates a new `AiJobLog`. Re-submitting the same lesson creates a new job but the end result is an `updateArticleContent` overwrite — safe to retry.

### Transcription Temp File Lifecycle

All transcription code paths write audio/subtitle files to the OS temp directory (`/tmp`) and **must** delete them in `finally` blocks to avoid disk leaks:

```
Cloudinary path:  cld_*.mp3           → deleted in WhisperTranscriptionServiceImpl finally
YouTube captions: ytdlp_sub_*.en.vtt  → deleted in YouTubeTranscriptExtractor finally
YouTube audio:    ytdlp_audio_*.mp3   → deleted in WhisperTranscriptionServiceImpl finally
```

The `Files.deleteIfExists(tempFile)` call is in `finally` so it runs even if the Groq call fails or throws `AudioFileTooLargeException`.

### Security Context in Async Threads

All async AI threads (SSE streaming via `SseEmitter`) require access to the JWT `SecurityContext` to call cross-module services that check the current user. `WebMvcConfig` registers a `DelegatingSecurityContextAsyncTaskExecutor` that copies the parent thread's context into each spawned thread.

### Cross-Module API Contracts

The AI module never imports internal classes from the `course` module. It depends exclusively on interfaces in `course/api/`:

```
modules/course/api/
  ├── LessonQueryService       (getLessonInfo, getLessonContent, findLesson, isInstructorOfLesson)
  ├── LessonWriteService       (updateArticleContent) ← added for transcription
  ├── EnrollmentQueryService   (isEnrolled)
  └── CourseQueryService       (isInstructor, findCourse)
```

`LessonWriteService.updateArticleContent()` is the write-side contract. It saves the transcript, then publishes `LessonContentUpdatedEvent` (only if content changed), which drives the downstream embedding and summary pipelines.

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

**Last Updated**: 2026-03-04 — Added lesson-creation trigger for `LessonContentUpdatedEvent` (`LessonServiceImpl.createLesson`)
**Status**: Core functionality complete (Embedding, Summary, Quiz, RAG Chat, Auto-Transcription)
