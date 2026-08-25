# Accessibility Testing Guide

This document explains how to use, run, and extend EduMind's accessibility
test infrastructure, and describes the automated regression suites for four
critical user flows:

1. Discover — Home → Browse Courses → Course Detail
2. Authentication — Login / Signup / Forgot Password / Reset Password
3. Purchase — Cart → Checkout → Success / Failed
4. Learning — My Learning → Course Player

New team members should read this document in order: **Setup** →
**Using `checkA11y`/keyboard utilities** → **Four flow a11y suites** →
**Pa11y** → **Current CI status and target policy**. See
`BASELINE_ACCESSIBILITY_AUDIT.md` for remediation
status per issue, and `E2E_TESTING_GUIDE.md` for general E2E conventions
(page objects, fixtures, auth strategy) that are not specific to accessibility.

## Three testing tiers

No single tool proves accessibility. The project uses three complementary
tiers:

| Tier | Tooling | Catches | Does not catch |
|---|---|---|---|
| Static | `eslint-plugin-jsx-a11y` (`npm run lint:a11y`) | Clear-cut JSX semantic errors at write time | Runtime errors, data/state-dependent errors |
| Automated browser | Axe (`checkA11y`) + Pa11y + keyboard helpers | Rule-level violations, missing accessible name/role/state, keyboard traps, focus order | Whether the listening experience is natural, whether reading order makes sense |
| Assistive technology | Safari + VoiceOver (manual) | Real listening experience, duplicated/silent announcements, business content | — (this is the final confirmation tier) |

Automation at the first two tiers is a necessary condition, not a sufficient
one. A flow is treated as verified only when its automated checks pass, its
before/after evidence is recorded, and its applicable manual Safari +
VoiceOver checklist has no unresolved failure.

## Current scope

Shared utilities live at:

- `e2e/utils/accessibility.ts`
- `e2e/tests/user/accessibility-utils.spec.ts` (tests for the utility, not for a flow)
- `e2e/playwright.utilities.config.ts`

This infrastructure provides:

- Axe scans of the full document, a CSS selector, or a Playwright `Locator`.
- An accessibility gate defaulting to WCAG A/AA.
- Tests that only fail on `critical` or `serious` violations.
- A JSON report attached to the Playwright artifact when the Axe gate fails.
- Output including rule ID, WCAG tags, selector, HTML, fix guidance, and reference URL.
- Focus order, hidden/disabled focus target, and keyboard trap checks.
- Focus indicator checks via computed style or screenshot assertion.

These helpers are used directly by the four flow a11y suites below — this is
no longer purely "tests for the test infrastructure," but the foundation for
the entire four-flow regression suite.

## Four flow a11y suites

Each of the four flows has its own spec file under `e2e/tests/user/`, sharing
page objects and fixtures with the other E2E tests
(see `E2E_TESTING_GUIDE.md`). Each suite calls `checkA11y` at its important UI
states (not just page load), plus keyboard/focus/announcement assertions
specific to those states.

| Flow | Spec file | Tag | npm script | Page object |
|---|---|---|---|---|
| Discover | `e2e/tests/user/discover-flow-a11y.spec.ts` | `@a11y @a11y-public` | `npm run test:a11y:public` | `e2e/page-objects/user/DiscoverFlowPage.ts` |
| Authentication | `e2e/tests/user/auth-flow-a11y.spec.ts` | `@a11y @a11y-auth` | `npm run test:a11y:auth` | `e2e/page-objects/user/LoginPage.ts` |
| Purchase | `e2e/tests/user/purchase-flow-a11y.spec.ts` | `@a11y-purchase` | `npm run test:a11y:purchase` | `e2e/page-objects/user/CartPage.ts` |
| Learning | `e2e/tests/user/learning-flow-a11y.spec.ts` | `@a11y-learning` | `npm run test:a11y:learning` | `e2e/page-objects/user/CoursePlayerPage.ts` |

Run all four suites together via their shared tag prefix. Playwright treats
`--grep @a11y` as a regular expression over the full test title, so it matches
`@a11y-public`, `@a11y-auth`, `@a11y-purchase`, and `@a11y-learning`:

