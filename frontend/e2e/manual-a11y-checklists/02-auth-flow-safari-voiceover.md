# Safari + VoiceOver Checklist — Flow 2: Authentication

Scope: `Login / Signup / Forgot Password / Reset Password` (+ OAuth and protected-route redirect).
Required machine setup: see [README.md](README.md).

**Before starting**: `Safari → Advanced → Press Tab to highlight each item` is enabled, Full Keyboard Access is enabled, and the VoiceOver Caption Panel is enabled.

## Test information

| Field | Value |
| --- | --- |
| Test date | 2026-08-19 |
| macOS version | macOS Sequoia - Version 15.1 |
| Safari version | Version 18.1 |
| VoiceOver verbosity (default: Medium) | Medium |
| Flow conclusion (Pass / Fail) | Pass |

## Test data that must be ready

- 1 valid student account (password known, **do not** write the password into this file).
- 1 email that already exists in the system (to test the duplicate-account error on Signup).
- 1 non-expired reset token **and** 1 expired/invalid token.
- An account with 2FA enabled.
- A password manager or a clipboard with a password string ready, to test paste (SC 3.3.8).

---

## A. Shared AuthLayout

| # | WCAG SC | Action | Expected | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| A1 | 1.3.1 | Open Login, Rotor → Landmarks | Exactly one `main`; page heading is appropriate | Pass |  |
| A2 | 4.1.2, 1.1.1 | Browse the logo/link back to Home | Has a clear accessible name (not just "image") | Pass |  |
| A3 | 2.4.2 | Navigate Login → Signup → Forgot → Reset, `VO + F2` ×2 on each page | Each route has a **distinct page title**, correctly describing the page, no duplicates | Pass |  |
| A4 | 2.4.3 | After navigating to a route | Focus/VO cursor moves to the new page's heading, not "stuck" at the old position | Pass |  |
| A5 | 1.1.1 | Check the decorative background/illustration | Not read out by VoiceOver | Pass |  |
| A6 | 3.2.3 | Compare the 4 auth pages | Logo, heading, and secondary link positions are consistent across pages | Pass |  |

## B. LoginPage

| # | WCAG SC | Action | Expected | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| B1 | 3.3.2, 4.1.2 | Enter the Email/Username field with `VO + Command + J` | Label is read out, correctly associated with the input | Pass |  |
| B2 | 3.3.2 | Enter the Password field | Label reads correctly; find the "Show/Hide password" button | Pass |  |
| B3 | 4.1.2 | Activate "Show password" with `VO + Space` | Button name changes to "Hide password"; the entered value is **not lost**, tab order doesn't change | Pass |  |
| B4 | 3.3.1, 4.1.3 | Submit an empty Login form | Focus moves to the error summary (or the first error field) **and** the error content is read out; with multiple errors, they're read through **one single** `role="alert"` error summary, not `role="alert"` attached to each field | Pass |  |
| B5 | 4.1.3 | Fix 1 field, resubmit with other errors remaining | Fixed old errors are no longer read out; only the current errors are announced | Pass |  |
| B6 | 3.3.1, 4.1.3 | Enter the wrong password multiple times (server error) | Server error content reads clearly; **no** duplicate reading between the toast and the inline error | Pass | A11y passes (message reads clearly, no duplication). [SEC-AUTH-01] Outside a11y scope: the backend does not yet handle account lockout/brute-force — no matter how many wrong attempts, the response is the same, with no attempt limit (`AuthService.java:98-120`) |
| B7 | 4.1.3, 4.1.2 | Submit a valid form, observe during loading | Loading state has `aria-busy`/an announcement, the Submit button name doesn't change erratically; pressing Enter can't trigger a second submit (double-submit) | Pass |  |
| B8 | 3.3.2, 3.3.1 | If the account has 2FA | The code input has a label, a format hint, and validates/announces an error if wrong | Pass |  |
| B9 | 4.1.2 | Browse to the Forgot password / Sign up link | This is a real `link` (visible under Rotor → Links), not a fake button pretending to navigate | Pass |  |
| B10 | 2.1.1 | Complete login using only keyboard + VoiceOver, no mouse | Login succeeds, with a clear status announcement | Pass |  |
| B11 | 4.1.2, 2.4.4 | If there's an OAuth button ("Continue with Google") | Is a button/link with a clear accessible name stating the provider; the user understands they're about to leave EduMind for a third-party page | Pass |  |
| B12 | 2.4.3, 4.1.3 | Access a protected route while logged out (e.g. `/learning`) | Redirected to Login **and** VoiceOver conveys the reason (a message that login is required); after successful login, returns to the original intended destination | Pass |  |

