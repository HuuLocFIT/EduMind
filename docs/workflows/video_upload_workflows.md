# Video Upload & Streaming Workflows

This document describes the complete video management pipeline in EduMind LMS — from a teacher uploading a video file to a student streaming it. The system uses **Cloudinary** as the video host with direct browser-to-Cloudinary chunked uploads (signed by the backend) and HLS adaptive-bitrate streaming.

---

## 1. Architecture Overview

```mermaid
graph TB
    subgraph TeacherUI["Teacher UI (React)"]
        VDZ["VideoDropZone<br/>(drag-and-drop, status display)"]
        Store["uploadQueue.store<br/>(Zustand + localStorage)<br/>MAX_CONCURRENT = 2"]
        Svc["video-upload.service<br/>(chunked XHR, 20 MB/chunk)"]
    end

    subgraph Backend["Backend — LessonController (/lessons/**)"]
        SigEP["POST /{id}/video/signature<br/>(generate signed params)"]
        ConfEP["PATCH /{id}/video<br/>(confirm upload)"]
        DelEP["DELETE /{id}/video<br/>(delete video)"]
        ResetEP["POST /{id}/video/reset<br/>(reset stale lock)"]
        LessonSvc["LessonServiceImpl"]
        Scheduler["StaleVideoUploadScheduler<br/>@Scheduled every 30 min"]
    end

    subgraph Cloudinary["Cloudinary"]
        Upload["Upload API<br/>(chunked, resumable)"]
        HLS["HLS Streaming<br/>sp_auto/{publicId}.m3u8"]
    end

    subgraph DB["PostgreSQL — course.lessons"]
        Fields["videoUploadStatus<br/>videoPublicId<br/>videoUrl<br/>hasHls<br/>videoDuration"]
    end

    subgraph StudentUI["Student UI (React)"]
        Player["CoursePlayerPage<br/>(HLS player + fallback)"]
    end

    VDZ --> Store --> Svc
    Svc -->|"1. GET signed params"| SigEP --> LessonSvc --> DB
    Svc -->|"2. Upload chunks"| Upload
    Svc -->|"3. Confirm"| ConfEP --> LessonSvc --> DB
    LessonSvc -->|"build HLS URL"| HLS
    DelEP --> LessonSvc -->|"cloudinaryService.deleteFile()"| Cloudinary
    ResetEP --> LessonSvc --> DB
    Scheduler --> DB

    Player -->|"GET lesson"| Backend
    Player -->|"videoStreamUrl (HLS)"| HLS
    Player -->|"videoUrl fallback (MP4)"| Cloudinary
```

### Key Design Principles

- **Browser-to-Cloudinary Direct Upload**: The backend never proxies video bytes. It only issues signed upload parameters; the browser uploads directly to Cloudinary. This keeps VPS bandwidth and RAM usage near zero.
- **Signed Upload Params**: Each upload is authorized via a backend-generated HMAC-SHA1 signature (Cloudinary upload preset + timestamp). Signatures expire; the frontend requests a fresh signature per upload.
- **Chunked & Resumable**: Videos are split into 20 MB chunks using the `Content-Range` header. If a session is interrupted (network drop, page reload), the `bytesUploaded` cursor stored in localStorage allows resuming from the last confirmed chunk.
- **HLS Adaptive Streaming**: After upload, the backend stores `hasHls=true` and builds a Cloudinary HLS URL (`sp_auto`). Cloudinary transcodes and serves adaptive bitrate streams — no server-side transcoding on the VPS.
- **Graceful Fallback**: If `videoStreamUrl` is absent (e.g., `hasHls=false` for legacy lessons), the player falls back to direct MP4 via `videoUrl`.

---

## 2. Video Upload Status State Machine

```mermaid
stateDiagram-v2
    [*] --> NONE : Lesson created (no video)
    NONE --> UPLOADING : POST /signature (teacher starts upload)
    UPLOADING --> READY : PATCH /video (upload confirmed)
    UPLOADING --> FAILED : StaleVideoUploadScheduler<br/>(stuck > 2 hours)
    UPLOADING --> FAILED : Unrecoverable upload error
    FAILED --> UPLOADING : POST /reset → retry upload
    READY --> UPLOADING : Teacher replaces video<br/>(old video deleted, new upload starts)
    READY --> NONE : DELETE /video
    FAILED --> [*] : Terminal until manual retry
```