```bash
npm run test:a11y
```

These run alongside the existing functional (non-a11y) suites
(`auth.spec.ts`, `course-browse.spec.ts`, `learning.spec.ts`): the a11y
suites do not replace the functional ones, they check a different dimension
(accessible name/role/state/keyboard) of the same flow. Exception:
`purchase-flow-a11y.spec.ts` is currently the only suite for cart/checkout —
there is no separate `purchase-flow.spec.ts` functional file, so this suite
also serves as the functional coverage for the purchase flow. If
functional/a11y coverage for purchase is split apart later, keep the network
mock pattern described in `E2E_TESTING_GUIDE.md`.

### Discover flow

`discover-flow-a11y.spec.ts` runs one end-to-end journey via
`DiscoverFlowPage`: Home → use the skip link with the keyboard → Tab to
"Browse Courses" → search/filter on `/courses` → open a fixture course
detail page → expand the curriculum accordion → Add to Cart as a guest
(redirects to `/login`). `checkA11y` runs at 5 states: home after using the
skip link, filtered results, course detail (guest), expanded curriculum, and
the destination page after the guest redirect. Beyond Axe, the test also
asserts: the skip link receives focus correctly via `Tab` then `Enter` moves
focus to the `#main-content` heading (`tabindex="-1"`), the "Expand/Collapse
all" button keeps `aria-expanded` in sync, and an expanded section panel has
`role="region"`.

### Authentication flow

`auth-flow-a11y.spec.ts` covers Login, Signup, Forgot Password, Reset Password,
and a separate guest-redirect-then-return journey:

- **Login:** label/autocomplete per field, password show/hide (`aria-pressed`
  toggles along with the name "Show password"/"Hide password"), 2FA challenge
  (`aria-describedby`/`toHaveAccessibleDescription`), validation error
  (`aria-invalid` + focus moves to the field/summary), one-time success
  (redirect to `/dashboard`), server error rendering exactly one
  `role="alert"` that itself receives focus (checks announcements aren't
  duplicated).
- **Signup:** `autocomplete` per field, `aria-invalid` + focus on validation
  error, success heading receives focus with `toHaveAccessibleDescription`.
- **Forgot Password:** validation, success `role="status"`, resend flow,
  server error rendering exactly one `role="alert"` that receives focus.
- **Reset Password:** missing-token state, valid-token labels/autocomplete,
  validation error, expired-token server error (a single alert, focus
  returns to the "Invalid Reset Link" heading), success announcement with a
  Login link.
- **Guest redirect:** visiting `/learning` while unauthenticated → redirect
  to `/login` → after successful login → return to `/learning`.

`checkA11y` runs after the relevant state transitions, not only after initial
render.

### Purchase flow

`purchase-flow-a11y.spec.ts` is split into two groups:

- **Cart and cart drawer** (`@a11y-purchase cart and drawer`, 6 tests):
  adding to cart from course detail emits exactly one `role="status"`
  announcement (no duplication); the cart drawer is a `role="dialog"` with
  focus trap, `Escape`, and focus returning to the trigger; an empty cart is
  a `role="region"` named "Your cart is empty"; a populated cart uses
  `role="list"` named "Courses in your cart"; removing an item shows a
  `role="dialog"` confirmation; after removal, the announcement reads the
  correct content and focus moves to the next item; a remove-API error has a
  recovery action.
- **Checkout acceptance** (`@a11y-purchase Flow 3 checkout acceptance`,
  3 tests): selecting a payment method by radio, the "Processing..." button's
  disabled state, the Success page's heading receiving focus with a
  `role="status"` of "Payment completed successfully.", the Failed page's
  heading "Payment Failed" receiving focus with Try Again/Return to Cart
  buttons, and a direct-checkout flow (`?courseId=`, "Buy Now" button)
  independent of cart state.

`/checkout/failed` is scanned with Axe and also has an explicit
`toHaveTitle()` assertion. The distinction matters: Axe's `document-title`
rule detects a missing or empty title, but a client-side SPA transition can
retain a non-empty title from the previous route. The explicit assertion
verifies that the title is correct for the failed-payment state.

### Learning flow