## C. SignupPage

| # | WCAG SC | Action | Expected | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| C1 | 3.3.2 | Browse the required fields | Read out as "required" (not just a visible `*` mark) | Pass |  |
| C2 | 3.3.2 | Focus the Password field before typing | Password requirements already exist and are read as associated with the field (via `aria-describedby`) | Pass |  |
| C3 | 1.4.1, 4.1.3 | Type a password that doesn't meet requirements | Each requirement's status (enough characters, has a number...) isn't just a color change — VoiceOver reads the pass/fail state of each requirement | Pass |  |
| C4 | 3.3.1, 3.3.3 | Type 2 mismatched passwords, submit | Mismatch error is read clearly, focus moves to the correct place | N/A | Sign-up only has a single password field with no confirm-password field |
| C5 | 3.3.1, 4.1.3 | Submit a completely empty Signup form | Same as B4: focus moves to the error summary (or the first error field) **and** the error content is read out; with multiple errors, they're read through **one single** `role="alert"` error summary, not `role="alert"` attached to each field | Pass |  |
| C6 | 3.3.2, 2.1.1 | If there's a Terms checkbox | Full label read out (not just "I agree"); the Terms link inside it can still be reached and activated separately by keyboard | N/A | No Terms checkbox present |
| C7 | 3.3.1, 3.3.3 | Sign up with an email that already exists | Duplicate-account error content reads clearly | Pass |  |
| C8 | 4.1.3 | Successful signup | Success status is announced **before** the redirect (not lost due to too-fast navigation) | Pass |  |
| C9 | 2.4.3 | Tab through the entire form | Tab order is logical even in mobile layout (first/last name not reordered) | Pass |  |

## D. ForgotPasswordPage

| # | WCAG SC | Action | Expected | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| D1 | 3.3.1 | Submit an invalid email | Validation error reads clearly | Pass |  |
| D2 | 3.3.3 | Submit a non-existent email (generic backend response) | The message does **not reveal** whether the email exists, but still reads clear guidance | Pass |  |
| D3 | 4.1.3 | Successful submit | Has a `role="status"`/`polite` live region reading the "email sent" notification | Pass |  |
| D4 | 2.4.3 | After success, check focus | Focus moves to the confirmation heading/status | Pass |  |
| D5 | 4.1.2, 4.1.3 | If there's a Resend button | Disabled/loading/wait-time state is read clearly | Pass | |
| D6 | 4.1.2 | Link back to Login | Is a real `link`, activatable with Enter | Pass |  |

## E. ResetPasswordPage

| # | WCAG SC | Action | Expected | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| E1 | 1.3.1, 3.3.3 | Open a reset link missing a token | Clear heading such as "Invalid link"; there's an action to request a new link | Pass |  |
| E2 | 1.3.1, 3.3.3 | Open an expired/invalid reset link | Same as E1, not mistaken for a valid link | Pass | |
| E3 | 1.3.5, 4.1.2 | Open a valid link, enter the 2 new-password fields | Each field has `autocomplete="new-password"`; the 2 show/hide toggle buttons have independent names, not confused with each other | Pass |  |
| E4 | 1.4.1, 4.1.3 | Type a password that doesn't meet policy | Same as Signup — policy requirements are readable, not color-only | Pass |  |
| E5 | 4.1.3 | Successful submit | Has an announcement; has a clear Login link; **does not redirect too fast**, causing VoiceOver to miss the notification | Pass |  |

