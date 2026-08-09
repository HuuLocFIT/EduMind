# EduMind Frontend Monorepo

> **Status:** Active Development
> **Monorepo Strategy:** [Nx](https://nx.dev)
> **Engine:** Node.js 20 LTS

Welcome to the **EduMind** frontend repository. This workspace follows a unified monorepo architecture, housing both the **React-based User Platform** and the **Angular-based Admin Console**, backed by shared TypeScript libraries.

---

## Technology Stack

| Domain | Technology | Version |
| :--- | :--- | :--- |
| **Monorepo** | Nx | v22 |
| **User App** | React + Vite | v19 / v7 |
| **Admin App** | Angular | v20 |
| **Language** | TypeScript | v5.9 |
| **Styling** | Tailwind CSS | v3.4 |
| **Testing** | Vitest | v3.0 |

### User Application (`apps/user`)

A consumer-facing learning platform.

- **Core**: React 19, Vite, TypeScript
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) (client state), [TanStack Query v5](https://tanstack.com/query) (server state)
- **Forms & Validation**: React Hook Form + Zod
- **UI System**: Tailwind CSS, Headless UI, Lucide React (icons)
- **Utilities**: Date-fns, Axios, JWT Decode
- **Testing**: Vitest (unit/integration)

### Admin Application (`apps/admin`)

A management console for platform operators.

- **Core**: Angular 20 (Zone.js enabled)
- **Reactive Programming**: RxJS 7.8
- **Architecture**: Modular layout with separation of Core, Features, and Layouts
- **Bundler**: Angular CLI (`@angular/build`)

---

## Architecture & Path Aliases

This project uses **strict module boundaries**, **workspace libraries**, and **path aliases** to maintain clean imports and separation of concerns.

### Path Mapping

| Alias | Resolves To | Purpose |
| :--- | :--- | :--- |
| **Shared Libs** | | |
| `@edumind/shared-types` | `libs/shared/types/src` | Zod schemas & shared DTOs |
| `@edumind/shared-constants` | `libs/shared/constants/src` | Global config & constants |
| `@edumind/shared-utils` | `libs/shared/utils/src` | Env config, helpers, routes, API helpers |
| `@edumind/user-ui` | `libs/user/ui/src` | Shared React UI components |
| **User App** | | |
| `@user/stores` | `apps/user/src/app/stores` | Zustand stores |
| `@user/services` | `apps/user/src/app/services` | API clients (`apiClient`, domain services) |
| `@user/components` | `apps/user/src/app/components` | Reusable UI atoms & compounds |
| `@user/pages` | `apps/user/src/app/pages` | Route-level views |
| **Admin App** | | |
| `@admin/core` | `apps/admin/src/app/core` | Guards, interceptors, singleton services |
| `@admin/features` | `apps/admin/src/app/features` | Lazy-loaded smart modules |
| `@admin/layouts` | `apps/admin/src/app/layouts` | Layout components |

### User App Architecture (React, `apps/user`)

**Directory layout:**

```text
apps/user/src/app/
├── services/        # HTTP/API services (all Axios calls via apiClient)
├── stores/          # Zustand stores (UI + auth/cart orchestration only)
├── components/      # Reusable presentational/compound components
├── layouts/         # App-wide layouts (auth, main, teacher)
├── pages/           # Route-level pages (public, dashboard, learning, teacher, payment)
└── lib/             # Query client/config, query keys, shared infra
```

- **State management**:
  - **TanStack Query v5** for all server-side data (courses, lessons, orders, etc.)
  - **Zustand** only for client/UI state (auth snapshot, cart state, modals, layout toggles, AI chat history)
- **API layer**:
  - All HTTP traffic goes through `api-client.service.ts` and domain services in `services/`
  - `@edumind/shared-utils` provides `API_URL`, endpoint constants (`AI_ENDPOINTS`, etc.), and `unwrapApiResponse`
- **Routing**:
  - Central router in `app.tsx`, with lazy-loaded pages (`createLazyRoute()`) and guards (`ProtectedRoute`, `TeacherGuard`)

### Admin App Architecture (Angular, `apps/admin`)

**Directory layout:**

```text
apps/admin/src/app/
├── core/              # Guards, interceptors, singleton services
├── features/          # Lazy-loaded feature areas (auth, courses, categories, teachers, payments)
├── layouts/           # Main shell layout(s)
└── app.routes.ts      # Top-level route configuration
```

- Each domain lives under `features/` as a coherent module with co-located components, routes, and services
- HTTP via Angular `HttpClient` + RxJS; components prefer `async` pipes and focused observables

### Shared Libraries

| Library | Path | Purpose |
| :--- | :--- | :--- |
| `@edumind/shared-types` | `libs/shared/types` | Zod schemas + TypeScript types for all DTOs |
| `@edumind/shared-constants` | `libs/shared/constants` | API endpoint constants, global config |
| `@edumind/shared-utils` | `libs/shared/utils` | Env config (`API_URL`), routes, helpers, response unwrapping |
| `@edumind/user-ui` | `libs/user/ui` | Shared React UI primitives for the user app |

---

## AI Features

The user app integrates five AI capabilities, all backed by the `ai.service.ts` service and Zod schemas in `@edumind/shared-types`.

### Async Job Pattern

All generation operations are asynchronous. Every trigger returns `202 Accepted` with a `jobId`. State machine:

```
PENDING → PROCESSING → COMPLETED / FAILED / DELAYED
```

- `DELAYED`: rate limit hit on the backend (Groq 429); job will be retried automatically
- `pollJobUntilDone(jobId, onTick, intervalMs)` in `ai.service.ts` polls until a terminal state
- Progress UI is handled inside each modal component

### 1. RAG Chat (`AiChatPanel.tsx`)

Floating AI Course Tutor panel for students. Sends questions + conversation history to a vector-search backed chat endpoint.

- **Endpoint**: `POST /api/ai/chat/courses/{courseId}/stream` (SSE)
- **Rate limit**: 20 questions/day per user; HTTP 429 shows "20 questions/day limit reached"
- **SSE event types**:
  - `event: metadata` — JSON with source lessons and confidence tier (`HIGH`/`MEDIUM`/`GAP`)
  - `event: error` — JSON error message
  - `data: <token>` — streamed LLM token
- **Knowledge-gap logging**: When a response is classified `GAP` (low retrieval confidence), the backend silently logs the question to `ai.knowledge_gap_questions` for later content-gap analysis — this is not surfaced anywhere in the UI
- **Typewriter effect**: Tokens are buffered and flushed at 60 fps via `setInterval`
- **Conversation history**: Last 4 turns sent to backend for context
- **Source attribution**: Source lesson badges displayed per response with confidence tier color coding
- **Markdown rendering**: `react-markdown` + `rehype-raw` + syntax highlighter with copy buttons
- **Persistence**: Chat history persisted per course via Zustand (`useAiChatStore`)
- **Cancellation/fallback**: `AbortController` signal passed to `chatStream()`. On stream error, behavior depends on whether any chunk was already received: if none, it retries via the non-streaming `aiService.chat()`; if some were already streamed, it shows "Response may be incomplete. Please try again if needed." instead of retrying, to avoid a duplicate/conflicting answer. HTTP-status errors (429/401/403) and explicit `error` events never trigger the non-streaming fallback.

### 2. Video Transcription (`TranscriptionModal.tsx`)

Teachers can auto-transcribe video lessons. Supports Cloudinary-hosted videos and YouTube URLs.

- **Endpoint**: `POST /api/ai/transcribe/lessons/{lessonId}` — teacher-only
- **Sources**:
  - Cloudinary: extracts MP3 audio via URL transformation
  - YouTube: tries auto-captions first (fast/free), falls back to audio download
- **Rate limiting**: If Groq returns 429, job status becomes `DELAYED` — the UI shows "will retry automatically"
- **On success**: Transcribed text is applied to the lesson's article content field, which triggers embedding + summary generation automatically on the backend; a WebVTT caption file is also generated and stored as `videoCaptionUrl`
- **Captions in player**: `VideoPlayer.tsx` renders a native `<track kind="captions">` sourced from `videoCaptionUrl`, with a "CC" toggle button to show/hide captions
- **Transcript card**: The course player shows an expandable transcript (from the lesson's article content) with a "Download" button that saves it as a `.txt` file
- **Phases**: `config → processing → completed / failed`

### 3. Quiz Generation (`QuizGeneratorModal.tsx`)

Teachers can generate multiple-choice quizzes from lesson content.

- **Endpoint**: `POST /api/ai/quizzes/generate` (triggers async job)
- **Configurable**: 1–50 questions via numeric input (default 5)
- **Multi-lesson source**: For `QUIZ`-type lessons, a per-section checkbox picker lets the teacher select multiple source lessons to aggregate content from (`sourceLessonIds`); `VIDEO`/`ARTICLE` lessons always generate from their own content only
- **Teacher view**: Correct answer highlighted + collapsible explanation per question
- **Student view**: Correct answers and explanations hidden until after attempt submission
- **History**: Previous quizzes for the lesson shown in an accordion
- **Phases**: `config → generating → completed / failed`

### 4. Lesson Summary (`LessonSummaryPanel`)

Auto-generated structured summaries displayed on the course player page.

- **Endpoint**: `GET /api/ai/summaries/lesson/{lessonId}`
- **Format**: `summaryText`, `keyPoints[]`, `vocabulary[]`
- Generated automatically when lesson content is updated (triggered server-side by `LessonContentUpdatedEvent`)

### 5. Quiz Taking (`CoursePlayerPage.tsx`)

Students can take quizzes directly in the course player.

- "Take Quiz" button enabled only when a quiz exists for the lesson (`aiService.getQuizForStudent()`)
- `QuizTakerModal` handles the attempt flow
- On passing: lesson is marked complete

---

## Schemas (`libs/shared/types/src/lib/ai.schemas.ts`)

All AI request/response types are Zod schemas:

| Schema | Purpose |
| :--- | :--- |
| `AiJobStatus` | Enum: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `DELAYED` |
| `AiJobResponseSchema` | Job state, error message, retry timestamps |
| `QuizQuestionDtoSchema` | Question, 4 options, optional `correctIndex` + `explanation` |
| `GeneratedQuizResponseSchema` | Quiz with all questions for a lesson |
| `SubmitQuizAttemptRequestSchema` | Lesson/quiz IDs + selected answer indices |
| `QuizAttemptResponseSchema` | Score, percentage, full question review |
| `LessonSummaryResponseSchema` | Summary text, key points, vocabulary |
| `ChatRequestSchema` | Question + optional conversation history |
| `TranscribeRequestSchema` | Video URL (validated as URL) |

---

## Project Structure

```text
frontend/
├── apps/
│   ├── admin/               # Angular Admin Console
│   └── user/                # React User Platform
├── libs/
│   ├── admin/               # Admin-specific libraries
│   ├── shared/              # Shared logic (types, utils, constants)
│   └── user/                # User-specific libraries
├── tools/                   # Workspace scripts
├── nx.json                  # Nx configuration
├── package.json             # Root dependencies
└── tsconfig.base.json       # Base TS config & path aliases
```

---

## Getting Started

### Prerequisites
- **Node.js**: 20.x (LTS)
- **Package Manager**: npm

### Installation
```sh
npm install
```

### Environment & Backend Integration

Both frontends talk to the **API Gateway** on `http://localhost:8080`.

- **User App (React)**: Create `apps/user/.env` (or `.env.local`):
  ```
  VITE_API_URL=http://localhost:8080
  ```
- **Admin App (Angular)**: Edit `apps/admin/src/environments/environment.ts` — default `apiUrl` is `http://localhost:8080`.

### Development Server

```sh
# Start User App (http://localhost:3000)
npm run start:user

# Start Admin App (http://localhost:4200)
npm run start:admin

# Start both in parallel
npm start
```

### Quality Checks

```sh
# Lint all apps and libs
npm run lint

# User app tests (Vitest)
npm run test:user
npm run test:user:watch      # watch mode
npm run test:user:coverage   # with coverage

# Run a single test file
nx test user -- apps/user/src/app/services/ai.service.test.ts

# Admin app tests
npm run test:admin

# All tests
npm test
```

### Build for Production

```sh
npm run build:user    # User app only
npm run build:admin   # Admin app only
npm run build         # All projects
```

---

## Contribution Guidelines

1. **Strict Typing**: No `any`. Define interfaces as Zod schemas in `@edumind/shared-types` if reused across files.
2. **State Management**:
   - **Zustand** for global client/UI state (modals, sidebar, AI chat history).
   - **TanStack Query** for all server data fetching and caching. Never store server data in Zustand.
3. **API Calls**: All HTTP calls go through service files (`*.service.ts`) using `apiClient`. Never call `axios` directly from components.
4. **Routing**: All page routes use `createLazyRoute()` for code splitting.
5. **Commits**: Follow conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`).

---

## Commands Reference

| Command | Action |
| :--- | :--- |
| `npm run start:user` | Start React dev server (`apps/user`, port 3000) |
| `npm run start:admin` | Start Angular dev server (`apps/admin`, port 4200) |
| `npm start` | Run all `serve` targets via Nx |
| `npm run build:user` | Production build for the React user app |
| `npm run build:admin` | Production build for the Angular admin app |
| `npm run build` | Build all frontend projects |
| `npm run test:user` | Run Vitest tests for the user app |
| `npm run test:user:watch` | Watch mode for user app tests |
| `npm run test:user:coverage` | Coverage report for user app tests |
| `npm run test:admin` | Run tests for the admin app |
| `npm test` | Run all tests via Nx |
| `npm run lint` | Lint all apps and libs |
| `nx graph` | Visualize project and dependency graph |
| `nx reset` | Clear the Nx cache |