`learning-flow-a11y.spec.ts` uses the `authTest` fixture (from
`e2e/fixtures/auth.fixture.ts`) for its `@a11y-learning` journeys:

- **Main journey:** My Learning → roving-tabindex tablist (`ArrowRight` moves
  focus and `aria-selected`) → `role="list"` named "active courses" → into
  the Course Player: the current lesson has `aria-current="step"` and its
  accessible name includes "Completed" where applicable; keyboard media
  controls (`k` play/pause, `m` mute with `aria-pressed`, a "Captions" toggle
  with `aria-pressed` and a real `<track kind="captions">`); a simulated
  progress-save failure surfaces as `role="alert"` with a retry button;
  marking a lesson complete emits a `role="status"` progress announcement;
  navigating into a quiz lesson.
- **Desktop curriculum:** sidebar section toggle `aria-expanded` via
  Enter/Space, the selected lesson has `aria-current="step"`, selecting a
  lesson moves focus to the lesson heading.
- **Mobile drawer:** `role="dialog"` named "Course Content" opens/closes via
  `Escape` with a focus trap and focus returning to the toggle button.
- **Access error:** `role="alertdialog"` named "Enrollment required" with
  focus on the "Go Now" button.

`checkA11y` runs across the principal My Learning and Course Player states.

## Pa11y for public/auth routes

Current route list (defined in `e2e/pa11y/config.cjs`), each with its own
`readySelector` so the runner waits at the right moment:

| Route name | Path | Ready selector | Requires auth |
|---|---|---|---|
| `home` | `/` | `main h1` | No |
| `courses` | `/courses` | `main` | No |
| `course-detail` | `/courses/pa11y-accessibility-fixture` | `main h1` | No |
| `login` | `/login` | `form` | No |
| `signup` | `/signup` | `form` | No |
| `forgot-password` | `/forgot-password` | `form` | No |
| `reset-password-missing-token` | `/reset-password` | `h1` | No |
| `cart` | `/cart` | `main h1` | Yes |
| `checkout` | `/checkout` | `main h1` | Yes |
| `checkout-sepay-qr` | `/checkout/sepay-qr?...` | `h1` | Yes |
| `checkout-success` | `/checkout/success?order=PA11Y-ORDER-001` | `h1` | Yes |
| `checkout-failed` | `/checkout/failed?errorCode=INSTRUMENT_DECLINED&canRetry=true` | `h1` | Yes |
| `my-learning` | `/learning` | `main h1` | Yes |
| `course-player` | `/learning/pa11y-accessibility-fixture` | `main h1` | Yes |

Pa11y scans 14 deterministic routes using `WCAG2AA`. Nine routes preserve the
original Phase 0 comparison set; five authenticated purchase and learning
states extend the after-remediation and CI coverage. The runner
uses a read-only API fixture in `e2e/pa11y/fixtures.cjs`, blocks every API
write, and waits for a route-specific page-ready selector before auditing.
This means the runner does not read or mutate production data when it is
invoked locally or by a future CI job. The two checkout
result pages are opened using a local auth-state fixture; the runner fails if
a route is redirected to a different page.

Start the user app locally first, then run:

```bash
npm run start:user (same as nx serve user)
npm run pa11y
```

To point at a different local/ephemeral environment:

```bash
PA11Y_BASE_URL=http://127.0.0.1:3000 npm run pa11y
```

The default timeout is 60 seconds, overridable via `PA11Y_TIMEOUT`. Combined
JSON and per-route HTML are written to `e2e/pa11y/reports/`. A future
accessibility CI job should upload this entire directory even when the command
fails due to found violations.

`e2e/pa11y/reports/` is runtime output and is Git-ignored. The immutable
baseline from the Phase 0 audit is committed separately at
`e2e/accessibility-reports/before/pa11y/`. Once remediation is complete, save
the corresponding re-scan at `e2e/accessibility-reports/after/pa11y/`; do not
overwrite the baseline.

## Report lifecycle: runtime, before, and after

Three kinds of output serve different purposes:

