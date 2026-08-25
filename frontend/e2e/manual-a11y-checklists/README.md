# Manual Safari + VoiceOver Accessibility Checklists

A set of manual checklists for the project owner to self-test the 4 critical journeys using **Safari + VoiceOver on macOS**. Axe/Pa11y/Playwright results **do not replace** these checklists — the results below reflect the final, manually verified state.

## Why Safari, not Chrome

VoiceOver is macOS's native screen reader and is recommended by Apple/WebAIM to be tested with **Safari**, because:

- Safari has a direct integration layer with macOS's AX API (the accessibility tree is read most accurately by VoiceOver from Safari).
- Chrome + VoiceOver still works but has several known behavioral differences (missed live region announcements, incorrect roles read for some custom controls, misplaced focus order in dialogs/modals) — it does not accurately reflect the real VoiceOver user experience.
- The project README commits to "Safari + VoiceOver journeys" — so results must come from exactly that combination.

## File list

| # | File | Content | Number of steps |
| --- | --- | --- | --- |
| 0 | [00-summary.md](00-summary.md) | **Summary of results, issue log, and wording for the project README** — filled in after running the 5 files below | — |
| 1 | [01-discover-flow-safari-voiceover.md](01-discover-flow-safari-voiceover.md) | Discover: Home → Browse Courses → Course Detail | 53 |
| 2 | [02-auth-flow-safari-voiceover.md](02-auth-flow-safari-voiceover.md) | Authentication: Login / Signup / Forgot / Reset | 56 |
| 3 | [03-purchase-flow-safari-voiceover.md](03-purchase-flow-safari-voiceover.md) | Purchase: Cart → Checkout → SePay QR → Success / Failed | 70 |
| 4 | [04-learning-flow-safari-voiceover.md](04-learning-flow-safari-voiceover.md) | Learning: My Learning → Course Player (video, quiz, AI Tutor) | 81 |
| 5 | [05-cross-cutting-zoom-reflow-motion.md](05-cross-cutting-zoom-reflow-motion.md) | Cross-cutting across the 4 flows: 200% zoom, 320px reflow, text spacing, contrast, reduced motion, page title, Chrome keyboard pass | 27 |

---

## Required: machine setup before testing

Skipping the steps below will produce **incorrect results** (in particular, the Keyboard-only section will show false failures across the board).
This only needs to be done once per machine, but must be re-confirmed before each test session.

### 1. Enable Tab to link in Safari — most important

Safari **by default does not let `Tab` stop on links**, only on form controls.

`Safari → Settings (Cmd + ,) → Advanced → tick "Press Tab to highlight each item on a webpage"`

Quick check: open Home, press `Tab` once — if **Skip to main content** does not receive focus, this option is not yet enabled.

> Tip: if you forget to enable it, you can temporarily use `Option + Tab` to browse fully. However, the Keyboard-only section must be tested with plain `Tab`, so make sure to enable the option above.

### 2. Enable macOS Full Keyboard Access

`System Settings → Keyboard → Keyboard navigation` (enable).

This directly affects the focus behavior of radio groups (payment method), checkboxes, tab lists, and controls inside dialogs.

### 3. Reset VoiceOver to default before the first test session

Verbosity/speech settings affect whether VoiceOver reads out or skips certain information → results will not be
reproducible between two test runs if each run uses a different configuration.

`VO + F8 → General → Reset VoiceOver...` (or confirm Verbosity is at the default **Medium** level and note it in the Notes column if it was changed).

### 4. Record the version

`Apple menu → About This Mac` (macOS) and `Safari → About Safari`. Must be filled into the metadata table of each file —
the project README may only record the date/version once this information has been filled in. VoiceOver has no version number of its own; it follows macOS.

## How to turn VoiceOver on/off

| Machine type | How to toggle |
| --- | --- |
| Mac with a physical F1–F12 row | `Cmd + F5` |
| MacBook with Touch Bar (no physical F5 key) | `Cmd + Fn + F5` |
| MacBook with Touch ID | Hold `Cmd` then press the **Touch ID** key 3 times in a row |
| Any machine (most reliable) | `System Settings → Accessibility → VoiceOver → toggle on`, or open Siri and say "Turn VoiceOver on" |

Notes:

- The **first** time it's enabled on a machine, macOS shows the VoiceOver Quick Start dialog — press **Use VoiceOver** or `Enter` to continue, `Cmd + F5` to cancel if enabled by mistake.
- If the key combination doesn't respond, the Accessibility shortcut may be disabled: check `System Settings → Keyboard → Keyboard Shortcuts → Accessibility`.
- **Turning VoiceOver off**: `Cmd + F5` always works even if you enabled it via System Settings; if the shortcut is disabled, turn it off via the toggle in `System Settings → Accessibility → VoiceOver`.
- To check whether VoiceOver is running: look at the VoiceOver status menu in the top-right corner, or listen for the "VoiceOver on" greeting.

## Keys used in the checklist

Assumes the default modifier `VO = Control + Option`.

