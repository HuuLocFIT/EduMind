# Phase 0 accessibility baseline audit

**Scope:** task 2.4 in `4-flow-a11y.md`

**Standard:** WCAG 2.2 Level AA target

**Baseline date:** 2026-07-31

**Status:** DOES NOT CONFORM (automated baseline); real Safari + VoiceOver
testing remains required.

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

## Issue log

Issues are grouped by shared root cause. `After evidence` is deliberately
unfilled because task 2.4 is a before-remediation audit.

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
- **After evidence:** Pending remediation and re-scan.
- **Status:** Open — priority 2 (missing accessible name).

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
- **After evidence:** Pending remediation and re-scan.
- **Status:** Open — priority 1 (keyboard/screen-reader operation).

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
- **After evidence:** Pending remediation and re-scan.
- **Status:** Open — priority 2 (missing accessible name).

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
- **After evidence:** Pending remediation and re-scan.
- **Status:** Open — priority 6 (contrast).

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
- **After evidence:** Pending remediation and re-scan.
- **Status:** Open — priority 5 (page structure/orientation).

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
- **After evidence:** Pending remediation and re-scan.
- **Status:** Open — priority 5 (structure/relationships).

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

1. A11Y-BL-002 — keyboard-excluded, unnamed password control.
2. A11Y-BL-001 and A11Y-BL-003 — missing form-control names/relationships.
3. Add stateful Axe/keyboard coverage for focus, validation, dialogs, and
   announcements as each flow enters remediation.
4. A11Y-BL-005 and A11Y-BL-006 — page orientation and semantic structure.
5. A11Y-BL-004 — contrast/decorative content.
