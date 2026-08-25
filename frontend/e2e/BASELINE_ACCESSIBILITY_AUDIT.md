# Accessibility baseline audit and remediation status

**Scope:** baseline and remediation evidence for four critical flows:
Discover, Authentication, Purchase, and Learning.

**Standard:** WCAG 2.2 Level AA target

**Baseline date:** 2026-07-31

**Remediation status as of:** 2026-08-24 (see [Remediation status](#remediation-status)).
This section supersedes the per-issue "Open" status recorded at baseline time.
The baseline numbers below (lint/Pa11y/Axe counts, issue log) are a frozen
point-in-time snapshot and are **not** re-run in place — re-running any of the
baseline commands today will not reproduce these exact numbers, because the
underlying components have since changed. See
[After-evidence status](#after-evidence-status) for the committed re-scan and
manual verification evidence.

**Overall status:** Four-flow implementation (shared components, page fixes,
automated regression tests) was merged in commit `6bc954f`
([PR #139](https://github.com/HuuLocFIT/EduMind/pull/139)).
The four flows now have committed automated after-evidence and dated Safari +
VoiceOver checklists. All applicable manual checks passed. This closes the
recorded four-flow remediation milestone, but does not establish full-site
WCAG 2.2 AA conformance; the documented coverage limits still apply.

## Commands and evidence

| Check | Command | Result / evidence |
|---|---|---|
| JSX accessibility lint | `npm run lint:a11y` | Failed baseline: 628 findings (105 errors, 523 warnings). This command scans the full user app/UI library, so many findings are outside the four-flow route baseline. Representative in-scope blockers include missing label associations, non-keyboard click targets, missing video captions, invalid ARIA roles/properties, and an unfocusable tablist. |
| Pa11y URL scan | `npm run pa11y` | Existing completed baseline: 30 errors across 9 routes; no route scan errors. Committed baseline JSON and per-route HTML are in `e2e/accessibility-reports/before/pa11y/`. Generated reports from later local/CI runs remain in the ignored `e2e/pa11y/reports/` directory. |
| Axe + keyboard baseline | `A11Y_BASE_URL=http://localhost:3000 npx playwright test --config=e2e/playwright.baseline-a11y.config.ts` | Committed collector evidence generated 2026-08-08: 9/9 routes scanned without `scanError`; 2 Axe violations (2 serious nodes) and 11 keyboard-smoke issues. Raw per-route JSON and `summary.json` are in `e2e/accessibility-reports/before/`. |
| Pa11y after scan | `PA11Y_REPORT_DIR=e2e/accessibility-reports/after/pa11y npm run pa11y` | Completed 2026-08-24: 0 issues across 14 deterministic routes; committed JSON and per-route HTML are in `e2e/accessibility-reports/after/pa11y/`. |
| Axe + keyboard after scan | `npm run test:a11y:after` | Completed 2026-08-24 against the same 9 baseline routes: 0 Axe violations, 0 critical/serious nodes, 0 keyboard-smoke issues, and no scan errors. |
| Safari + VoiceOver | Manual checklists under `e2e/manual-a11y-checklists/` | Completed 2026-08-22 on Safari 18.1 + VoiceOver, macOS Sequoia 15.1: 268 Pass, 0 Fail, 19 N/A across five test areas. |

Pa11y route totals: `/` 4, `/courses` 4, stable course detail 0,
`/login` 5, `/signup` 14, `/forgot-password` 1, missing-token reset 0,
checkout success 1, and checkout failed 1.

Axe route totals in the committed collector summary: courses 1 serious and
checkout failed 1 serious; the other seven routes report zero Axe violations.
Keyboard-smoke totals are 11 issues across the nine routes.

## Remediation status

Summary table; see the [Issue log](#issue-log) for full detail per issue.
Statuses combine source verification with the committed automated after-scan
and dated manual checklists. A closed baseline issue is scoped to the recorded
routes and states; it is not a full-site conformance claim.

| ID | Summary | Status |
|---|---|---|
| A11Y-BL-001 | Auth input label association | Closed — automated and manual evidence recorded |
| A11Y-BL-002 | Password-visibility toggle keyboard/name | Closed — automated and manual evidence recorded |
| A11Y-BL-003 | Price filter input labels on `/courses` | Closed — automated and manual evidence recorded |
| A11Y-BL-004 | Contrast: required marker / decorative separators | Closed for recorded scope — Pa11y re-scan and manual colour/contrast checks passed |
| A11Y-BL-005 | Missing/empty `<title>` on `/courses`, checkout success/failed | Closed — automated and manual evidence recorded |
| A11Y-BL-006 | Invalid list markup in course-detail curriculum | Closed — automated and manual evidence recorded |

Beyond the six original issues, the four-flow implementation added shared
accessibility infrastructure that the baseline audit did not have and could
not have checked, because it did not exist yet:

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

The committed milestone evidence is complete:

1. `e2e/accessibility-reports/after/pa11y/` records a 2026-08-24 re-scan with
   zero issues across 14 deterministic routes.
2. `e2e/accessibility-reports/after/` records a 2026-08-24 Axe + keyboard
   re-scan of the nine baseline routes with zero violations, zero keyboard
   issues, and no scan errors.
3. `e2e/manual-a11y-checklists/00-summary.md` records the 2026-08-22 Safari +
   VoiceOver and cross-cutting review: 268 Pass, 0 Fail, and 19 N/A.

The 14-route Pa11y after-scan intentionally includes authenticated states that
were absent from the nine-route baseline. Comparisons therefore report both
issue counts and route scope instead of implying identical coverage.

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
- **After evidence:** The 2026-08-24 Pa11y and Axe re-scans report zero issues on the auth routes. Source inspection confirms matching label/input IDs and error/helper `aria-describedby` wiring. The auth flow checklist passed its applicable Safari + VoiceOver checks.
- **Status:** Closed for the recorded scope.

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
- **Before evidence:** `e2e/accessibility-reports/before/pa11y/login.html` and `signup.html` (`H91.Button.Name`, 2 nodes). The committed keyboard collector also records 2 Login issues and 1 Signup issue; those aggregate counts are not attributed solely to this control.
- **After evidence:** The 2026-08-24 Pa11y and Axe re-scans report zero issues on Login and Signup. `PasswordInput.tsx` keeps the toggle in normal tab order and exposes its changing name and `aria-pressed` state; the auth flow checklist passed its applicable keyboard and VoiceOver checks.
- **Status:** Closed for the recorded scope.

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
- **After evidence:** The 2026-08-24 Pa11y and Axe re-scans report zero issues on `/courses`. Source and regression tests cover the fieldset/legend, visible min/max labels, and slider value semantics; the Discover checklist passed its applicable Safari + VoiceOver checks.
- **Status:** Closed for the recorded scope.

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
- **After evidence:** The 2026-08-24 Pa11y re-scan reports zero issues across all 14 routes. The cross-cutting manual checklist records passing contrast and colour-independence checks on the selected states.
- **Status:** Closed for the recorded scope. Automated contrast checks and the dated visual review do not extend this result to untested themes, forced-colors mode, or the Angular admin portal.

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
- **Before evidence:** `e2e/accessibility-reports/before/pa11y/checkout-success.html` and `checkout-failed.html` (`H25.1.NoTitleEl`, 2 nodes); the committed Axe collector records `document-title` on `/courses` and checkout failed (2 serious nodes total).
- **After evidence:** The 2026-08-24 Pa11y and Axe re-scans report zero title issues on all three routes; the relevant automated journey assertions and manual checklists also passed.
- **Status:** Closed for the recorded scope:
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
- **Before evidence:** The original Phase 0 issue log recorded the invalid list structure. The collector was refreshed on 2026-08-08 after that markup had changed, so the currently committed `before/course-detail.json` no longer reproduces this individual finding; it is retained here as historical remediation context rather than countable before/after evidence.
- **After evidence:** The 2026-08-24 Pa11y and Axe re-scans report zero issues on course detail. Source inspection and the Discover flow regression test confirm valid nested list structure; the manual Discover checklist passed its applicable checks.
- **Status:** Closed for the recorded scope.

## Coverage limits and manual follow-up

- ESLint's 105 errors are retained as source-level baseline findings but are
  not individually promoted into this route issue log until route/component
  ownership and runtime impact are confirmed. The unfiltered command covers
  teacher/admin-adjacent user-app code outside the four selected journeys.
- The Pa11y baseline covers nine initial route states; the after-scan expands
  to 14 routes with deterministic authenticated cart, checkout, My Learning,
  and Course Player states. Form errors, modals, toasts, and interaction
  transitions are covered by stateful Playwright journeys rather than the URL
  collector alone.
- The baseline keyboard smoke completed on all nine initial route states and
  reported 11 issues; the after collector reports zero. This does not exercise complete interactions,
  reverse tabbing, dialogs, form validation, route focus restoration, or every
  responsive state, so full keyboard operability is not claimed.
- Safari + VoiceOver, keyboard-only, 200% zoom, 320px reflow, reduced motion,
  contrast, and colour-independence checks were recorded on 2026-08-22.
  Windows High Contrast/forced-colors, mobile screen readers, voice control,
  the Angular admin portal, and usability testing with disabled participants
  remain outside the recorded scope.
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
   **Done; automated and manual evidence recorded.**
5. A11Y-BL-004 — contrast/decorative content. **Done for the recorded scope;
   Pa11y and manual visual evidence recorded.**

## Milestone closure and future coverage

The four-flow milestone meets its documented closing criteria: automated
checks, committed before/after evidence, and Safari + VoiceOver confirmation
are recorded. Future accessibility work should extend coverage rather than
reopen this historical baseline without new evidence. Priority extensions are
Windows High Contrast/forced-colors, mobile screen readers, the Angular admin
portal, and usability testing with disabled participants.