| Kind | Directory | When to use | Git |
|---|---|---|---|
| Runtime | `e2e/pa11y/reports/` and Playwright artifacts | Every normal local run; future CI runs | Ignored; inspect locally today, upload when CI integration exists |
| Before | `e2e/accessibility-reports/before/` | Captured once, before remediation | Immutable evidence per project policy |
| After | `e2e/accessibility-reports/after/` | Re-scan after remediation, for comparison | Only committed once a milestone is actually complete |

### Running a normal check

This is the default command during development. No need to move any report:

```bash
npm run pa11y
```

Pa11y writes JSON/HTML into `e2e/pa11y/reports/` automatically. Files in this
directory can be deleted at any time; the next run regenerates them. Keep
`.gitignore` and `README.md`.

Playwright tests using `checkA11y()` save JSON into the Playwright artifact
when the Axe gate fails. These artifacts are also runtime output, not
committed before/after evidence.

### Generating Pa11y before evidence

Do this only once, before fixing any code:

```bash
PA11Y_REPORT_DIR=e2e/accessibility-reports/before/pa11y npm run pa11y
```

`PA11Y_REPORT_DIR` makes the runner write directly into the evidence
directory, so no manual move is needed. Phase 0 already has this baseline;
**do not re-run the command above and overwrite `before/pa11y/`**.

### Generating Pa11y after evidence

Only run this once remediation is complete and the UI is at the commit being
evaluated:

```bash
PA11Y_REPORT_DIR=e2e/accessibility-reports/after/pa11y npm run pa11y
```

Then:

1. Confirm all nine routes ran and none has a `scanError`.
2. Compare the result against `before/pa11y/pa11y-results.json`.
3. Update `BASELINE_ACCESSIBILITY_AUDIT.md` or the remediation report.
4. Only commit `after` as evidence once the result matches the milestone
   being delivered.

### Axe + keyboard before evidence

The baseline collector defaults to `e2e/accessibility-reports/before/` and
refuses to overwrite existing evidence:

```bash
npm run test:a11y:baseline
```

The committed Phase 0 files already exist, so this command now fails safely.
`A11Y_ALLOW_OVERWRITE=true` is an emergency opt-in for an intentional
replacement and must never be used during normal development or remediation.

### Axe + keyboard after evidence

Generate a fresh after-remediation scan in its own directory:

```bash
npm run test:a11y:after
```

The command sets `A11Y_REPORT_DIR=e2e/accessibility-reports/after`. It refuses
to replace an existing after report unless the caller explicitly sets
`A11Y_ALLOW_OVERWRITE=true`. Review the generated files before committing
them; do not copy or relabel before evidence.

Current status:

```text
Pa11y runtime    → automatic
Pa11y before     → exists; do not overwrite
Pa11y after      → committed; 0 issues across 14 routes (2026-08-24)
Axe before       → exists; collector writes to before by default
Axe after        → committed; 0 violations/keyboard issues across 9 routes (2026-08-25)
```

## Current CI policy

`.github/workflows/frontend-ci.yml` has a required accessibility job for
frontend changes. It installs Chromium, runs accessibility-aware ESLint, the
app-independent utility regression, all four Playwright + Axe journeys, and
Pa11y against the 14 deterministic routes. Playwright and Pa11y artifacts are
uploaded even when the job fails, and the aggregate required check fails when
the accessibility job does not succeed.

## Setup

From the repository root:

```bash
cd frontend
npm install
```

If Playwright's Chromium is not yet installed:

```bash
npx playwright install chromium
```

## Verifying the infrastructure

### 1. TypeScript

From the `frontend` directory:

```bash
./node_modules/.bin/tsc -p e2e/tsconfig.json --noEmit
```

Expected result: the command exits with code `0` and reports no TypeScript
errors.

### 2. Utility regression tests

```bash
npm run test:a11y:utilities
```

Expected result:

```text
6 passed
```

This suite does not start the user app, admin app, or database. Tests use
`page.setContent()`, so they can run independently and quickly.

Run sequentially with readable output:

```bash
./node_modules/.bin/playwright test \
  --config=e2e/playwright.utilities.config.ts \
  --workers=1 \
  --reporter=list
```

Debug with Playwright UI:

```bash
./node_modules/.bin/playwright test \
  --config=e2e/playwright.utilities.config.ts \
  --ui
```

