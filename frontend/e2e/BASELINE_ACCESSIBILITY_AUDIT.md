# Accessibility baseline audit and remediation status

**Scope:** task 2.4 in `4-flow-a11y.md`, tracked through remediation of the
four flows (Discover, Authentication, Purchase, Learning).

**Standard:** WCAG 2.2 Level AA target

**Baseline date:** 2026-07-31

**Remediation status as of:** 2026-08-09 (see [Remediation status](#remediation-status)).
This section supersedes the per-issue "Open" status recorded at baseline time.
The baseline numbers below (lint/Pa11y/Axe counts, issue log) are a frozen
point-in-time snapshot and are **not** re-run in place — re-running any of the
baseline commands today will not reproduce these exact numbers, because the
underlying components have since changed. See
[After-evidence status](#after-evidence-status) for why a committed `after/`
report set does not exist yet, and what is required to produce one.

**Overall status:** Four-flow implementation (shared components, page fixes,
automated regression tests) was merged in commit `6bc954f`
([PR #139](https://github.com/HuuLocFIT/EduMind/pull/139)).
**Real Safari + VoiceOver testing per
`4-flow-a11y.md` §1 has not been recorded in this repository and remains
required before any flow can be marked "closed"** under that plan's closing
criteria. Do not describe this project as WCAG 2.2 AA conformant based on this
document alone.

## Commands and evidence

| Check | Command | Result / evidence |
|---|---|---|
| JSX accessibility lint | `npm run lint:a11y` | Failed baseline: 628 findings (105 errors, 523 warnings). This command scans the full user app/UI library, so many findings are outside the four-flow route baseline. Representative in-scope blockers include missing label associations, non-keyboard click targets, missing video captions, invalid ARIA roles/properties, and an unfocusable tablist. |
| Pa11y URL scan | `npm run pa11y` | Existing completed baseline: 30 errors across 9 routes; no route scan errors. Committed baseline JSON and per-route HTML are in `e2e/accessibility-reports/before/pa11y/`. Generated reports from later local/CI runs remain in the ignored `e2e/pa11y/reports/` directory. |
| Axe + keyboard baseline | `A11Y_BASE_URL=http://localhost:3000 npx playwright test --config=e2e/playwright.baseline-a11y.config.ts` | Completed against the local fixture-backed app: 9/9 routes scanned without `scanError`; 6 Axe violation nodes (2 critical, 4 serious); 0 automated keyboard-smoke issues. Raw per-route JSON and `summary.json` are in `e2e/accessibility-reports/before/`. |

Pa11y route totals: `/` 4, `/courses` 4, stable course detail 0,
`/login` 5, `/signup` 14, `/forgot-password` 1, missing-token reset 0,
checkout success 1, and checkout failed 1.

Axe route totals: home 0, courses 1 serious, stable course detail 1 serious,
login 1 critical, signup 1 critical, forgot password 0, missing-token reset 0,
checkout success 1 serious, and checkout failed 1 serious.

## Remediation status

Summary table; see the [Issue log](#issue-log) for full detail per issue.
"Fixed (code-verified)" means the current source was read and confirmed to
implement the described behavior — it is **not** the same as a re-run Axe/Pa11y
scan or a Safari + VoiceOver pass, both of which are still outstanding for
every issue below.

| ID | Summary | Status |
|---|---|---|
| A11Y-BL-001 | Auth input label association | Fixed (code-verified) |
| A11Y-BL-002 | Password-visibility toggle keyboard/name | Fixed (code-verified) |
| A11Y-BL-003 | Price filter input labels on `/courses` | Fixed (code-verified) |
| A11Y-BL-004 | Contrast: required marker / decorative separators | Open — `aria-hidden` changes do not verify or remediate rendered contrast |
| A11Y-BL-005 | Missing/empty `<title>` on `/courses`, checkout success/failed | Fixed (code-verified) on all three routes; after scan and VoiceOver pending |
| A11Y-BL-006 | Invalid list markup in course-detail curriculum | Fixed (code-verified) |

Beyond the six original issues, the four-flow implementation (see
`4-flow-a11y.md`) added shared accessibility infrastructure that the baseline
audit did not have and could not have checked, because it did not exist yet:

- A skip link and route-level focus management in `MainLayout.tsx` and
  `AuthLayout.tsx` (moves focus to the page's first heading after navigation).
- `useFocusTrap` (`apps/user/src/app/hooks/useFocusTrap.ts`), used by
  `CartDrawer`, `RefundRequestModal`, `CourseAccessErrorDialog`,
  `CourseCompletionDialog`, and the mobile course-curriculum drawer.
- A roving-tabindex `Tabs` component (`libs/user/ui/src/lib/Tabs/Tabs.tsx`)
  used by My Learning's status filter tabs.
- `role="status"`/`aria-live` announcements across cart, checkout, auth,
  My Learning, and course-player state transitions.
- `aria-current="step"` on the active lesson in the course player sidebar.

These are exercised by the new Playwright suites described in
[ACCESSIBILITY_TESTING.md](ACCESSIBILITY_TESTING.md), not by the original
Phase 0 Pa11y/Axe baseline, so there is no "before" count to compare them
against — they are new coverage, not remediated baseline findings.

## After-evidence status

No `e2e/accessibility-reports/after/` directory exists yet. The remaining work
has three different statuses:

1. **Pa11y** already supports writing to an arbitrary directory via
   `PA11Y_REPORT_DIR` (see
   [ACCESSIBILITY_TESTING.md](ACCESSIBILITY_TESTING.md#generating-pa11y-after-evidence)),
   so an after-evidence Pa11y re-scan can be produced today with:

   ```bash
   PA11Y_REPORT_DIR=e2e/accessibility-reports/after/pa11y npm run pa11y
   ```

   This has not been run yet for the current codebase state — do so before
   closing any flow per `4-flow-a11y.md`'s handoff requirements.

2. **Axe + keyboard after scan is supported but pending execution.** The
   collector accepts `A11Y_REPORT_DIR`, refuses to overwrite existing evidence
   by default, and is exposed as `npm run test:a11y:after`. Run it against the
   remediated app, review the output, and commit the result to
   `e2e/accessibility-reports/after/`. Do not hand-copy files from a `before`
   run and relabel them as `after`.

3. **Manual verification remains pending.** Safari + VoiceOver results have
   not been recorded for any of the four flows.

Until both of the above are done and reviewed against the `before/` baseline,
treat every "Fixed (code-verified)" status in this document as source-level
confirmation only, not as a validated accessibility regression gate.

## Issue log

Issues are grouped by shared root cause. `After evidence` was deliberately
left unfilled when this document was a before-remediation-only audit; per-issue
current status is now recorded below and rolled up in
[Remediation status](#remediation-status).

### A11Y-BL-001

- **ID:** A11Y-BL-001
- **Route / component:** `/login`, `/signup`, `/forgot-password`; shared auth form input component
- **State:** Initial form render
- **WCAG criterion:** 1.3.1 Info and Relationships (A); 4.1.2 Name, Role, Value (A)
- **Tool/manual:** Pa11y (HTML_CodeSniffer)
- **Severity:** Serious
- **Steps to reproduce:** Start the local fixture-backed app, run `npm run pa11y`, and inspect the named auth-route reports. Inspect the username, email, phone, and password inputs in an accessibility tree.
- **Expected behavior:** Every form control has a programmatically associated, persistent label; placeholder text is supplementary only.
- **Proposed fix:** Correct the shared input API so visible labels use matching `for`/`id` associations (or wrapping labels), and preserve descriptions/errors with `aria-describedby`.
- **Before evidence:** `e2e/accessibility-reports/before/pa11y/pa11y-results.json`; 15 Pa11y errors across the related H91 and F68 rules (some nodes produce both rules).
- **After evidence:** No committed re-scan yet; see [After-evidence status](#after-evidence-status). Verified fixed by source inspection: `libs/user/ui/src/lib/Form/Input.tsx` generates `inputId` via `useId()` and matches `<label htmlFor>` to `<input id>`; error/helper text is wired through `aria-describedby`. `PasswordInput` wraps `Input`, so Login/Signup/Forgot/Reset all inherit the fix. Covered by `e2e/tests/user/auth-flow-a11y.spec.ts` (label/`getByLabel` assertions per field).
- **Status:** Fixed (code-verified) — pending Pa11y/Axe re-scan and VoiceOver confirmation per `4-flow-a11y.md`.

### A11Y-BL-002

- **ID:** A11Y-BL-002
- **Route / component:** `/login`, `/signup`; shared password visibility button
- **State:** Initial form render
- **WCAG criterion:** 4.1.2 Name, Role, Value (A); 2.1.1 Keyboard (A)
- **Tool/manual:** Pa11y plus source/markup observation
- **Severity:** Serious
- **Steps to reproduce:** Open login or signup and inspect the icon-only password visibility button. It has no accessible name and `tabindex="-1"`.
- **Expected behavior:** The control is keyboard reachable, has a name such as “Show password,” and exposes its current state.
- **Proposed fix:** Keep the button in normal tab order, add a stable accessible name, and expose pressed/expanded state appropriate to the chosen interaction.
- **Before evidence:** `e2e/accessibility-reports/before/pa11y/login.html` and `signup.html` (`H91.Button.Name`, 2 nodes); `e2e/accessibility-reports/before/login.json` and `signup.json` (`button-name`, 1 critical node per route). The keyboard snapshot records no traversal anomaly, but the source/markup observation remains valid because a `tabindex="-1"` control is intentionally absent from sequential focus.
- **After evidence:** No committed re-scan yet; see [After-evidence status](#after-evidence-status). Verified fixed by source inspection: `libs/user/ui/src/lib/Form/PasswordInput.tsx` renders the toggle as a normal-tab-order `<button type="button">` with `aria-label` that switches between "Show {field}"/"Hide {field}" and `aria-pressed={showPassword}`. Covered by `e2e/tests/user/auth-flow-a11y.spec.ts` (asserts `getByRole('button', { name: 'Show password' })` / `'Hide password'` and `aria-pressed` toggling).
- **Status:** Fixed (code-verified) — pending Pa11y/Axe re-scan and VoiceOver confirmation per `4-flow-a11y.md`.

### A11Y-BL-003

- **ID:** A11Y-BL-003
- **Route / component:** `/courses`; shared price range filter inputs
- **State:** Course browse filters visible
- **WCAG criterion:** 4.1.2 Name, Role, Value (A)
- **Tool/manual:** Pa11y (HTML_CodeSniffer)
- **Severity:** Serious
- **Steps to reproduce:** Open `/courses`, expose the price filter if needed, and inspect both number inputs.
- **Expected behavior:** Minimum and maximum inputs have distinct programmatic names and are associated with the price-range group.
- **Proposed fix:** Add visible associated labels (preferred), unique IDs, and retain the fieldset/legend grouping.
- **Before evidence:** `e2e/accessibility-reports/before/pa11y/courses.html` (`H91.InputNumber.Name`, 2 nodes).
- **After evidence:** No committed re-scan yet; see [After-evidence status](#after-evidence-status). Verified fixed by source inspection: `apps/user/src/app/pages/public/components/BrowseFilterSidebar.tsx` wraps the min/max price inputs in a `<fieldset>` with a `sr-only legend`, and each input has its own visible `<label htmlFor>` ("Min ($)" / "Max ($)"). The slider variant (`PriceRangeSlider.tsx`) additionally exposes `aria-label`/`aria-valuemin/max/now/text`.
- **Status:** Fixed (code-verified) — pending Pa11y/Axe re-scan and VoiceOver confirmation per `4-flow-a11y.md`.

### A11Y-BL-004

- **ID:** A11Y-BL-004
- **Route / component:** `/`, `/courses`, `/signup`; course-card metadata separators and required markers
- **State:** Course cards / signup form visible
- **WCAG criterion:** 1.4.3 Contrast (Minimum) (AA)
- **Tool/manual:** Pa11y (HTML_CodeSniffer)
- **Severity:** Moderate
- **Steps to reproduce:** Run the Pa11y baseline and inspect the reported gray separators and red required markers.
- **Expected behavior:** Meaningful text meets 4.5:1 (or 3:1 for qualifying large text); purely decorative separators are not exposed as meaningful text.
- **Proposed fix:** Treat decorative separators as decorative and adjust visual tokens; change the required-marker token or presentation so visible meaningful content meets contrast.
- **Before evidence:** `e2e/accessibility-reports/before/pa11y/pa11y-results.json` (`G18.Fail`, 9 nodes).
- **After evidence:** No committed re-scan yet; see [After-evidence status](#after-evidence-status).
- **Status:** Open — the rendered contrast has not been reverified:
  - Required-marker part (signup): `Input.tsx` now wraps the asterisk in
    `<span aria-hidden="true">`, which removes it from the accessible-name path
    but does not change its visible `text-red-500` contrast. This is not a fix
    for WCAG 1.4.3; measure the rendered foreground/background colors and
    change the token or presentation if they fail.
  - Decorative-separator part: `CourseCard.tsx` and
    `ApplicationStatusPage.tsx` still require a visual/content decision. If a
    separator is purely decorative, encode that semantics and document why
    contrast requirements do not apply; if it conveys information, provide a
    conforming visual representation. `aria-hidden` alone cannot remediate
    visual contrast.

### A11Y-BL-005

- **ID:** A11Y-BL-005
- **Route / component:** `/courses`, `/checkout/success`, `/checkout/failed`; route page metadata
- **State:** Fixture-backed loaded routes
- **WCAG criterion:** 2.4.2 Page Titled (A)
- **Tool/manual:** Pa11y (HTML_CodeSniffer)
- **Severity:** Moderate
- **Steps to reproduce:** Open the named fixture URLs and inspect the `<title>` element. On `/courses`, `document.title` is populated at runtime but Axe still reports that the document lacks a non-empty `<title>` element.
- **Expected behavior:** Each route has a non-empty, descriptive, state-specific `<title>` element.
- **Proposed fix:** Set route-specific document titles through the shared page metadata mechanism and ensure it creates or updates the actual `<title>` element.
- **Before evidence:** `e2e/accessibility-reports/before/pa11y/checkout-success.html` and `checkout-failed.html` (`H25.1.NoTitleEl`, 2 nodes); `e2e/accessibility-reports/before/courses.json`, `checkout-success.json`, and `checkout-failed.json` (`document-title`, 3 serious nodes).
- **After evidence:** No committed re-scan yet; see [After-evidence status](#after-evidence-status).
- **Status:** Fixed (code-verified) on all three routes; automated after scan
  and VoiceOver confirmation remain pending:
  - `/courses`: **Fixed.** `BrowseCoursesPage.tsx` renders `<SeoMetaTags title={pageTitle} .../>`, which sets a real `<title>` element.
  - `/checkout/success`: **Fixed.** `CheckoutSuccessPage.tsx` renders `<SeoMetaTags title="Payment Confirmation" .../>`.
  - `/checkout/failed`: **Fixed in code.** `CheckoutFailedPage.tsx` renders
    state-specific `SeoMetaTags`, its component test verifies the resulting
    title, and `purchase-flow-a11y.spec.ts` uses `toHaveTitle()` after the SPA
    transition. The explicit assertion is necessary because Axe detects an
    empty title but cannot determine that a non-empty title inherited from the
    previous SPA route is contextually wrong.

### A11Y-BL-006

- **ID:** A11Y-BL-006
- **Route / component:** Stable `/courses/:courseSlug`; course-detail curriculum/outcome list markup
- **State:** Fixture-backed course detail loaded
- **WCAG criterion:** 1.3.1 Info and Relationships (A)
- **Tool/manual:** Axe (`list`)
- **Severity:** Serious
- **Steps to reproduce:** Run the Axe baseline collector, open `e2e/accessibility-reports/before/course-detail.json`, and inspect the list container reported by Axe.
- **Expected behavior:** A semantic list contains only permitted list-item structure, with non-list content placed outside the list or inside an `li`.
- **Proposed fix:** Correct the shared course-detail list markup without replacing native list semantics with ARIA.
- **Before evidence:** `e2e/accessibility-reports/before/course-detail.json` (`list`, 1 serious node).
- **After evidence:** No committed re-scan yet; see [After-evidence status](#after-evidence-status). Verified fixed by source inspection: `apps/user/src/app/components/course-module/CurriculumAccordion.tsx` — the outer `<ul id="course-curriculum-list">` contains only `<li>` section elements, and each expanded lesson list is a nested `<ul>` whose direct children are exclusively `<li>`. `CourseDetailPage.tsx`'s "This course includes" list is likewise a clean `<ul><li>` structure. Covered by `e2e/tests/user/discover-flow-a11y.spec.ts` (Axe scan of the expanded-curriculum state).
- **Status:** Fixed (code-verified) — pending Pa11y/Axe re-scan and VoiceOver confirmation per `4-flow-a11y.md`.

## Coverage limits and manual follow-up

- ESLint's 105 errors are retained as source-level baseline findings but are
  not individually promoted into this route issue log until route/component
  ownership and runtime impact are confirmed. The unfiltered command covers
  teacher/admin-adjacent user-app code outside the four selected journeys.
- The completed Pa11y evidence covers only independently scannable public/auth
  URLs defined in Phase 0. It does not cover cart, checkout form, My Learning,
  course player, form-error states, modals, toasts, or other authenticated
  interactive states; those require Axe state tests and deterministic data.
- The automated keyboard smoke completed on all nine initial route states and
  reported no hidden/disabled focus target, repeated focus loop, or missing
  computed focus indicator. This does not exercise complete interactions,
  reverse tabbing, dialogs, form validation, route focus restoration, or every
  responsive state, so full keyboard operability is not claimed.
- No real assistive-technology session was performed. Safari + VoiceOver,
  200%/400% zoom, forced colors/high contrast, reduced motion, and voice control
  remain manual requirements. Automated output cannot substitute for them.
- Pa11y reporting zero issues on course detail and missing-token reset means
  only that this scan found none in those initial states; it is not proof of
  WCAG conformance.

## Remediation order

Original plan, kept for historical reference; see
[Remediation status](#remediation-status) for what has actually landed:

1. A11Y-BL-002 — keyboard-excluded, unnamed password control. **Done.**
2. A11Y-BL-001 and A11Y-BL-003 — missing form-control names/relationships. **Done.**
3. Add stateful Axe/keyboard coverage for focus, validation, dialogs, and
   announcements as each flow enters remediation. **Done** — see the four
   `*-flow-a11y.spec.ts` suites in
   [ACCESSIBILITY_TESTING.md](ACCESSIBILITY_TESTING.md#four-flow-a11y-suites).
4. A11Y-BL-005 and A11Y-BL-006 — page orientation and semantic structure.
   **Both are fixed in code; after evidence and manual confirmation remain.**
5. A11Y-BL-004 — contrast/decorative content. **Still open pending rendered
   contrast measurement and a documented decorative/content decision.**

## Outstanding work before any flow can be closed

Per `4-flow-a11y.md` §1 "Điều kiện đóng một flow", closing a flow requires
automated checks **and** a confirmed Safari + VoiceOver pass **and** committed
before/after evidence. As of this document's remediation-status date:

1. Measure and remediate the rendered required-marker/separator contrast, and
   document which separators are decorative versus meaningful (A11Y-BL-004).
2. Run and commit `e2e/accessibility-reports/after/` for both Pa11y and Axe +
   keyboard using the supported output-directory commands.
3. Run the Safari + VoiceOver checklists for all four flows and record
   Pass/Fail/Blocked results, per the manual-test matrix in
   [ACCESSIBILITY_TESTING.md](ACCESSIBILITY_TESTING.md#current-limitations).
4. Only after 1–3 are complete, update this document's per-issue status from
   "Fixed (code-verified)" to "Verified" and mark the corresponding flow
   closed in `4-flow-a11y.md`.
