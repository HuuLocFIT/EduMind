# EduMind Admin Dashboard

A production-grade Angular 20 admin panel for the EduMind LMS platform. Manages teacher applications, course moderation, category configuration, and financial operations (refunds and instructor payouts).

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

| Concern              | Technology                                      |
|----------------------|-------------------------------------------------|
| Framework            | Angular 20 (standalone components)              |
| Language             | TypeScript 5.9                                  |
| Build tool           | Vite 7 via `@angular/build`                     |
| Monorepo             | Nx v22                                          |
| Styling              | Tailwind CSS 4                                  |
| Reactive programming | RxJS 7.8                                        |
| Local state          | Angular Signals (`signal`, `computed`)          |
| Schema validation    | Zod                                             |
| HTTP client          | Angular `HttpClient`                            |
| Testing              | Vitest 3 + `@testing-library/angular`           |
| Icons                | Google Material Design Icons (CDN)              |

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
nx serve admin
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
│   ├── core/                      # Singleton services, guards, interceptors
│   │   ├── guards/
│   │   │   ├── auth.guard.ts      # Redirects unauthenticated → /auth/login
│   │   │   └── guest.guard.ts     # Redirects authenticated → /dashboard
│   │   ├── interceptors/
│   │   │   └── auth.interceptor.ts # Token injection, 401 handling, response unwrapping
│   │   └── services/
│   │       ├── auth.service.ts
│   │       ├── category.service.ts
│   │       ├── course.service.ts
│   │       ├── teacher-application.service.ts
│   │       ├── admin-user.service.ts
│   │       ├── admin-refund.service.ts
│   │       └── admin-payout.service.ts
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
│   │   ├── teachers/
│   │   │   ├── teacher-applications/
│   │   │   └── trial-teachers/
│   │   └── payments/
│   │       ├── refunds/
│   │       └── payouts/
│   │
│   └── layouts/
│       └── main-layout/           # Shell: sidebar, topbar, router outlet
│
├── environments/
│   ├── environment.ts             # { apiUrl: 'http://localhost:8080' }
│   └── environment.prod.ts        # { apiUrl: 'https://api.edumind.com' }
├── styles.css                     # Tailwind directives + global overrides
├── test-setup.ts                  # Vitest + Angular TestBed initialization
└── main.ts                        # bootstrapApplication entry point
```

---

## Architecture

### Application Bootstrap

The app uses Angular's `bootstrapApplication()` API — there are no `NgModule` declarations anywhere.

`app.config.ts` registers all application-level providers in one place:

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};
```

- `eventCoalescing: true` batches change detection events for performance.
- A single functional interceptor covers all outbound HTTP requests.

---

### Routing Strategy