| Status | Description |
|--------|-------------|
| `NONE` | No video attached. Lesson has no `videoPublicId` or `videoUrl`. |
| `UPLOADING` | Backend issued signature; browser is uploading chunks to Cloudinary. |
| `READY` | Upload confirmed. `videoUrl`, `videoPublicId`, `hasHls=true`, and `videoDuration` are set. |
| `FAILED` | Upload did not complete. Caused by timeout, network error, or scheduler cleanup. |

**Stale upload cleanup**: `StaleVideoUploadScheduler` runs every **30 minutes**. It finds all lessons with `videoUploadStatus = UPLOADING` where `updatedAt < now − 2 hours` and marks them `FAILED`. This prevents a crashed browser session from permanently blocking new uploads on that lesson.

---

## 3. Teacher Upload Flow

### 3.1 High-Level Upload Sequence

```mermaid
sequenceDiagram
    participant Teacher
    participant VDZ as VideoDropZone
    participant Queue as uploadQueue.store<br/>(MAX_CONCURRENT=2)
    participant UploadSvc as video-upload.service
    participant Backend as LessonController
    participant LessonSvc as LessonServiceImpl
    participant CldAPI as Cloudinary Upload API
    participant DB as course.lessons

    Teacher->>VDZ: Drop / select file (MP4/WebM/MOV, ≤ 2 GB)
    VDZ->>Queue: enqueue({ lessonId, lessonTitle, file })
    Queue->>Queue: status = QUEUED
    Note over Queue: Waits if 2 uploads already active

    Queue->>UploadSvc: _executeUpload(job)
    Queue->>Queue: status = UPLOADING

    UploadSvc->>Backend: POST /lessons/{id}/video/signature
    Backend->>LessonSvc: generateVideoUploadSignature(lessonId, instructorId)

    LessonSvc->>DB: SELECT lesson (validate ownership)
    alt Lesson not found or instructor mismatch
        LessonSvc-->>Backend: 403 / 404
        Backend-->>UploadSvc: Error
        UploadSvc-->>Queue: status = FAILED
    end

    alt videoUploadStatus == UPLOADING (duplicate guard)
        LessonSvc-->>Backend: 409 Conflict "already uploading"
        Backend-->>UploadSvc: Error (stale lock)
        UploadSvc->>Backend: POST /lessons/{id}/video/reset
        Backend->>LessonSvc: resetVideoUploadState()
        LessonSvc->>DB: status = FAILED
        UploadSvc->>Backend: POST /lessons/{id}/video/signature (retry)
    end

    alt Active uploads ≥ 5 for this instructor (rate limit)
        LessonSvc-->>Backend: 429 Too Many Requests
        Backend-->>UploadSvc: Error
        UploadSvc-->>Queue: status = FAILED
    end

    LessonSvc->>DB: status = UPLOADING
    LessonSvc-->>Backend: VideoSignatureResponse
    Backend-->>UploadSvc: { cloudName, apiKey, signature, timestamp, folder }

    loop Chunks (20 MB each)
        UploadSvc->>CldAPI: PUT /video/upload<br/>Content-Range: bytes {start}-{end}/{total}<br/>X-Unique-Upload-Id: {sessionId}
        CldAPI-->>UploadSvc: 200 (partial) / 200 (final with metadata)
        UploadSvc->>Queue: update progress%, bytesUploaded
        Queue->>Queue: persist to localStorage (throttled 200 ms)
    end

    Note over UploadSvc,CldAPI: Final chunk → Cloudinary returns<br/>{ secure_url, public_id, duration, format }

    UploadSvc->>Backend: PATCH /lessons/{id}/video<br/>{ cloudinaryUrl, publicId, duration }
    Backend->>LessonSvc: confirmVideoUpload(lessonId, request, instructorId)
    LessonSvc->>DB: videoUrl = cloudinaryUrl<br/>videoPublicId = publicId<br/>videoDuration = duration<br/>hasHls = true<br/>videoUploadStatus = READY

    LessonSvc-->>Backend: LessonResponse (with videoStreamUrl)
    Backend-->>UploadSvc: 200 OK
    UploadSvc-->>Queue: status = DONE
    Queue->>VDZ: onVideoReady() callback
```

