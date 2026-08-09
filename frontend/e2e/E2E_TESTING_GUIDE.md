# Frontend E2E Testing Guide

> Detailed guide for Playwright end-to-end tests in this repository.

---

## Table of Contents

1. [What This Test Suite Covers](#what-this-test-suite-covers)
2. [How E2E Testing Works Here](#how-e2e-testing-works-here)
3. [File Structure](#file-structure)
4. [Prerequisites](#prerequisites)
5. [Configuration Deep Dive](#configuration-deep-dive)
6. [Authentication Strategy](#authentication-strategy)
7. [Data and Account Setup](#data-and-account-setup)
8. [Running Tests](#running-tests)
9. [Test Suites Overview](#test-suites-overview)
10. [Page Object Model Pattern](#page-object-model-pattern)
11. [Selectors and `data-testid` Contract](#selectors-and-data-testid-contract)
12. [Network Mocking Pattern](#network-mocking-pattern)
13. [Debugging and Reports](#debugging-and-reports)
14. [Troubleshooting](#troubleshooting)
15. [How to Add New E2E Tests](#how-to-add-new-e2e-tests)
16. [Current CI Boundary](#current-ci-boundary)

---

## What This Test Suite Covers

This E2E test suite validates both frontend apps:

- User app (React, `http://localhost:3000`)
- Admin app (Angular, `http://localhost:4200`)

It focuses on high-value flows:

- Authentication and route guards
- Course browsing and learning journey
- Cart and checkout flow
- Admin categories CRUD
- Admin student and teacher application management

It also includes a dedicated accessibility (a11y) regression layer for the
four critical user journeys (Discover, Authentication, Purchase, Learning).
Those suites live alongside the functional specs described here but are
documented separately in
[ACCESSIBILITY_TESTING.md](ACCESSIBILITY_TESTING.md), since they follow their
own conventions (`checkA11y`, keyboard helpers, `@a11y*` tags). This guide
covers general E2E conventions — page objects, fixtures, auth strategy,
mocking — that apply to both functional and a11y specs.

---

## How E2E Testing Works Here

```text
1) npm run e2e[:user|:admin]
        |
        v
2) Playwright loads e2e/playwright.config.ts
        |
        +--> Starts web servers (user + admin) if not already running
        +--> Runs global setup once
        |
        v
3) Playwright selects project(s): user-app and/or admin-app
        |
        v
4) Executes tests in e2e/tests/**
        |
        +--> Some tests login via UI
        +--> Most authenticated tests use API-login fixture
        +--> Certain flows intercept network requests with page.route()
        |
        v
5) Outputs: pass/fail, screenshots, traces, HTML report
```

Important behavior:

- `global-setup.ts` checks backend health and validates the student test account.
- If credentials are invalid in auth fixtures, tests are skipped with a clear reason (not hard-failed).
- Tests are parallel locally; CI can reduce workers/retry differently.
- The routine `user-app` project includes functional specs and the four
  `*-flow-a11y.spec.ts` suites. It explicitly excludes the one-shot baseline
  collector and the app-independent accessibility utility regression spec;
  those use dedicated configs and commands.

---

## File Structure

```text
frontend/
├── e2e/
│   ├── playwright.config.ts
│   ├── global-setup.ts
│   ├── tsconfig.json
│   ├── fixtures/
│   │   ├── data.fixture.ts          # env-driven test accounts + API URL
│   │   └── auth.fixture.ts          # API login + localStorage injection
│   ├── page-objects/
│   │   ├── user/
│   │   │   ├── LoginPage.ts
│   │   │   ├── CourseBrowsePage.ts
│   │   │   ├── DiscoverFlowPage.ts     # skip link, filter, curriculum a11y helpers
│   │   │   ├── CartPage.ts
│   │   │   └── CoursePlayerPage.ts
│   │   └── admin/
│   │       ├── AdminLoginPage.ts
│   │       ├── CategoriesPage.ts
│   │       ├── StudentsPage.ts
│   │       └── TeacherApplicationsPage.ts
│   ├── tests/
│   │   ├── user/
│   │   │   ├── auth.spec.ts                  # functional: login/logout/guards
│   │   │   ├── auth-flow-a11y.spec.ts        # a11y: Flow 2 (see ACCESSIBILITY_TESTING.md)
│   │   │   ├── course-browse.spec.ts         # functional: browse/search/pagination
│   │   │   ├── discover-flow-a11y.spec.ts    # a11y: Flow 1
│   │   │   ├── purchase-flow-a11y.spec.ts    # functional + a11y: Flow 3 (cart/checkout)
│   │   │   ├── learning.spec.ts              # functional: enrollment/player navigation
│   │   │   ├── learning-flow-a11y.spec.ts    # a11y: Flow 4
│   │   │   ├── baseline-a11y.spec.ts         # one-shot Axe+keyboard baseline collector
│   │   │   └── accessibility-utils.spec.ts   # tests for e2e/utils/accessibility.ts itself
│   │   └── admin/
│   │       ├── admin-auth.spec.ts
│   │       ├── categories-crud.spec.ts
│   │       ├── student-management.spec.ts
│   │       └── teacher-applications.spec.ts
│   ├── utils/
│   │   └── accessibility.ts            # checkA11y, keyboard/focus helpers (see ACCESSIBILITY_TESTING.md)
│   ├── accessibility-reports/
│   │   └── before/                     # committed Axe/Pa11y baseline evidence
│   ├── pa11y/
│   │   ├── config.cjs, run.cjs, fixtures.cjs
│   │   └── reports/                    # gitignored runtime output
│   └── scripts/
│       └── seed-test-accounts.ts
└── package.json
```

Note: `purchase-flow-a11y.spec.ts` is currently the **only** spec covering
cart/checkout — there is no separate `purchase-flow.spec.ts` functional file.
It combines network-mocked functional assertions (see
[Network Mocking Pattern](#network-mocking-pattern)) with `checkA11y`/keyboard
checks in one file, unlike auth/course-browse/learning where functional and
a11y coverage are split into separate spec files.

---

## Prerequisites

From `frontend/`:

1. Install dependencies:

```bash
npm install
```

2. Install Playwright browser(s) if needed:

```bash
npx playwright install
```

3. Create local E2E env file (required for credentials):

```bash
cp .env.e2e.example .env.e2e
```

Then fill all required values in `frontend/.env.e2e`.

4. Make sure backend is reachable at `http://localhost:8080` (or set `E2E_API_URL`).

5. Ensure valid E2E account(s):

- Student account required for many user tests.
- Admin account required for admin tests.

---

## Configuration Deep Dive

Main config: `frontend/e2e/playwright.config.ts`

### Global config

- `testDir: './tests'`
- `retries: CI ? 2 : 0`
- `workers: CI ? 1 : default`
- Artifacts on failure/retry:
  - screenshot: `only-on-failure`
  - trace: `on-first-retry`
  - video: `on-first-retry`

### Projects

- `user-app`
  - `testMatch: tests/user/**/*.spec.ts`
  - `testIgnore: baseline-a11y.spec.ts, accessibility-utils.spec.ts`
  - `baseURL: http://localhost:3000`
- `admin-app`
  - `testMatch: tests/admin/**/*.spec.ts`
  - `baseURL: http://localhost:4200`

### Web server auto-start

Playwright starts these commands when needed:

- `npm run start:user`
- `npm run start:admin`

Both use `reuseExistingServer: true`.

### Reporters

- HTML report (always)
- GitHub reporter (CI only)

---

## Authentication Strategy

The suite uses two auth modes.

### 1) UI login (real form interaction)

Used for explicit login flow tests in:

- `e2e/tests/user/auth.spec.ts`
- `e2e/tests/admin/admin-auth.spec.ts`

Purpose:

- Validate form rendering, validation, and redirect behavior.

### 2) API login fixture (fast setup for protected tests)

Defined in `e2e/fixtures/auth.fixture.ts`:

- Calls `POST /api/auth/login` directly.
- Extracts `accessToken`.
- Injects localStorage before app boot via `page.addInitScript()`.

Storage keys used:

- User app:
  - `auth-storage` (Zustand persisted state)
  - `accessToken` and `user` (legacy compatibility)
- Admin app:
  - `admin_auth_token`
  - `admin_user`

If login fails, fixture throws `AuthSkipError` and skips test with setup guidance.

---

## Data and Account Setup

### Environment variables

Defined in `e2e/fixtures/data.fixture.ts`:

- `E2E_STUDENT_EMAIL` (required)
- `E2E_STUDENT_PASSWORD` (required)
- `E2E_TEACHER_EMAIL` (required)
- `E2E_TEACHER_PASSWORD` (required)
- `E2E_ADMIN_EMAIL` (required)
- `E2E_ADMIN_PASSWORD` (required)
- `E2E_API_URL` (optional, defaults to `http://localhost:8080`)

Credentials source:

- `frontend/.env.e2e` is auto-loaded by Playwright config.
- NPM E2E scripts also pass `--env-file=.env.e2e`.
- If any required credential var is missing, tests fail fast with a clear error.

### Seed script

`e2e/scripts/seed-test-accounts.ts` creates the student account from env values
(`E2E_STUDENT_EMAIL` / `E2E_STUDENT_PASSWORD`) if missing.

Run:

```bash
node --env-file=.env.e2e --import=tsx e2e/scripts/seed-test-accounts.ts
```

Notes:

- Safe to run multiple times.
- If signup is blocked by email verification, use existing verified credentials in `.env.e2e`.

### Global setup behavior

`e2e/global-setup.ts`:

- Checks `/actuator/health`
- Verifies student login credentials
- Warns if unavailable, but does not hard crash the suite

---

## Running Tests

From `frontend/`:

```bash
# Run all E2E tests (user + admin)
npm run e2e

# Run only user app E2E tests
npm run e2e:user

# Run only admin app E2E tests
npm run e2e:admin

# Interactive Playwright UI mode
npm run e2e:ui

# Open HTML report
npm run e2e:report
```

Accessibility suites run through the same Playwright config but are selected
by tag rather than by project, and only target `user-app`:

```bash
# All four a11y flow suites
npm run test:a11y

# One flow at a time
npm run test:a11y:public      # Discover (Home → Browse → Course Detail)
npm run test:a11y:auth        # Authentication (Login/Signup/Forgot/Reset)
npm run test:a11y:purchase    # Purchase (Cart → Checkout → Success/Failed)
npm run test:a11y:learning    # Learning (My Learning → Course Player)
```

See [ACCESSIBILITY_TESTING.md](ACCESSIBILITY_TESTING.md) for what each suite
asserts, the `checkA11y`/keyboard helper API, and the Pa11y/Axe baseline
tooling (`npm run pa11y`, `playwright.baseline-a11y.config.ts`).

Dedicated accessibility infrastructure and evidence commands:

```bash
# App-independent regression tests for e2e/utils/accessibility.ts
npm run test:a11y:utilities

# Historical collector; refuses to overwrite the committed before evidence
npm run test:a11y:baseline

# Write a new Axe + keyboard scan to accessibility-reports/after/
npm run test:a11y:after
```

Inspect selection without executing tests:

```bash
# Confirm all four @a11y-* prefixes are selected
npx playwright test --config=e2e/playwright.config.ts \
  --project=user-app --grep @a11y --list

# Confirm the routine user project excludes collector and utility specs
npx playwright test --config=e2e/playwright.config.ts \
  --project=user-app --list

# Confirm each dedicated config selects one intended spec
npx playwright test --config=e2e/playwright.utilities.config.ts --list
npx playwright test --config=e2e/playwright.baseline-a11y.config.ts --list
```

Run one specific file:

```bash
npx playwright test --config=e2e/playwright.config.ts --project=user-app e2e/tests/user/auth.spec.ts
```

Run one specific test title:

```bash
npx playwright test --config=e2e/playwright.config.ts --project=admin-app -g "approve application"
```

Useful flags:

```bash
# Headed mode
npx playwright test --config=e2e/playwright.config.ts --headed

# Debug mode
npx playwright test --config=e2e/playwright.config.ts --debug

# Re-run only failed tests
npx playwright test --config=e2e/playwright.config.ts --last-failed
```

---

## Test Suites Overview

### User test suites

Functional suites (behavior/routing/state, no accessibility assertions):

- `e2e/tests/user/auth.spec.ts`
  - guest guards
  - login success/failure
  - auth persistence
  - logout route protection
- `e2e/tests/user/course-browse.spec.ts`
  - browse page load
  - search interaction
  - pagination
  - navigate to course detail
- `e2e/tests/user/learning.spec.ts`
  - enrollment list
  - filter tabs
  - continue learning to player
  - lesson navigation and progress UI
  - certificates page access

Accessibility suites (`checkA11y` scans + keyboard/focus/announcement
assertions per UI state; see
[ACCESSIBILITY_TESTING.md](ACCESSIBILITY_TESTING.md) for full detail):

- `e2e/tests/user/discover-flow-a11y.spec.ts` — `@a11y-public`: skip link,
  Home → Browse → Course Detail keyboard journey, curriculum accordion,
  guest add-to-cart redirect.
- `e2e/tests/user/auth-flow-a11y.spec.ts` — `@a11y-auth`: Login, Signup,
  Forgot/Reset Password, and guest-redirect-then-return, across default,
  validation-error, server-error, 2FA, and success states.
- `e2e/tests/user/purchase-flow-a11y.spec.ts` — `@a11y-purchase`: cart/cart
  drawer, remove-item flow, checkout payment-method selection, and Success/
  Failed pages. Also the only spec covering cart/checkout functionally (see
  the note in [File Structure](#file-structure)).
- `e2e/tests/user/learning-flow-a11y.spec.ts` — `@a11y-learning`: My Learning
  tabs, Course Player sidebar/lesson navigation, video keyboard controls and
  captions, progress-save error/retry, mark-complete announcement.
- `e2e/tests/user/baseline-a11y.spec.ts` — one-shot Axe + keyboard scan across
  9 fixture routes, writing evidence to `e2e/accessibility-reports/before/`.
  Excluded from the routine `user-app` project and protected against
  overwriting existing evidence; see ACCESSIBILITY_TESTING.md before running it.
- `e2e/tests/user/accessibility-utils.spec.ts` — regression tests for the
  `checkA11y`/keyboard helpers themselves (`e2e/utils/accessibility.ts`), run
  via `playwright.utilities.config.ts`, not the main `playwright.config.ts`.

### Admin test suites

- `e2e/tests/admin/admin-auth.spec.ts`
  - auth/guest guards
  - login success/failure
  - dashboard visibility
  - logout and token clearing
- `e2e/tests/admin/categories-crud.spec.ts`
  - create/read/update/delete category
  - status toggle
  - search + empty-state handling
- `e2e/tests/admin/student-management.spec.ts`
  - table and stat visibility
  - search/filter behavior
  - status toggle
  - detail modal opening
- `e2e/tests/admin/teacher-applications.spec.ts`
  - tab filtering
  - detail modal
  - approve/reject flows (with reason validation)

Many tests skip gracefully when required data is missing (empty DB or no pending records).

---

## Page Object Model Pattern

Each functional area has a page object class wrapping selectors + actions.

Benefits:

- Avoid duplicated selector logic across specs
- Keep tests readable and behavior-focused
- Reduce maintenance when UI structure changes

Pattern example:

```typescript
// page-objects/user/LoginPage.ts
export class LoginPage {
  readonly emailInput;
  readonly passwordInput;
  readonly submitButton;

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
```

Then in spec:

```typescript
const loginPage = new LoginPage(page);
await loginPage.goto();
await loginPage.login(email, password);
```

---

## Selectors and `data-testid` Contract

To reduce flakiness, staged UI updates added stable `data-testid` hooks.

Added selectors in app templates/components:

- `frontend/apps/user/src/app/pages/auth/LoginPage.tsx`
  - `data-testid="login-error"`
- `frontend/apps/user/src/app/pages/learning/components/EnrollmentCardNew.tsx`
  - `data-testid="enrollment-card"`
  - `data-testid="continue-learning-button"`
- `frontend/apps/admin/src/app/features/categories/categories.component.html`
  - `data-testid="category-row"`
- `frontend/apps/admin/src/app/features/students/students.component.html`
  - `data-testid="stat-card"`
- `frontend/apps/admin/src/app/features/dashboard/dashboard.component.html`
  - `data-testid="stat-card"`
- `frontend/apps/admin/src/app/features/teachers/teacher-applications/teacher-applications.component.html`
  - `data-testid="tab-pending"`
  - `data-testid="tab-approved"`
  - `data-testid="tab-rejected"`
  - `data-testid="application-row"`

Guideline:

- Prefer semantic selectors (`getByRole`, `getByLabel`, `getByPlaceholder`) first.
- Add `data-testid` only where semantics are unstable or ambiguous.

---

## Network Mocking Pattern

Used in `e2e/tests/user/purchase-flow-a11y.spec.ts` via `page.route()`.

Why this pattern is used:

- Keeps tests independent of payment provider availability.
- Validates frontend state transitions and routing on deterministic responses.
- Enables direct testing of edge cases (402/500-like failures).

Example:

```typescript
await page.route('**/api/checkout**', async (route) => {
  await route.fulfill({
    status: 402,
    contentType: 'application/json',
    body: JSON.stringify({ code: 'PAYMENT_FAILED', message: 'Payment could not be processed' }),
  });
});
```

---

## Debugging and Reports

### HTML report

After test run:

```bash
npm run e2e:report
```

### Trace viewer

If a test fails on retry, trace is captured.

```bash
npx playwright show-trace <path-to-trace.zip>
```

### UI mode

```bash
npm run e2e:ui
```

Useful for step-by-step debugging, locator inspection, and quick retries.

---

## Troubleshooting

### "Backend health endpoint unreachable"

- Start backend services.
- Verify API gateway on `http://localhost:8080`.
- Or set `E2E_API_URL` correctly.

### "AuthSkipError" / account credentials invalid

- Seed accounts:
  - `npx tsx e2e/scripts/seed-test-accounts.ts`
- Or set valid env vars:
  - `E2E_STUDENT_EMAIL`, `E2E_STUDENT_PASSWORD`, etc.

### Many tests are skipped

- This is expected when DB lacks required data (enrollments, pending teacher apps, cart items).
- Seed representative data or run in an environment with realistic fixtures.

### Flaky selectors

- Prefer role-based selectors.
- Add stable `data-testid` to template when business-critical.
- Avoid brittle CSS-depth selectors.

### Report path confusion

- Use `npm run e2e:report` to open the correct configured report path.

### Baseline collector refuses to run

- This is expected when committed evidence already exists in
  `e2e/accessibility-reports/before/`.
- Use `npm run test:a11y:after` for a remediation re-scan.
- Use `A11Y_ALLOW_OVERWRITE=true` only for an intentional, reviewed evidence
  replacement; never use it to make a normal local run pass.

---

## How to Add New E2E Tests

1. Pick target app and create file under:
   - `e2e/tests/user/` or `e2e/tests/admin/`
2. Reuse or extend page object in `e2e/page-objects/**`.
3. Decide auth mode:
   - UI login if auth itself is the feature
   - `auth.fixture.ts` for authenticated setup speed
4. Keep test data isolated:
   - use timestamped names where possible
   - avoid assuming global DB cleanup
5. Add deterministic waits:
   - `waitForURL`, `waitForResponse`, `expect(...).toBeVisible()`
6. For external dependencies (payments, etc.), use `page.route()` for controlled responses.
7. Run only the changed spec first, then full project suite.

Starter template:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('does something important', async ({ page }) => {
    await page.goto('/target-route');
    await expect(page.getByRole('heading', { name: /target/i })).toBeVisible();
  });
});
```

---

If you keep selectors stable, isolate data per test, and use fixtures intentionally,
this suite stays fast, readable, and reliable for both local development and CI.

## Current CI Boundary

The current frontend workflow runs Nx affected lint, unit tests, and builds.
It does not run Playwright E2E, the four accessibility flows, Pa11y, or browser
artifact upload. All commands in this guide are supported locally, but E2E/a11y
results must be recorded manually in pull requests until a dedicated CI job is
implemented. See `ACCESSIBILITY_TESTING.md` for the target accessibility CI
policy.
