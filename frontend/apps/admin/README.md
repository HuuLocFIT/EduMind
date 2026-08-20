# EduMind Admin Dashboard

A production-grade Angular 20 admin panel for the EduMind LMS platform. Manages teacher applications, student accounts, course moderation, category configuration, enrollment reports, and financial operations (refunds and instructor payouts).

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
  - [Application Bootstrap](#application-bootstrap)
  - [Routing Strategy](#routing-strategy)
  - [Authentication & Security](#authentication--security)
  - [HTTP Layer](#http-layer)
  - [State Management](#state-management)
- [Feature Modules](#feature-modules)
- [Shared Libraries](#shared-libraries)
- [UI Component Library](#ui-component-library)
- [Testing](#testing)
- [Build & Deployment](#build--deployment)
- [Conventions](#conventions)

---

## Tech Stack

| Concern              | Technology                                                              |
|----------------------|--------------------------------------------------------------------------|
| Framework            | Angular 20 (standalone components)                                     |
| Language             | TypeScript 5.9                                                          |
| Build tool           | Angular application builder (`@angular/build:application`, esbuild-based) for production builds; Vite powers the dev server and Vitest test runner |
| Monorepo             | Nx v22                                                                  |
| Styling              | Tailwind CSS 3.4                                                        |
| Reactive programming | RxJS 7.8                                                                |
| Local state          | Angular Signals (`signal`, `computed`)                                 |
| Schema validation    | Zod 3.25 (HTTP response validation only — not all services use it yet, see [HTTP Layer](#http-layer)) |
| HTTP client          | Angular `HttpClient`                                                    |
| Error tracking       | Sentry (`@sentry/angular`) — error capture, tracing, release source maps |
| Charts               | ApexCharts (`ng-apexcharts`) — dashboard visualizations                |
| Testing              | Vitest 3 + Angular `TestBed` (no `@testing-library/angular` — it is not a project dependency) |
| Icons                | Google Material Design Icons (CDN)                                     |

---

## Prerequisites

- Node.js ≥ 20
- npm ≥ 10
- Backend API running on `http://localhost:8080` (or configured via environment)

---

## Getting Started

All commands are run from the **`frontend/`** monorepo root.

```bash
# Install dependencies
npm install

# Start the admin app (http://localhost:4200)
npm run start:admin

# Or using Nx directly
npx nx serve admin
```

Default admin credentials are configured in the backend seed data.

---

## Project Structure

```
apps/admin/src/
├── app/
│   ├── app.config.ts              # Application providers (root config)
│   ├── app.routes.ts              # Top-level route definitions
│   ├── app.ts                     # Root component (router outlet only)
│   │
│   ├── core/                      # Singleton services, guards, interceptors, utilities
│   │   ├── guards/
│   │   │   ├── auth.guard.ts      # Redirects unauthenticated → /auth/login
│   │   │   └── guest.guard.ts     # Redirects authenticated → /dashboard
│   │   ├── interceptors/
│   │   │   └── auth.interceptor.ts # Token injection, 401 handling, response unwrapping
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── category.service.ts
│   │   │   ├── course.service.ts
│   │   │   ├── teacher-application.service.ts
│   │   │   ├── admin-user.service.ts
│   │   │   ├── admin-refund.service.ts
│   │   │   ├── admin-payout.service.ts
│   │   │   ├── admin-dashboard.service.ts
│   │   │   ├── admin-enrollment.service.ts
│   │   │   └── file-upload.service.ts
│   │   └── utils/                 # Composition helpers (injectable functions)
│   │       ├── inject-async-state.ts    # Loading/error/success signal wiring for a request
│   │       ├── inject-media-query.ts    # Reactive window.matchMedia signal
│   │       ├── inject-modal.ts          # Open/close/data signal trio for a modal
│   │       ├── inject-pagination.ts     # Page/size/total signal trio + paged-response helper
│   │       └── display-helpers.ts       # Formatting helpers (initials, full name, badge variant)
│   │
│   ├── shared/
│   │   └── pipes/                 # Cross-feature display pipes
│   │       ├── cloudinary-url.pipe.ts
│   │       ├── document-type-label.pipe.ts
│   │       ├── enum-label.pipe.ts
│   │       └── role-label.pipe.ts
│   │
│   ├── features/                  # Lazy-loaded feature areas
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   └── login/
│   │   ├── dashboard/
│   │   ├── categories/
│   │   ├── courses/
│   │   │   ├── courses.component.ts
│   │   │   └── course-detail.component.ts
│   │   ├── students/
│   │   ├── teachers/
│   │   │   ├── teacher-applications/
│   │   │   └── trial-teachers/
│   │   ├── enrollment-reports/
│   │   └── payments/
│   │       ├── refunds/
│   │       └── payouts/
│   │
│   └── layouts/
│       └── main-layout/           # Shell: sidebar, topbar, router outlet
│
├── environments/
│   ├── environment.ts             # { apiUrl: 'http://localhost:8080', sentryDsn: '' (disabled), sentryEnvironment: 'development' }
│   └── environment.prod.ts        # { apiUrl: 'https://api.edumind.nguyenloc.dev', sentryDsn: '<real DSN>', sentryEnvironment: 'production' }
├── styles.css                     # Tailwind directives + global overrides
├── test-setup.ts                  # Vitest + Angular TestBed initialization
└── main.ts                        # bootstrapApplication entry point + Sentry.init()
```

---

## Architecture

### Application Bootstrap

The app uses Angular's `bootstrapApplication()` API — there are no `NgModule` declarations anywhere.

`main.ts` calls `Sentry.init()` before bootstrapping — configuring the DSN, environment, tracing, and session replay from `environment.ts`/`environment.prod.ts`. In development, `sentryDsn` is left blank, which disables reporting entirely.

`app.config.ts` registers all application-level providers:

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    // provideBrowserGlobalErrorListeners() is intentionally NOT used here —
    // it conflicts with Sentry.createErrorHandler() (both hook uncaught errors,
    // which would process every error twice).
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes),
    provideHttpClient(withInterceptors([authInterceptor])),

    // Sentry replaces Angular's default ErrorHandler.
    { provide: ErrorHandler, useValue: Sentry.createErrorHandler({ showDialog: false }) },

    // TraceService tracks route transitions; deps: [Router] is required or tracking silently no-ops.
    { provide: Sentry.TraceService, deps: [Router] },

    // Angular DI is lazy — provideAppInitializer forces TraceService to instantiate eagerly.
    provideAppInitializer(() => { inject(Sentry.TraceService); }),
  ],
};
```

- `eventCoalescing: true` batches change detection events for performance.
- A single functional interceptor covers all outbound HTTP requests.
- Sentry's `ErrorHandler` is the app's only global error handler — there is no separate browser error listener.

---

### Routing Strategy

```
/auth          (guestGuard)
  /login

/              (authGuard → MainLayoutComponent)
  /dashboard
  /teachers/applications
  /teachers/trial
  /students
  /categories
  /courses
  /courses/:id
  /enrollment-reports
  /payments/refunds
  /payments/payouts/pending
  /payments/payouts
  /payments/payouts/create
```

Every route is lazy-loaded via `loadComponent()`. Route path constants live in `ADMIN_ROUTES` from `@edumind/shared-utils` — they are never hardcoded in templates or components.

---

### Authentication & Security

#### Token Storage

| Token         | Storage             | Notes                                |
|---------------|---------------------|--------------------------------------|
| Access token  | `localStorage`      | Key: `admin_auth_token`              |
| Refresh token | HTTP-only cookie    | Set by backend, not readable from JS |
| Current user  | `localStorage`      | Key: `admin_user` (serialized JSON)  |

#### Admin Role Enforcement

`AuthService.login()` checks `user.roles.includes(UserRole.ADMIN)` before persisting credentials. A non-admin user receives a 403-equivalent error and is never logged in.

#### Token Refresh Flow

The refresh flow is handled entirely inside `auth.interceptor.ts` using a shared `isRefreshing` flag and a `Subject<string>` queue to prevent race conditions when multiple requests simultaneously receive a 401:

```
Request A → 401 ──┐
Request B → 401 ──┤──► isRefreshing = true → POST /auth/refresh
Request C → 401 ──┘         │
                        Success: emit new token to subject
                             │
                    A, B, C all retry with new token

                        Failure: forceLogout()
```

`forceLogout()` (called by the interceptor, no API call) synchronously clears localStorage and navigates to `/auth/login`. The regular `logout()` method first calls `POST /auth/logout` to revoke the refresh token cookie on the backend.

#### Guards

Both guards are functional, using `inject()` internally:

- **`authGuard`** — calls `authService.isAuthenticated()`, which decodes the JWT and checks the `exp` claim without making a network call.
- **`guestGuard`** — the inverse; redirects to `/dashboard` if already authenticated.

---

### HTTP Layer

#### Interceptor responsibilities (`auth.interceptor.ts`)

1. **Token injection** — adds `Authorization: Bearer <token>` to every request except auth endpoints (`/auth/login`, `/auth/register`, `/auth/refresh`).
2. **Cookie forwarding** — sets `withCredentials: true` on every request so the browser sends the refresh-token cookie.
3. **Response unwrapping** — the backend wraps all responses in `ApiResponse<T>`. The interceptor calls `unwrapApiResponse()` on every `HttpResponse`, so services always receive unwrapped `T` values.
4. **401 handling** — described in the [Token Refresh Flow](#token-refresh-flow) section above.

#### Service pattern

All services are `providedIn: 'root'` singletons that inject `HttpClient` and `environment.apiUrl`. All services validate responses with Zod schemas in the RxJS pipeline and return `Observable<T>`:

```typescript
@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = environment.apiUrl;

  getAllCategories(): Observable<CategoryListResponse> {
    return this.http
      .get(`${this.API_URL}${CATEGORY_ENDPOINTS.ALL}`)
      .pipe(map((res) => CategoryListResponseSchema.parse(res)));
  }
}
```

No error handling is done in services — `catchError` lives in components or is handled globally by the interceptor for auth errors.

---

### State Management

The app deliberately avoids any external state library (no NgRx, no Zustand).

| State type           | Tool                     | Example                                      |
|----------------------|--------------------------|----------------------------------------------|
| Component UI state   | `signal()` / `computed()`| `isLoading`, `showModal`, `filteredList`      |
| Cross-component user | `BehaviorSubject`        | `AuthService.currentUser$`                   |
| Server state         | Direct Observable + async | Fetched per component on `ngOnInit`          |

**Derived state with `computed()`:**

```typescript
visibleCategories = computed(() =>
  this.categories().filter(c =>
    c.name.toLowerCase().includes(this.searchQuery().toLowerCase())
  )
);
```

Signals automatically propagate changes — no manual `markForCheck()` needed for signal-based state.

**RxJS subscription cleanup:** the preferred pattern is `takeUntilDestroyed(this.destroyRef)` (from `@angular/core/rxjs-interop`), used in `students.component.ts`, `trial-teachers.component.ts`, `courses.component.ts`, and the `core/utils` composition helpers. Manual `ngOnDestroy` teardown is reserved for non-RxJS resources (e.g. a raw `matchMedia` listener) that aren't wrapped by one of those helpers.

---

## Feature Modules

### Auth (`/auth`)

`LoginComponent` uses Reactive Forms (`FormBuilder`, `FormGroup`, `ReactiveFormsModule`) with `Validators.required`/`minLength`. On success it navigates to `/dashboard` immediately. All auth errors are surfaced via `AuthService.error` signal.

---

### Dashboard (`/dashboard`)

Fully API-driven — not a placeholder. On init, `DashboardComponent` runs a single `forkJoin` across `AdminDashboardService.getDashboardStats()`, `AdminUserService.getUsersByRole()` (student and teacher counts), `getApplications()` (pending count), and `AdminEnrollmentService.getReports()` (recent pending reports).

Renders four ApexCharts (`ng-apexcharts`): monthly enrollment trend (area), monthly revenue (bar), course status breakdown (donut: published/draft/archived), and top categories by course count (horizontal bar). Computed KPI signals include completion rate, course publish rate, average revenue per enrollment, month-over-month revenue/enrollment change, and a combined pending-tasks count (reports + refunds + applications).

---

### Categories (`/categories`)

Full CRUD with inline client-side search. Slug is auto-generated from the name field on input change and validated with the regex `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`. `toggleCategoryStatus()` issues a `PATCH` request and reloads the list in-place. Category images are uploaded via `ImageUploadComponent` and displayed through `CloudinaryUrlPipe`.

---

### Courses (`/courses`, `/courses/:id`)

`CoursesComponent` is a paginated, filterable data grid. Columns are defined declaratively with `@ViewChild` template references for custom cell rendering, enabling type-safe cell templates without wrapper directives. Responsive breakpoint detection uses `window.matchMedia` with a registered listener cleaned up in `ngOnDestroy`.

`CourseDetailComponent` is a read-only detail view loaded from route params.

---

### Students (`/students`)

Paginated, status-filtered (`ALL` / `ACTIVE` / `INACTIVE`) student list backed by `AdminUserService.getUsersByRole('ROLE_STUDENT', ...)`. Search is server-side and debounced 300ms (`Subject` + `debounceTime` + `distinctUntilChanged`, torn down via `takeUntilDestroyed`). Each row supports a read-only detail modal, activate/deactivate (via a confirm modal), and delete (via a separate confirm modal, `AdminUserService.deleteUser()`). Live stat cards (total / active / inactive) update optimistically after a toggle or delete, then the list reloads.

---

### Teachers

#### Teacher Applications (`/teachers/applications`)

Uses `forkJoin()` to fetch pending / approved / rejected counts and trial teacher data in one parallel batch on init, populating the stats cards before the table loads. Applications can be approved (TRIAL or FULL teacher type) or rejected with a mandatory reason field.

#### Trial Teachers (`/teachers/trial`)

Displays trial period progress (assumed 30-day window). Progress bar color coding: blue → orange (≤7 days) → red (≤3 days or expired). Expiring teachers within 7 days are surfaced in a separate summary section.

---

### Enrollment Reports (`/enrollment-reports`)

Paginated, status-filtered (`ALL` / `PENDING` / `APPROVED` / `REJECTED`) table of student enrollment/refund reports, backed by `AdminEnrollmentService`. Stat cards show pending/approved/rejected counts (`getReportStats()`). Row actions are only offered for `PENDING` reports:

- **Approve** — `approveReport(id, notes?)`, notes optional.
- **Reject** — `rejectReport(id, reason)`, reason required and validated client-side before submit.

Stat counters update optimistically on approve/reject, then the list reloads.

---

### Payments

#### Pending Refunds (`/payments/refunds`)

Three operations per refund request:
- **Approve** — optional admin notes
- **Reject** — mandatory rejection reason
- **Confirm Manual** — required bank transfer reference number

#### Pending Payouts (`/payments/payouts/pending`)

Processes payouts that are in `PENDING` state. Supports editing the recipient details (bank transfer or PayPal) before processing.

#### All Payouts (`/payments/payouts`)

Status-filtered view of all payouts (ALL / PENDING / PROCESSING / AWAITING_MANUAL_PAYOUT / COMPLETED / FAILED).

#### Create Payout (`/payments/payouts/create`)

Reactive form (`FormBuilder`/`ReactiveFormsModule`) with dynamic validators — when `paymentMethod` changes to `BANK_TRANSFER`, the bank fields become required and PayPal's email field is cleared; switching to `PAYPAL` makes `paypalEmail` required and clears/relaxes the bank fields.

---

### Main Layout

`MainLayoutComponent` is the shell wrapping all protected routes. It listens to `NavigationEnd` events to auto-expand the active sidebar group (e.g., navigating to `/teachers/applications` automatically opens the "Teachers" section). Sidebar, user menu, and notifications each have independent signal-based visibility state.

---

## Shared Libraries

| Import                      | Contents                                                                               |
|-----------------------------|----------------------------------------------------------------------------------------|
| `@edumind/shared-types`     | All Zod schemas + inferred TypeScript types for DTOs, enums, request/response models   |
| `@edumind/shared-utils`     | `unwrapApiResponse()`, `ADMIN_ROUTES`, `AUTH_ENDPOINTS`, `CATEGORY_ENDPOINTS`, `COURSE_ENDPOINTS`, `ADMIN_ENDPOINTS`, `REFUND_ENDPOINTS`, `PAYOUT_ENDPOINTS`, `STUDENT_ENDPOINTS`, `ENROLLMENT_ENDPOINTS` |
| `@edumind/shared-constants` | Environment-agnostic constants                                                         |
| `@edumind/admin-ui`         | Admin-specific UI component library (see below)                                        |

All types flow from `@edumind/shared-types`. Never define a DTO interface inline in a component or service — define the Zod schema in the types library and infer the TypeScript type from it.

---

## UI Component Library

`@edumind/admin-ui` exports standalone components importable directly in any component's `imports` array:

| Component               | Purpose                                      |
|-------------------------|----------------------------------------------|
| `ButtonComponent`       | Primary / secondary / danger actions         |
| `IconButtonComponent`   | Icon-only actions                            |
| `InputComponent`        | Text input with label + error display        |
| `TextareaComponent`     | Multi-line input                             |
| `CheckboxComponent`     | Boolean checkbox                             |
| `SwitchComponent`       | Toggle switch                                |
| `SelectComponent`       | Dropdown select                              |
| `MultiSelectComponent`  | Multi-value dropdown select                  |
| `CardComponent`         | Content container                            |
| `StatCardComponent`     | KPI stat display                             |
| `AlertComponent`        | Success / warning / error alerts             |
| `ModalComponent`        | Dialog shell                                 |
| `ModalFooterComponent`  | Action buttons row for modals                |
| `ConfirmDialogComponent`| Pre-built confirmation dialog                |
| `TabsComponent`         | Horizontal tab navigation                    |
| `DropdownMenuComponent` | Contextual dropdown                          |
| `DataTableComponent`    | Sortable, paginated table with slot columns  |
| `SearchBarComponent`    | Debounced search input                       |
| `BadgeComponent`        | Status label / tag                           |
| `EmptyStateComponent`   | Illustrated empty state                      |
| `ImageUploadComponent`  | Image upload with preview                    |

---

## Testing

### Commands

```bash
# From frontend/ directory
npm run test:admin            # Run once
npm run test:admin:watch      # Watch mode
npm run test:admin:coverage   # Coverage report

# Single file (path is relative to sourceRoot, no "apps/admin/" prefix, no "--")
npx nx test admin src/app/core/services/auth.service.spec.ts
```

### Setup

`src/test-setup.ts` initializes `BrowserDynamicTestingModule`, mocks `window.matchMedia`, `window.scrollTo`, and `ResizeObserver`, and runs `localStorage.clear()`, `sessionStorage.clear()`, and `vi.clearAllMocks()` after every test.

### Current coverage scope

Only **5 spec files** exist in the entire app, all within the auth slice: `auth.interceptor.spec.ts`, `auth.service.spec.ts`, `auth.guard.spec.ts`, `guest.guard.spec.ts`, `login.component.spec.ts`. There is currently **no test coverage** for categories, courses, students, teachers, enrollment-reports, payments, the dashboard, or their backing services. The patterns below describe how the existing auth tests are structured — they are the convention to follow when adding tests elsewhere, not evidence that coverage is broad today.

### End-to-End & Accessibility

Cross-app Playwright E2E and accessibility (axe-core/pa11y) suites live at `frontend/e2e/` — its page-objects cover both the admin and user apps. See the **Testing & Quality** section of [`../../README.md`](../../README.md).

### Patterns

**Service tests** — use `TestBed.configureTestingModule()` with `HttpClientTestingModule` and `HttpTestingController`:

```typescript
const req = httpMock.expectOne(`${API_URL}/api/categories`);
req.flush(mockResponse);
expect(result).toEqual(expected);
```

**Guard tests** — use the injection context helper:

```typescript
const result = TestBed.runInInjectionContext(() => authGuard());
expect(result).toBe(true);
```

**Token helpers** — use `createValidToken()` / `createExpiredToken()` factory functions defined in the auth service spec to avoid duplicating JWT construction logic.

---

## Build & Deployment

```bash
# From frontend/ directory
npm run build:admin           # Production build
```

Build is handled by `@angular/build:application` (esbuild-based). Production budgets enforced by Angular CLI (`apps/admin/project.json`):

| Budget          | Warning  | Error |
|-----------------|----------|-------|
| Initial bundle  | 500 KB   | 1 MB  |
| Component CSS   | 4 KB     | 8 KB  |

The `@angular/build:application` executor always nests browser output under a `browser/` subfolder — the deployable SPA is at **`dist/apps/admin/browser/`**, not `dist/apps/admin/` directly. Deploy that folder behind any static host or CDN; configure the server to serve `index.html` for all routes (SPA fallback).

### Environment switching

Angular's file replacement mechanism swaps `environment.ts` with `environment.prod.ts` during production builds. Besides `apiUrl`, the two files also differ in `production` (`false`/`true`), `sentryDsn` (blank in dev, a real DSN in prod), and `sentryEnvironment` (`'development'`/`'production'`). `appVersion` starts as `'0.0.0'` in both files but is overwritten in CI (see below).

### Sentry releases & source maps

`.github/workflows/frontend-release.yml` runs on pushes to `main` under `frontend/**`. It:

1. Injects the release version (`git rev-parse --short HEAD`) into `environment.prod.ts`'s `appVersion` via `sed`.
2. Builds all Nx projects.
3. Runs `@sentry/cli sourcemaps upload` against `dist/apps/admin` (and `dist/apps/user`), then deletes all `*.map` files from the dist output before any deploy step.

---

## Conventions

### Components

- All components are **standalone**. Never introduce an `NgModule`.
- Use `inject()` for dependency injection, not constructor parameters.
- Component-local UI state lives in `signal()`. Derived state uses `computed()`.
- Clean up RxJS subscriptions with `takeUntilDestroyed(this.destroyRef)`. Reserve manual `ngOnDestroy` teardown for non-RxJS resources (e.g. a raw `matchMedia` listener not wrapped by `injectMediaQuery`).

### Forms

- **Reactive** (`ReactiveFormsModule`, `FormBuilder`) is used for both simple and dynamic forms in practice — e.g. `LoginComponent` and `CreatePayoutComponent` are both Reactive Forms; the latter adds runtime `setValidators()`/`clearValidators()` calls when `paymentMethod` changes between bank transfer and PayPal.
- **Template-driven** (`FormsModule`, `[(ngModel)]`) is used for simpler, single-field interactions such as the search/filter inputs in `CategoriesComponent` and `StudentsComponent`.
- Validate with Angular built-in validators. Do not use Zod for form validation — Zod is for HTTP response validation only (and even then, not yet applied to every service — see [HTTP Layer](#http-layer)).

### Services

- One service per domain area. No logic in components that belongs in a service.
- Services return `Observable<T>`. Components subscribe via `async` pipe or explicit subscription in `ngOnInit` (with corresponding cleanup via `takeUntilDestroyed` where applicable).
- Where used, Zod `.parse()` happens in the service `map()` pipeline, not in components.

### Routing

- Use `ADMIN_ROUTES.*` constants everywhere. Never hardcode a path string.
- Add new routes to `app.routes.ts` and register the constant in `@edumind/shared-utils`.

### Commits

Follow Conventional Commits:

```
feat: add payout bulk processing
fix: refresh token race condition on concurrent 401s
refactor: extract trial progress calculation to service
test: add guard specs for guest route
```