## F. WCAG 2.2 — new criteria (required for the 2.2 AA target)

| # | WCAG SC | Action | Expected | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| W1 | 3.3.8 Accessible Authentication (Min) | `Cmd + V` paste a password into the Password field on Login | Paste **succeeds** — not blocked by `onPaste`, no characters stripped | Pass |  |
| W2 | 3.3.8 | Paste into the 2 New password / Confirm password fields on Reset Password | Both fields accept paste (a blocked-paste Confirm field is a common failure) | Pass |  |
| W3 | 3.3.8 | Paste a 2FA/OTP code into the code field | The full string can be pasted; if the field is split into separate character boxes, pasting must still auto-fill all boxes | Pass |  |
| W4 | 3.3.8 | Check whether Safari/password manager offers autofill suggestions on Login | The browser/password manager recognizes and can fill it in — not blocked by `autocomplete="off"` on the password field | Pass |  |
| W5 | 3.3.8 | Check whether any authentication step requires memorization/puzzle-solving (text captcha, riddle, transcription) | No mandatory cognitive function test without an alternative | Pass | No feature requires memorization/puzzle-solving |
| W6 | 1.3.5 Identify Input Purpose | Inspect the `autocomplete` attribute of every field across the 4 pages | `email`/`username`, `current-password`, `new-password`, `given-name`, `family-name`, `one-time-code` are declared correctly. Note any missing field in Notes | Pass |  |
| W7 | 2.4.11 Focus Not Obscured (Min) | Tab through the long Signup form on a short viewport (shrink window height) | The focused field is not obscured by a sticky header or a fixed submit bar | Pass |  |
| W8 | 2.5.8 Target Size (Min) | Review the show/hide password toggle button, Terms checkbox, and secondary link | At least 24×24 CSS px or sufficient spacing | Pass | The password toggle was recorded at 24×24 CSS px; Axe `target-size` passed for the automated Auth states. |
| W9 | 3.2.6 Consistent Help | Compare the position of a support/contact link across the 4 auth pages | If present, always in the same relative position | N/A | Only 1 of 4 pages has a support link: `ForgotPasswordPage.tsx:200-209` — "Having trouble? Contact support@edumind.com" (mailto), located below the form card. Login/Signup/Reset Password have no equivalent link; `AuthLayout.tsx` (the shared layout) also renders no help link. SC 3.2.6 only requires consistency *when a help mechanism repeats* across multiple pages — since only 1 page has a link, there isn't enough basis to compare positions → N/A rather than Pass/Fail. |

## G. Overall experience & content

| # | WCAG SC | Item to verify | Result | Notes |
| --- | --- | --- | --- | --- |
| G1 | 2.1.1 | Complete the entire Login flow using only VoiceOver, without looking at the screen | Pass |  |
| G2 | 3.3.1 | Fix a form with multiple errors at once, confirm they're read out in sequence without overlapping | Pass |  |
| G3 | 4.1.3 | No toast/error is read twice at any step in the flow | Pass |  |
| G4 | 2.1.1 | Forgot → Reset with a test token completed entirely via VoiceOver | Pass |  |
| G5 | 3.3.3 | Error message content guides the user on how to fix it, not just states "Invalid" | Pass |  |

## H. Quick keyboard-only pass

| # | WCAG SC | Action | Expected | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| H1 | 2.4.3, 2.4.7 | Tab through Login/Signup/Forgot/Reset | Focus order is logical, focus indicator is always clearly visible | Pass |  |
| H2 | 2.1.1 | Press Enter to submit the form on every page | Submits exactly once | Pass |  |
| H3 | 2.1.2 | Tab repeatedly through each page, including while a dropdown/tooltip is open | No keyboard trap on any page | Pass |  |
| H4 | 2.4.3 | Tab through the form while an error is displayed | The error summary/message sits at a logical position in the tab order, not skipped over | Pass |  |

---

### Conclusion

- Total steps: 56
- Pass: 53
- Fail: 0
- N/A: 3