### 3.2 Chunked Upload Details

```
File:  video.mp4 (e.g., 150 MB)
Chunk size: 20 MB

Chunk 1:  Content-Range: bytes 0-20971519/157286400
Chunk 2:  Content-Range: bytes 20971520-41943039/157286400
...
Chunk 8:  Content-Range: bytes 146800640-157286399/157286400  ← final chunk
          Response: { secure_url, public_id, duration, bytes, format }
```

- **Session ID** (`X-Unique-Upload-Id`): UUID generated per upload session. Stored in `localStorage` alongside `bytesUploaded`. Allows resuming from the exact byte offset if the browser is closed and reopened.
- **Range mismatch**: If Cloudinary reports a different byte offset than expected (e.g., after a partial retry), the frontend detects this, clears the saved session, and **restarts the upload from byte 0** with a new `uploadSessionId`.

### 3.3 Retry & Error Handling

```
Chunk upload fails (network error / 5xx)
  └─→ Attempt 1: wait 2s, retry same chunk
  └─→ Attempt 2: wait 4s, retry same chunk
  └─→ Attempt 3: wait 8s, retry same chunk
  └─→ All 3 attempts fail → status = FAILED

Stale lock error (409 on /signature)
  └─→ POST /lessons/{id}/video/reset  (backend: UPLOADING → FAILED)
  └─→ Retry full upload flow from /signature

Range mismatch from Cloudinary
  └─→ Generate new uploadSessionId
  └─→ Reset bytesUploaded = 0
  └─→ Restart upload from chunk 0
```

### 3.4 Pause / Resume

```
Teacher clicks Pause
  └─→ AbortController.abort()  (cancels in-flight XHR)
  └─→ status = PAUSED
  └─→ { bytesUploaded, uploadSessionId } persisted in localStorage

Teacher clicks Resume (or browser comes back online)
  └─→ status = UPLOADING (activity = RESUMING)
  └─→ _executeUpload() called again
  └─→ GET /signature (new signed params from backend)
  └─→ Resume from chunk at bytesUploaded offset
  └─→ X-Unique-Upload-Id: same uploadSessionId
```

**Auto-pause/resume**: The store listens to `window.offline` and `window.online` events. All active uploads are paused on network loss and automatically resumed when connectivity is restored.

### 3.5 Video Deletion

```mermaid
sequenceDiagram
    participant Teacher
    participant VDZ as VideoDropZone
    participant Backend as LessonController
    participant LessonSvc as LessonServiceImpl
    participant CldSvc as CloudinaryService
    participant DB as course.lessons

    Teacher->>VDZ: Click "Delete video"
    VDZ->>Backend: DELETE /lessons/{id}/video
    Backend->>LessonSvc: deleteVideo(lessonId, instructorId)
    LessonSvc->>DB: SELECT lesson (validate ownership & READY status)
    LessonSvc->>CldSvc: deleteFile(videoPublicId, "video")
    CldSvc-->>LessonSvc: OK (or warn on failure — non-blocking)
    LessonSvc->>DB: videoUrl = null<br/>videoPublicId = null<br/>hasHls = false<br/>videoDuration = null<br/>videoUploadStatus = NONE
    LessonSvc-->>Backend: void
    Backend-->>VDZ: 200 OK
    VDZ->>VDZ: onVideoRemoved() callback
```

**Cascade delete**: When a lesson is deleted entirely (`DELETE /lessons/{id}`), `CourseEventListener.handleLessonDeleted()` fires asynchronously after the transaction commits. It calls `cloudinaryService.deleteFile(videoPublicId, "video")` if the lesson had a video — preventing orphaned files in Cloudinary.

---

## 4. Student Streaming Flow

### 4.1 HLS Streaming (Primary Path)