```
/auth          (guestGuard)
  /login

/              (authGuard → MainLayoutComponent)
  /dashboard
  /teachers/applications
  /teachers/trial
  /categories
  /courses
  /courses/:id
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

All services are `providedIn: 'root'` singletons that inject `HttpClient` and `environment.apiUrl`. They validate responses with Zod schemas in the RxJS pipeline and return `Observable<T>`:

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

Signals automatically propagate changes — no manual `markForCheck()` or subscription teardown needed for Signal-based state.

---

## Feature Modules

### Auth (`/auth`)

`LoginComponent` uses a `FormGroup` with inline validators. On success it sets a `successMessage` signal and navigates to `/dashboard` after a 1-second delay. All auth errors are surfaced via `AuthService.error` signal.

---

### Dashboard (`/dashboard`)

Currently renders hardcoded placeholder statistics. No API calls. This is the designated location for future analytics widgets.

---

### Categories (`/categories`)

Full CRUD with inline client-side search. Slug is auto-generated from the name field on input change and validated with the regex `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`. `toggleCategoryStatus()` issues a `PATCH` request and reloads the list in-place.

---

### Courses (`/courses`, `/courses/:id`)

`CoursesComponent` is a paginated, filterable data grid. Columns are defined declaratively with `@ViewChild` template references for custom cell rendering, enabling type-safe cell templates without wrapper directives. Responsive breakpoint detection uses `window.matchMedia` with a registered listener cleaned up in `ngOnDestroy`.

`CourseDetailComponent` is a read-only detail view loaded from route params.

---

### Teachers

#### Teacher Applications (`/teachers/applications`)

Uses `forkJoin()` to fetch pending / approved / rejected counts and trial teacher data in one parallel batch on init, populating the stats cards before the table loads. Applications can be approved (TRIAL or FULL teacher type) or rejected with a mandatory reason field.

#### Trial Teachers (`/teachers/trial`)

Displays trial period progress (assumed 30-day window). Progress bar color coding: blue → orange (≤7 days) → red (≤3 days or expired). Expiring teachers within 7 days are surfaced in a separate summary section.

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

Reactive form with dynamic validators — when `paymentMethod` changes to `BANK_TRANSFER`, the bank fields become required; switching to `PAYPAL` makes `paypalEmail` required and bank fields optional.

---

### Main Layout

`MainLayoutComponent` is the shell wrapping all protected routes. It listens to `NavigationEnd` events to auto-expand the active sidebar group (e.g., navigating to `/teachers/applications` automatically opens the "Teachers" section). Sidebar, user menu, and notifications each have independent signal-based visibility state.

---

## Shared Libraries

| Import                      | Contents                                                                               |
|-----------------------------|----------------------------------------------------------------------------------------|
| `@edumind/shared-types`     | All Zod schemas + inferred TypeScript types for DTOs, enums, request/response models   |
| `@edumind/shared-utils`     | `unwrapApiResponse()`, `ADMIN_ROUTES`, `AUTH_ENDPOINTS`, `CATEGORY_ENDPOINTS`, `COURSE_ENDPOINTS`, `ADMIN_ENDPOINTS`, `REFUND_ENDPOINTS`, `PAYOUT_ENDPOINTS` |
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

---

## Testing

### Commands

```bash
# From frontend/ directory
npm run test:admin            # Run once
npm run test:admin:watch      # Watch mode
npm run test:admin:coverage   # Coverage report

# Single file
nx test admin -- apps/admin/src/app/core/services/auth.service.spec.ts
```

### Setup

`src/test-setup.ts` initializes `BrowserDynamicTestingModule`, mocks `window.matchMedia`, `window.scrollTo`, and `ResizeObserver`, and runs `localStorage.clear()` + `vi.clearAllMocks()` after every test.

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
npm run build:admin           # Production build → dist/apps/admin/
```

Build is handled by `@angular/build:application` (Vite-based). Production budgets enforced by Angular CLI:

| Budget          | Warning  | Error |
|-----------------|----------|-------|
| Initial bundle  | 500 KB   | 1 MB  |
| Component CSS   | 4 KB     | 8 KB  |

The `dist/apps/admin/` output is a fully static SPA. Deploy behind any static host or CDN; configure the server to serve `index.html` for all routes (SPA fallback).

### Environment switching

Angular's file replacement mechanism swaps `environment.ts` with `environment.prod.ts` during production builds. Only `apiUrl` differs between environments — no other configuration is environment-specific.

---

## Conventions

### Components

- All components are **standalone**. Never introduce an `NgModule`.
- Use `inject()` for dependency injection, not constructor parameters.
- Component-local UI state lives in `signal()`. Derived state uses `computed()`.
- Clean up `matchMedia` listeners, subscriptions, and timers in `ngOnDestroy`.

### Forms

- **Template-driven** (`FormsModule`, `[(ngModel)]`) for simple forms (login, payout creation).
- **Reactive** (`ReactiveFormsModule`, `FormBuilder`) when validators are dynamic or form structure changes at runtime.
- Validate with Angular built-in validators. Do not use Zod for form validation — Zod is for HTTP response validation only.

### Services

- One service per domain area. No logic in components that belongs in a service.
- Services return `Observable<T>`. Components subscribe via `async` pipe or explicit subscription in `ngOnInit` (with corresponding `ngOnDestroy` teardown).
- Zod `.parse()` happens in the service `map()` pipeline, not in components.

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