## Using `checkA11y`

Example: scan the entire document:

```ts
import { test } from '@playwright/test';
import { checkA11y } from '../../utils/accessibility.js';

test('course page has no serious Axe violations @a11y-public', async ({
  page,
}, testInfo) => {
  await page.goto('/courses');
  await page.getByRole('heading', { name: /courses/i }).waitFor();

  await checkA11y(page, {
    stateName: 'courses loaded',
    testInfo,
  });
});
```

`stateName` must describe the exact UI state being scanned, not just the
route. For example:

- `login initial`
- `login validation errors`
- `cart with one item`
- `checkout payment pending`
- `course player lesson loaded`

### Scanning a specific region

You can pass a CSS selector:

```ts
await checkA11y(page, {
  context: 'main',
  stateName: 'course results',
  testInfo,
});
```

Or a Playwright `Locator`:

```ts
await checkA11y(page, {
  context: page.getByRole('dialog', { name: 'Shopping cart' }),
  stateName: 'cart dialog open',
  testInfo,
});
```

Scanning the whole document should be the default. Only scope the context
when the test is checking an isolated UI state and the rest of the page is
already covered by another test.

### WCAG tags

By default the helper runs:

```ts
[
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
]
```

Only override `tags` when the test has a specific purpose and the reason is
documented clearly in the test.

## Exclusion rules

Do not add an `exclude` just to make a test pass. Every excluded selector
must have:

- A technical reason and the remaining user impact.
- A trackable issue ID.
- A specific condition for removing the exclusion.

Example:

```ts
await checkA11y(page, {
  stateName: 'payment widget loaded',
  exclude: ['.third-party-payment-widget'],
  exclusionDocumentation: [
    {
      selector: '.third-party-payment-widget',
      reason:
        'Widget is rendered inside vendor-controlled markup; keyboard flow is tested separately.',
      issueId: 'A11Y-123',
      removalCondition:
        'Remove when the payment vendor exposes accessible markup or the widget is replaced.',
    },
  ],
  testInfo,
});
```

The helper fails before Axe runs if:

- A selector in `exclude` has no documentation.
- `reason` or `removalCondition` is empty.
- `issueId` is not a valid issue key or issue URL.
- Documentation is stale and no longer matches any selector in `exclude`.

## Keyboard utilities

### Sending Tab and recording focus

```ts
const focused = await tabAndRecordFocus(page);

expect(focused.selector).toBe('#email');
```

The helper automatically fails if focus lands on a hidden or disabled
element.

### Checking focus traversal and keyboard traps

```ts
const focusOrder = await walkKeyboardFocus(page, {
  maxTabs: 20,
});

expect(focusOrder.map((item) => item.selector)).toEqual([
  '#email',
  '#password',
  'button[type="submit"]',
]);
```

For a widget where focus must be able to exit:

```ts
await walkKeyboardFocus(page, {
  scope: page.getByRole('dialog'),
  mustExitScope: true,
  maxTabs: 20,
});
```

If focus repeats before leaving the scope, the helper reports a keyboard
trap.

Do not use `mustExitScope: true` for a modal that is correctly designed with
a focus trap. For modals, test separately:

- `Escape` closes the modal.
- Focus is returned to the element that opened the modal.
- Focus cannot escape to the background while the modal is open.

### Checking the focus indicator

```ts
const submitButton = page.getByRole('button', { name: 'Sign in' });
await submitButton.focus();

await expectFocusVisible(submitButton);
```

The helper accepts a focus indicator expressed via `outline` or
`box-shadow`.

At important UI points, you can add a screenshot assertion:

```ts
await expectFocusVisible(submitButton, 'login-submit-focused.png');
```

Screenshot assertions need a stable baseline and must be reviewed whenever
the UI changes; never auto-update a snapshot without a visual check first.

## When an Axe test fails

Console output includes:

- Severity.
- Axe rule ID.
- WCAG tags.
- Selector of the failing node.
- HTML snippet.
- Failure summary and fix guidance.
- Axe help URL.

If `testInfo` is passed to `checkA11y`, the helper attaches a JSON file named
like:

