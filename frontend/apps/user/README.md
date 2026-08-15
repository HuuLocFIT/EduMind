# EduMind — User App

React 19 frontend for the EduMind learning platform. Covers public course browsing, student learning (with AI features), payments, and a full teacher portal.

Part of the Nx v22 monorepo at `frontend/`. Run commands from the `frontend/` root unless noted otherwise.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Routing](#routing)
- [State Management](#state-management)
- [API Layer](#api-layer)
- [Services Reference](#services-reference)
- [Component Architecture](#component-architecture)
- [AI Features](#ai-features)
- [Payment Flow](#payment-flow)
- [Teacher Portal](#teacher-portal)
- [Forms](#forms)
- [Testing](#testing)
- [Error Monitoring](#error-monitoring)
- [Path Aliases](#path-aliases)
- [Key Conventions](#key-conventions)

---

## Quick Start

```bash
# From frontend/
npm install
npm run start:user        # Dev server → http://localhost:3000
npm run build:user        # Production build → apps/user/dist/
npm run test:user         # Run tests once
npm run test:user:watch   # Watch mode
npm run test:user:coverage
```

Requires the backend running on `http://localhost:8080` (API Gateway).

---

## Tech Stack

| Concern | Library |
|---------|---------|
| UI Framework | React 19 |
| Build | Vite 7 |
| Language | TypeScript 5.9 (strict) |
| Routing | React Router v6 |
| Server State | TanStack Query v5 |
| Client State | Zustand |
| Forms | React Hook Form + Zod |
| HTTP | Axios (via `apiClient` wrapper) |
| Styling | Tailwind CSS v3 |
| Icons | Lucide React |
| Rich Content | React Markdown + syntax highlighting |
| Testing | Vitest 3 + Testing Library |

---

## Project Structure

```
apps/user/src/
├── main.tsx                    # React DOM entry, global error handlers
├── app/
│   ├── app.tsx                 # BrowserRouter + QueryClientProvider + all routes
│   ├── layouts/
│   │   ├── MainLayout.tsx      # Sticky nav, cart icon, user menu, footer
│   │   ├── AuthLayout.tsx      # Centered layout for auth pages
│   │   └── TeacherLayout.tsx   # Sidebar layout for teacher portal
│   ├── pages/                  # One folder per route group (lazy-loaded)
│   │   ├── auth/               # login, signup, forgot-password, reset, email-verify, 2FA, oauth2
│   │   ├── public/             # home, browse-courses, course-detail
│   │   ├── learning/           # my-learning, course-player
│   │   ├── payment/            # cart, checkout, checkout-success/failed, orders, refunds, sepay-qr
│   │   ├── dashboard/          # student dashboard
│   │   ├── teacher/            # teacher portal (dashboard, courses, students, reviews, earnings, payouts)
│   │   └── teacher-application/# apply-to-teach, application-status
│   ├── components/             # Reusable UI components, grouped by domain
│   │   ├── learning/           # AiChatPanel, LessonSummaryPanel, QuizTakerModal, ArticleViewer
│   │   ├── course-module/      # CourseCard, CourseGrid, CategoryFilter, CurriculumAccordion, ...
│   │   ├── payment-module/     # CartDrawer, CartIcon, CartItem, AddToCartButton
│   │   ├── teacher/            # Course create/edit/list/detail, review management
│   │   └── ui/                 # Generic: RichTextEditor
│   ├── services/               # All HTTP calls, 23 service files
│   ├── stores/                 # Zustand stores (4)
│   ├── lib/
│   │   ├── query-client.ts     # TanStack QueryClient instance & global config
│   │   ├── query-keys.ts       # Centralized query key factory
│   │   └── query-config.ts     # Default staleTime, gcTime, retry settings
│   ├── hooks/                  # Custom React hooks
│   └── ProtectedRoute.tsx      # Auth guard component
└── test/
    └── setup.ts                # Vitest global setup (jsdom mocks, localStorage cleanup)
```

---

## Routing

All page components are **lazy-loaded** via a `createLazyRoute()` wrapper. The router is defined entirely in `app.tsx`.

### Route Groups

#### Public (no auth)

| Path | Page |
|------|------|
| `/` | HomePage |
| `/courses` | BrowseCoursesPage |
| `/courses/:id` | CourseDetailPage |
| `/login` | LoginPage |
| `/signup` | SignupPage |
| `/forgot-password` | ForgotPasswordPage |
| `/reset-password` | ResetPasswordPage |
| `/verify-email` | EmailVerificationPage |
| `/oauth2/callback` | OAuth2CallbackPage |
| `/2fa-recovery` | TwoFactorRecoveryPage |

#### Protected (requires auth — wrapped by `ProtectedRoute`)

| Path | Page |
|------|------|
| `/dashboard` | DashboardPage |
| `/learning` | MyLearningPage |
| `/learning/:courseId` | CoursePlayerPage |
| `/certificates` | CertificatesPage |
| `/wishlist` | WishlistPage |
| `/cart` | CartPage |
| `/checkout` | CheckoutPage |
| `/checkout/success` | CheckoutSuccessPage |
| `/checkout/failed` | CheckoutFailedPage |
| `/checkout/sepay-qr` | SepayQrPage |
| `/orders` | OrdersPage |
| `/orders/:id` | OrderDetailPage |
| `/refunds` | RefundsPage |
| `/refunds/:id` | RefundDetailPage |
| `/profile-settings` | ProfileSettingsPage |
| `/2fa-setup` | TwoFactorSetupPage |
| `/teacher-application` | TeacherApplicationPage |
| `/teacher-application/status` | ApplicationStatusPage |

#### Teacher Portal (requires `UserRole.TEACHER` — wrapped by `TeacherGuard`)

| Path | Page |
|------|------|
| `/teacher/dashboard` | TeacherDashboardPage |
| `/teacher/courses` | TeacherCoursesPage |
| `/teacher/courses/create` | TeacherCourseCreatePage |
| `/teacher/courses/:id/edit` | TeacherCourseEditPage |
| `/teacher/courses/:id` | TeacherCourseDetailPage |
| `/teacher/students` | TeacherStudentsPage |
| `/teacher/reviews` | TeacherReviewsPage |
| `/teacher/analytics` | TeacherAnalyticsPage |
| `/teacher/earnings` | TeacherEarningsPage |
| `/teacher/payouts` | TeacherPayoutsPage |
| `/teacher/payouts/:id` | TeacherPayoutDetailPage |
| `/teacher/settings` | TeacherSettingsPage |

### Guards

- **`ProtectedRoute`** — reads `isAuthenticated` from `useAuthStore`. Redirects to `/login?redirect=<currentPath>` if unauthenticated.
- **`TeacherGuard`** — checks `user.role === UserRole.TEACHER` from `useAuthStore`. Redirects to `/dashboard` if not a teacher.
- **`TeacherApplicationGuards`** — prevents access to `/teacher-application` if already applied, and vice-versa for `/teacher-application/status`.

### Lazy Loading Infrastructure

`LazyRoute.tsx` is a generic wrapper component that:
1. Provides a `<Suspense>` boundary with `<FullPageLoading />` fallback.
2. Catches import errors and renders a retry UI.

---

## State Management

Two layers: **Zustand** for client/UI state, **TanStack Query** for server state.

> Rule: Never store server-fetched data in Zustand. Never put ephemeral UI state in TanStack Query.

### Zustand Stores

#### `auth.store.ts`

Persisted to `localStorage` key `auth-storage` (only `user`, `accessToken`, `isAuthenticated`).

```ts
interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
// Actions: login, loginWith2FA, loginWithOAuth2, signup, logout, clearAuthState
```

#### `cart.store.ts`

Partial persistence to `cart-storage` (only `itemCount`, not full items — prevents stale price data).

```ts
interface CartState {
  items: CartItem[];
  itemCount: number;
  totalAmount: number;
  currency: string;
  isOpen: boolean;
  pendingAdditions: Set<string>;   // optimistic UI
  pendingRemovals: Set<string>;    // optimistic UI
}
```

#### `checkout.store.ts`

Not persisted — checkout state is ephemeral.

```ts
interface CheckoutState {
  mode: 'cart' | 'direct' | null;
  currentStep: number;
  courseId: string | null;
  selectedPaymentMethod: PaymentMethod | null;
  customerInfo: CustomerInfo | null;
  result: CheckoutResult | null;
}
```

#### `aiChat.store.ts`

Persisted to `ai-chat-storage`. Keeps per-course conversation history across sessions (capped at 50 messages/course).

```ts
interface AiChatState {
  isOpen: boolean;
  chatsByCourse: Record<string, ChatMessage[]>;
}
```

### TanStack Query

- **QueryClient** is configured in `lib/query-client.ts` with sensible defaults (staleTime, gcTime, retry logic).
- **Query keys** are centralized in `lib/query-keys.ts` as a typed factory:

```ts
queryKeys.courses.detail(courseId)
queryKeys.orders.list({ page, size })
queryKeys.ai.jobStatus(jobId)
```

- **Server state examples:** courses list, course detail, enrollments, orders, earnings, lesson progress, quiz results — all managed by TanStack Query.

---

## API Layer

### `api-client.service.ts`

The single Axios instance used by all services. Never import `axios` directly in components or services — always use `apiClient`.

```
Request flow:
Component → useQuery/useMutation → Service → apiClient → Backend (via API Gateway :8080)
```

**Request interceptor:**
- Reads `accessToken` from `auth-storage` (localStorage).
- Injects `Authorization: Bearer <token>` on all non-auth endpoints.
- Sets `withCredentials: true` for cookie propagation (refresh token).

**Response interceptor:**
- Unwraps `ApiResponse<T>` envelope via `unwrapApiResponse()`.
- On `401` + error code `ERR_2002` (token expired): calls `refreshAccessToken()`, queues concurrent requests, retries with new token.
- On refresh failure: clears `auth-storage`, redirects to `/login`.

**Error handling:**
- `ERR_2001` — invalid credentials
- `ERR_2002` — access token expired (triggers silent refresh)
- HTTP 429 — rate limit hit (propagated to caller for display)
- Network errors → typed error objects

### Auth Flow (end-to-end)

```
1. User submits login form
2. LoginPage → useAuthStore.login() → authService.login()
3. authService: POST /auth/login via apiClient
4. apiClient response interceptor: validates JwtResponseSchema
5. authStore: sets user, accessToken, isAuthenticated = true
6. Zustand persist: saves to auth-storage (localStorage)
7. User navigates to protected route → ProtectedRoute reads isAuthenticated

Token expiry:
8. Request fails with 401 + ERR_2002
9. apiClient interceptor: POST /auth/refresh (HTTP-only cookie sent automatically)
10. New accessToken saved; original request retried transparently
11. If refresh fails: forceLogout() → clear storage → redirect /login
```

---

## Services Reference

All located in `src/app/services/*.service.ts`. Each function returns a typed Promise validated with a Zod schema.

| Service | Key Responsibilities |
|---------|---------------------|
| `api-client.service.ts` | Axios instance, interceptors, token refresh |
| `auth.service.ts` | login, signup, logout, refresh, 2FA, OAuth2, profile update, password reset |
| `courseService.ts` | browse, search, filter, get detail, reviews, top-rated, newest, free |
| `enrollmentService.ts` | get enrollments, enroll in course, check status |
| `lessonService.ts` | fetch lesson data |
| `lessonProgressService.ts` | track progress, mark lesson complete |
| `courseReviewService.ts` | CRUD for course reviews |
| `categoryService.ts` | list categories |
| `cartService.ts` | add/remove items, get cart, clear |
| `checkoutService.ts` | preview, process checkout, PayPal capture/cancel, Sepay status |
| `orderService.ts` | list orders, order detail |
| `invoiceService.ts` | list invoices, invoice detail |
| `refundService.ts` | list refunds, detail, initiate refund |
| `wishlistService.ts` | add/remove/list wishlist items |
| `teacherCourseService.ts` | CRUD courses, sections, lessons (teacher-scoped) |
| `teacherApplicationService.ts` | apply, get application status |
| `earningService.ts` | summary, monthly breakdown, by-course breakdown |
| `payoutService.ts` | list payouts, payout detail, payout settings |
| `fileUploadService.ts` | upload to Cloudinary |
| `sectionService.ts` | manage course sections |
| `ai.service.ts` | chat stream (SSE), quiz generate/submit, transcription, lesson summary, job polling |

---

## Component Architecture

### Domain Groups

**`/learning`** — In-player AI features

| Component | Description |
|-----------|-------------|
| `AiChatPanel.tsx` | SSE streaming chat, Markdown + code syntax highlighting, source lesson citations, typewriter effect |
| `LessonSummaryPanel.tsx` | Displays generated summary (keyPoints, vocabulary) |
| `QuizTakerModal.tsx` | Multi-step quiz UI, question display, submit + review |
| `ArticleViewer.tsx` | Renders lesson article HTML/Markdown |

**`/course-module`** — Course browsing and detail

| Component | Description |
|-----------|-------------|
| `CourseCard.tsx` | Preview card with thumbnail, price, rating |
| `CourseGrid.tsx` | Responsive grid layout |
| `CourseSearchBar.tsx` | Debounced search input |
| `CategoryFilter.tsx` | Category dropdown |
| `CurriculumAccordion.tsx` | Expandable sections/lessons with lock state |
| `ReviewCard.tsx` | Individual review display |
| `WishlistButton.tsx` | Toggle wishlist with optimistic update |
| `CourseCardSkeleton.tsx` | Loading skeleton |

**`/payment-module`** — Cart UI

| Component | Description |
|-----------|-------------|
| `CartDrawer.tsx` | Slide-over drawer, all cart items |
| `CartIcon.tsx` | Nav icon with item-count badge |
| `CartItem.tsx` | Individual item row with remove |
| `AddToCartButton.tsx` | Handles enroll (free) or add-to-cart (paid) |

**`/teacher`** — Teacher portal components

- **`courses/create/`** — 4-step wizard: BasicInfo → Media → Pricing → Settings
- **`courses/edit/`** — Tab-based editor: `BasicInfoTab`, `PricingTab`, `SettingsTab`, `CurriculumTab`; lesson/section modals; AI modals (`QuizGeneratorModal`, `TranscriptionModal`)
- **`courses/list/`** — Course list with filters, pagination, delete confirmation
- **`courses/detail/`** — Overview, Curriculum, Students, Reviews tabs
- **`reviews/`** — Review list, reply modal, rating distribution chart

### Guard & Infrastructure Components

| Component | Description |
|-----------|-------------|
| `ProtectedRoute.tsx` | Auth guard, saves redirect URL |
| `TeacherGuard.tsx` | Role guard for teacher routes |
| `RouteErrorBoundary.tsx` | Catches render errors per route |
| `QueryErrorBoundary.tsx` | Catches TanStack Query errors |
| `LazyRoute.tsx` | Suspense + error boundary for lazy routes |

---

## AI Features

The user app surfaces five AI features — RAG chat (SSE streaming), quiz generation (incl. multi-lesson sourcing), video transcription (caption + transcript download), lesson summaries, and lesson embeddings (backend-only, triggered automatically). All are driven by `ai.service.ts` and the components under `components/learning/` (`AiChatPanel`, `QuizGeneratorModal`, `QuizTakerModal`, `TranscriptionModal`, `LessonSummaryPanel`, `LessonTranscriptCard`).

For exact endpoint paths, request/response shapes, rate limits, and streaming/fallback behavior, see the **AI Features** section in [`frontend/README.md`](../../README.md) — that is the single source of truth for the AI API surface; it is kept in sync with `ai.service.ts` and `AiController.java` and is not duplicated here.

---

## Payment Flow

### Cart Management

`cart.store.ts` implements **optimistic UI updates**:

```
User clicks AddToCartButton
  → addToCart(courseId) stores courseId in pendingAdditions (instant UI feedback)
  → cartService.addItem(courseId) → POST /cart/items
  → on success: refresh cart query, clear pendingAdditions
  → on failure: rollback, show toast error
```

Cart drawer opens via `cartStore.openCart()`, toggled from the nav `CartIcon`.

### Checkout Steps

State managed by `checkout.store.ts` (not persisted):

```
CartPage or CourseDetailPage
  → checkoutStore.startCartCheckout() or startDirectCheckout(courseId)
  → CheckoutPage renders step-by-step:
      1. Preview (checkoutService.previewCheckout())
      2. Payment method selection (PayPal / Sepay / Mock)
      3. Customer info form
      4. Process + redirect
```

**PayPal flow:** `POST /checkout/process` → redirect to PayPal → return to `/checkout/success` → `capturePayment()`.

**Sepay (QR) flow:** `POST /checkout/process` → get QR data → `/checkout/sepay-qr` polling page → wait for webhook → redirect.

---

## Teacher Portal

### Course Creation Wizard

4 steps, each as a standalone component in `components/teacher/courses/create/`:

1. **Step1BasicInfo** — title, description, category, language, level
2. **Step2Media** — thumbnail upload (Cloudinary), promo video URL
3. **Step3Pricing** — price, currency, free toggle
4. **Step4Settings** — visibility, enrollment limit, certificate enabled

State lives in `TeacherCourseCreatePage` (TanStack Query mutations per step).

### Course Editing

Tab-based layout (`TeacherCourseEditPage`):

- **BasicInfo** — title, description, category, etc.
- **Pricing** — price management
- **Settings** — visibility, enrollment, certificate
- **Curriculum** — drag-drop section/lesson reordering (`@dnd-kit`), inline lesson edit modal

Curriculum tab includes AI actions per lesson:
- **Generate Quiz** → `QuizGeneratorModal`
- **Transcribe Video** → `TranscriptionModal`

### Earnings Dashboard

`earningService.ts` fetches:
- Lifetime summary (total earned, pending, available)
- Monthly breakdown (chart data)
- Per-course breakdown (table)

Payout flow: teacher requests payout → admin approves → `payoutService.ts` tracks status.

---

## Forms

React Hook Form + Zod is the universal pattern:

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema, type LoginRequest } from '@edumind/shared-types';

const { register, handleSubmit, formState: { errors } } = useForm<LoginRequest>({
  resolver: zodResolver(LoginSchema),
  defaultValues: { email: '', password: '' },
});
```

All Zod schemas are defined in `@edumind/shared-types` — never inline schemas inside components.

---

## Testing

### Setup

- **Framework:** Vitest 3 + `@testing-library/react`
- **Environment:** jsdom
- **Config:** `vite.config.ts` → `test.environment: 'jsdom'`
- **Setup file:** `src/test/setup.ts` — runs before each test file:
  - Initializes `@testing-library/jest-dom` matchers
  - `afterEach`: clears DOM, localStorage, sessionStorage
  - Mocks: `window.matchMedia`, `window.scrollTo`, `ResizeObserver`

### Conventions

```bash
# Co-locate tests with source
src/app/services/auth.service.test.ts
src/app/stores/auth.store.test.ts
src/app/components/payment-module/CartItem.test.tsx
src/app/pages/auth/LoginPage.test.tsx
```

**Mock `apiClient` in service tests:**

```ts
vi.mock('./api-client.service.js', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));
```

**Render components with providers:**

```tsx
const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <QueryClientProvider client={testQueryClient}>
      {ui}
    </QueryClientProvider>
  );
```

### Run Commands

```bash
npm run test:user                        # Run all tests once
npm run test:user:watch                  # Watch mode
npm run test:user:coverage               # Coverage report

# Single file
nx test user -- apps/user/src/app/services/auth.service.test.ts
```

### End-to-End & Accessibility

Cross-app Playwright E2E and accessibility (axe-core/pa11y) suites live at `frontend/e2e/`, not inside this app — see the **Testing & Quality** section of [`frontend/README.md`](../../README.md) and [`frontend/e2e/ACCESSIBILITY_TESTING.md`](../../e2e/ACCESSIBILITY_TESTING.md).

---

## Error Monitoring

Sentry (`@sentry/react`) is initialized in `main.tsx` before the app mounts, capturing uncaught errors and route-level tracing. DSN is read from `VITE_SENTRY_DSN_USER` — left unset in development, which disables reporting.

---

## Path Aliases

Defined in `vite.config.ts` and `tsconfig.base.json`:

| Alias | Resolves To |
|-------|-------------|
| `@edumind/shared-types` | `libs/shared/types/src/index.ts` |
| `@edumind/shared-constants` | `libs/shared/constants/src/index.ts` |
| `@edumind/shared-utils` | `libs/shared/utils/src/index.ts` |
| `@edumind/user-ui` | `libs/user/ui/src/index.ts` |
| `@user/services/*` | `apps/user/src/app/services` |
| `@user/stores/*` | `apps/user/src/app/stores` |
| `@user/components/*` | `apps/user/src/app/components` |
| `@user/pages/*` | `apps/user/src/app/pages` |

---

## Key Conventions

### Do

- Use `apiClient` (never raw `axios`) for all HTTP calls.
- Define all DTO types as Zod schemas in `@edumind/shared-types`.
- Use TanStack Query for all server data — service functions are query functions, not state.
- Use Zustand only for UI state: auth session, cart open/close, checkout step.
- Lazy-load all page routes with `createLazyRoute()`.
- Co-locate test files next to source files.
- Use `ADMIN_ROUTES.*` / `USER_ROUTES.*` from `@edumind/shared-utils` — never hardcode paths.

### Do Not

- Import `axios` directly in components or services.
- Store server data (courses, orders) in Zustand.
- Define types with `any` — strict mode is enforced.
- Call backend endpoints from components directly — all calls go through service functions.
- Hardcode API URLs — use `API_URL` from `@edumind/shared-utils`.
- Modify applied Flyway migrations.