| Key | Function |
| --- | --- |
| `VO + Right/Left Arrow` | Move to the next/previous item in the VO cursor |
| `VO + Space` | Activate the currently selected item (like a click) |
| `VO + U` | Open the Rotor (Headings, Links, Landmarks, Form Controls...) |
| `VO + Command + H` | Move to the next heading |
| `VO + Command + L` | Move to the next link |
| `VO + Command + J` | Move to the next form control |
| `VO + Shift + Down/Up Arrow` | Enter/exit a group (dialog, fieldset, web area) |
| `Tab` / `Shift + Tab` | Standard browser focus (not the VO cursor) — used for the keyboard-only section |
| `VO + A` | Read continuously from the current position (Read All) |
| `VO + F2` (press twice) | Re-read the current tab's **page title** (used for SC 2.4.2) |
| `Escape` | Close the currently open modal/drawer |
| `Control` | Interrupt VoiceOver while it's speaking (when you need to stop mid-way) |

## Test data to prepare in advance

Do not record real passwords, tokens, or secrets in these files.

- 1 valid student account (with both a not-enrolled and an enrolled state).
- 1 course with a curriculum containing multiple sections, a video with test captions, a quiz, and a locked lesson.
- A cart with at least 1 item to test the Purchase flow.
- A valid, non-expired password reset token **and** an expired/invalid token.
- A payment sandbox that can force both success and failed scenarios (PayPal and SePay QR).
- 1 course with AI data (embeddings/summary) so the AI Tutor can respond.

---

### Safe simulation techniques

The methods below only affect **your browser**, do not create data, and do not touch the server.

| Needs to simulate | How to do it in Safari |
| --- | --- |
| API returns an error (500/404) for an endpoint | Web Inspector → **Sources → Local Overrides** → add an override for the URL, set the status code and body |
| Complete network loss / request failure | Turn off Wi-Fi, or use the Network Link Conditioner **100% Loss** profile |
| Extended loading state, enough time to listen | Network Link Conditioner **Edge / Very Bad Network** profile |
| Empty state | Use a search keyword guaranteed to return no results, or a filter with no matches |
| 404 / invalid token / error deep-link | Type an invalid URL directly: a course slug that doesn't exist, `/reset-password` missing a token, `/checkout/failed?error=...` |
| Save-progress error while learning | Local Override or turn off the network right as autosave fires |

Installing Network Link Conditioner: `Xcode → Additional Tools for Xcode` (Apple Developer), or skip it and turn off Wi-Fi instead.

## How to record results

Each table has the following columns:

| Column | Meaning |
| --- | --- |
| **WCAG SC** | The Success Criterion this step verifies. Used to map test step ↔ criterion when writing the remediation log and when answering interview questions |
| **Result** | The final, manually verified state. If an issue is found while testing, fix it and re-verify before updating the final result |
| **Notes / Issue ID** | Left blank by default when `Pass`; used to record a special condition or describe an unresolved issue |

Valid values for `Result`: `Pass`, `Fail`, `N/A`.

- `Pass` — behavior matches the Expected column.
- `Fail` — deviates from the Expected column. Must be described using the template.
- `N/A` — the corresponding behavior or feature does not exist in the current product. The reason must be stated clearly.

### Notes for a `Pass` step — what to write, when to leave it blank

**Default to leaving it blank.** `Pass` already means it matches the Expected column.

Only write a note when one of these two things applies, and it isn't already captured in the Expected column:

| Case | Example note |
| --- | --- |
| **The actual string VoiceOver read out** — useful as a comparison baseline for future refactors | `VO read "Remove Advanced React Patterns from cart, button"` |
| **The condition that makes this result true** — if the condition changes, the result may differ | `Pass for a course with a VTT caption; for a course without captions see step C3` |

**Do not** re-record environment information (Safari/macOS version, tab preference enabled, etc.) on individual rows —
that information already belongs in the metadata table at the top of the file and in `00-summary.md` section 1.

### Template for describing a `Fail` step

If the issue has not been resolved, write a brief note in the Notes column (use `<br>` for line breaks inside a Markdown table):

```text
[A11Y-<flow><number>] VO read: "<string copied from the Caption Panel>"
Focus is on: <element currently receiving focus>
Expected: <correct behavior>
```

### Example of a filled-in table

| # | WCAG SC | Action | Expected | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| X1 | 2.4.1 | Tab from the top of the page | The first item to receive focus is **Skip to main content** | Pass | |
| X2 | 4.1.3 | Remove 1 item from the cart | Announces the removed item + the new total | Pass | VO read "Removed Advanced React from cart. New total 499,000 dong" |
| X3 | 3.3.1 | Enter an incorrect 2FA code | Error is read out clearly | N/A | The test account does not have 2FA enabled, so this step does not apply |

## What this checklist set does not cover

Stated clearly to avoid misunderstanding the test scope:

- **Real `forced-colors` mode** (Windows High Contrast) — macOS/Safari does not support this media query; checklist 05 step D6 substitutes macOS's `Increase contrast` + `Differentiate without color`, and the remainder is recorded as a known limitation.
- **Angular admin portal** — outside the current milestone's scope.
- **Other screen readers** (NVDA/JAWS on Windows, TalkBack on Android, VoiceOver on iOS) — only macOS VoiceOver was tested.
- **Real users with disabilities** — this is an expert review, not usability testing with actual screen reader users. It must not be described as "validated by users".