```text
axe-checkout-payment-pending.json
```

Open the Playwright report or the test artifact directory for the full
report. Don't just fix the reported node — determine whether the root cause
lives in a shared component, a page, or a third-party integration.

## Shared accessibility components/hooks

Flows don't implement accessibility independently — most of the behavior is
provided by a set of shared components/hooks in `apps/user/src` and
`libs/user/ui/src`. When adding a new screen, prefer reusing these instead of
hand-rolling ARIA:

| Component | Location | Responsibility |
|---|---|---|
| Skip link + route focus | `apps/user/src/app/layouts/MainLayout.tsx`, `AuthLayout.tsx` | Renders "Skip to main content"; after route changes, moves focus to the first heading inside `#main-content` |
| `useFocusTrap` | `apps/user/src/app/hooks/useFocusTrap.ts` | Traps Tab/Shift+Tab inside a container, focuses the first focusable element on open, closes on `Escape`, restores focus to the trigger on close. Used by `CartDrawer`, `RefundRequestModal`, `CourseAccessErrorDialog`, `CourseCompletionDialog`, the mobile course-curriculum drawer |
| `Input` / `PasswordInput` | `libs/user/ui/src/lib/Form/` | Label association via `useId()`, `aria-describedby` for error/helper text, required marker is `aria-hidden` |
| `Tabs` (roving tabindex) | `libs/user/ui/src/lib/Tabs/Tabs.tsx` | `role="tablist"`, Arrow/Home/End navigation, `aria-selected`. Used by My Learning's filter tabs |
| Live region / status | Scattered across `CartDrawer`, `CheckoutSuccessPage`, `CheckoutFailedPage`, `ForgotPasswordPage`, `ResetPasswordPage`, `SignupPage`, `AutoAdvanceBanner`, `ProgressSaveStatus`, etc. | `role="status"`/`aria-live="polite"` for success/error/progress announcements |
| `CourseCurriculumSidebar` | `apps/user/src/app/components/course-module/` (Course Player) | `aria-current="step"` for the current lesson, `aria-expanded` for sections, drawer semantics on mobile |

If an issue recurs across multiple pages (e.g. a missing label, a missing
focus trap), fix it in the shared component — do not patch each page
separately with an ARIA workaround. Add regression coverage at the shared
component level and in every affected journey state.

## Checklist for adding a new accessibility test

- Wait for a selector that represents the UI-ready state before calling `checkA11y`.
- Scan every important state, including loading, validation error, success, and dialog.
- Set a clear, unique `stateName` within the flow.
- Always pass `testInfo` so a JSON artifact is saved on failure.
- Don't use a fixed timeout to simulate a stable UI when a clear selector/state exists.
- Don't add an exclusion without an issue and a removal condition.
- Test keyboard behavior, not just Axe.
- Check the focus indicator at important state-transition points.
- Keep Safari + VoiceOver manual testing in the handoff; automated tests do not
  replace real assistive technology.

## Current limitations

- Axe cannot evaluate the real listening experience or whether the reading
  order is natural.
- Computed style only confirms a technical focus indicator exists; a visual
  review is still needed to confirm the indicator is clear enough and not
  obscured.
- The keyboard traversal helper does not replace dedicated interaction tests
  for tabs, menus, comboboxes, grids, and modal dialogs.
- The four flow a11y suites (`discover-flow-a11y.spec.ts`,
  `auth-flow-a11y.spec.ts`, `purchase-flow-a11y.spec.ts`,
  `learning-flow-a11y.spec.ts`) provide automated regression coverage for
  Axe/keyboard/focus/announcements at the main states, but do not prove
  full-site WCAG 2.2 AA conformance. The dated Safari + VoiceOver checklists
  close the documented four-flow milestone only for their recorded states and
  environment.
- Windows High Contrast/forced-colors, mobile screen readers, the Angular
  admin portal, voice control, and usability testing with disabled
  participants remain outside the recorded scope.
- Video lesson captions/transcripts use a fixture test track. Real caption
  content for each course video still depends on valid caption/transcript
  source data in the deployed environment; fixture coverage does not verify
  the quality or availability of production course content.