```mermaid
sequenceDiagram
    participant Student
    participant Player as CoursePlayerPage
    participant Backend as LessonController
    participant DB as course.lessons
    participant Cloudinary

    Student->>Player: Navigate to course player (lessonId)
    Player->>Backend: GET /lessons/{lessonId}
    Backend->>DB: SELECT lesson
    Backend-->>Player: LessonResponse<br/>{ videoStreamUrl, videoUrl, ... }

    alt videoStreamUrl present (hasHls = true)
        Player->>Player: Load HLS player<br/>src = videoStreamUrl
        Player->>Cloudinary: GET /video/upload/sp_auto/{publicId}.m3u8
        Cloudinary-->>Player: M3U8 manifest (adaptive bitrate variants)
        Player->>Cloudinary: Fetch video segments (.ts chunks)
        Cloudinary-->>Player: Video stream

        Note over Player: Cloudinary auto-selects bitrate variant<br/>based on client bandwidth

    else videoStreamUrl absent (hasHls = false — legacy video)
        Player->>Player: Load standard <video> player<br/>src = videoUrl (direct MP4)
        Player->>Cloudinary: GET /{publicId}.mp4
        Cloudinary-->>Player: MP4 file (full download)
    end
```

### 4.2 HLS URL Pattern

```
Template:  https://res.cloudinary.com/{cloudName}/video/upload/sp_auto/{publicId}.m3u8
                                                              ───────
                                                              sp_auto = Streaming Profile "auto"
                                                              Cloudinary generates adaptive bitrate variants

Example:   https://res.cloudinary.com/edumind/video/upload/sp_auto/courses/lesson_42_abc123.m3u8
```

| Parameter | Value | Notes |
|-----------|-------|-------|
| `sp_auto` | Streaming profile | Cloudinary auto-transcodes on first request; cached thereafter |
| Format | `.m3u8` | HLS manifest pointing to `.ts` segment chunks |
| Fallback | `.mp4` via `videoUrl` | Used when `hasHls = false` |

### 4.3 Progress Tracking & Resume Playback

```
On video timeupdate (throttled):
  └─→ Save { lessonId, currentTime } to localStorage every ~10 seconds
  └─→ POST /enrollments/{enrollmentId}/progress (background)

On video metadata loaded:
  └─→ Read savedTime from localStorage
  └─→ If savedTime > 0: player.currentTime = savedTime (seek to last position)

On video ended:
  └─→ Mark lesson as COMPLETED
  └─→ Auto-advance to next lesson (if available)

Manual "Mark Complete" button:
  └─→ POST /enrollments/{enrollmentId}/lessons/{lessonId}/complete
```

---

## 5. Database Schema (course.lessons — video fields)

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `video_url` | `VARCHAR` | `null` | Cloudinary secure URL (MP4) — set on confirm |
| `video_duration` | `INTEGER` | `null` | Duration in seconds — from Cloudinary metadata |
| `video_upload_status` | `VARCHAR` | `NONE` | Enum: `NONE`, `UPLOADING`, `READY`, `FAILED` |
| `video_public_id` | `VARCHAR` | `null` | Cloudinary public ID (used for deletion & HLS URL) |
| `has_hls` | `BOOLEAN` | `false` | Whether HLS stream URL should be built — set `true` on confirm |

`videoStreamUrl` is a **computed field** — it is not stored in the database. `LessonController.buildStreamUrl()` constructs it on every response:

```java
// Built at response time only if hasHls = true AND videoPublicId is set
"https://res.cloudinary.com/" + cloudName + "/video/upload/sp_auto/" + publicId + ".m3u8"
```

---

## 6. Configuration Reference

| Setting | Location | Value |
|---------|----------|-------|
| Max concurrent uploads per instructor (backend) | `LessonServiceImpl` | 5 |
| Max concurrent uploads (frontend queue) | `uploadQueue.store.ts` | `MAX_CONCURRENT = 2` |
| Chunk size | `video-upload.service.ts` | 20 MB |
| Max retries per chunk | `video-upload.service.ts` | 3 |
| Retry backoff | `video-upload.service.ts` | 2s → 4s → 8s |
| Stale upload cutoff | `StaleVideoUploadScheduler` | 2 hours |
| Scheduler interval | `StaleVideoUploadScheduler` | Every 30 minutes |
| Max file size (frontend) | `VideoDropZone.tsx` | 2 GB |
| Accepted formats | `VideoDropZone.tsx` | MP4, WebM, MOV |
| Progress persistence | `uploadQueue.store.ts` | localStorage (merge strategy) |
| Progress save throttle | `uploadQueue.store.ts` | 200 ms |
