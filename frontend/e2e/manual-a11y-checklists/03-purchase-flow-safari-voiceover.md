# Safari + VoiceOver Checklist — Flow 3: Purchase

Scope: `Cart → Checkout → (PayPal redirect | SePay QR) → Success / Failed`.
Required machine setup: see [README.md](README.md).

**Before starting**: `Safari → Advanced → Press Tab to highlight each item` is enabled, Full Keyboard Access is enabled, and the VoiceOver Caption Panel is enabled.

> Test data requirement: the payment sandbox must be able to deterministically force both the **success** and **failed** scenarios — do not skip due to missing data. Both the PayPal path (redirect) and the SePay path (QR + countdown) are needed, since the two paths carry different accessibility risks.

## Test information

| Field | Value |
| --- | --- |
| Test date | 2026-08-20 |
| macOS version | macOS Sequoia - Version 15.1 |
| Safari version | Version 18.1 |
| VoiceOver verbosity (default: Medium) | Medium |
| Flow conclusion (Pass / Fail) | Pass |

---

## A. Cart & Cart Drawer

| # | WCAG SC | Action | Expected | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| A0 | 2.4.2 | `VO + F2` ×2 on the Cart page | Page title correctly describes the Cart page | Pass |  |
| A1 | 1.3.1 | Open the Cart page, Rotor → Headings | Has a `Heading level 1`; item count reads naturally (e.g. "3 items in cart") | Pass |  |
| A2 | 1.3.1 | Browse the item list with `VO + Right Arrow` | Cart items read as a list (item 1 of N...); course name/price aren't read with redundant repetition | Pass |  |
| A3 | 4.1.2, 2.4.4 | Browse to the Remove button of 1 item | Button name contains the **specific course name** (e.g. "Remove Advanced React from cart"), not just "Remove" | Pass |  |
| A4 | 4.1.3, 2.4.3 | Activate Remove | The removed item + new total are announced; focus moves to the next item or the cart/empty-state heading | Pass |  |
| A5 | 1.3.1, 2.4.4 | Remove all items down to an empty cart | The empty state has a heading + a clearly readable "Browse Courses" link | Pass |  |
| A6 | 4.1.2, 2.4.3 | Open the cart drawer (from the header cart icon or after Add to Cart) | The drawer is a named dialog; focus moves inside the drawer immediately upon opening | Pass |  |
| A7 | 2.4.3 | Inside the drawer, press `Escape` | The drawer closes; focus returns to the exact button/icon that opened it | Pass |  |
| A8 | 2.1.2 | Inside the drawer, try `VO + Right Arrow` repeatedly | Focus doesn't escape to the background content | Pass |  |
| A9 | 1.3.1 | Browse the original price/discount/total in the cart | Has clear labels, reads understandably, no mixing of old/new figures | Pass |  |
| A10 | 4.1.2, 3.3.1 | If the Checkout CTA is disabled | The reason for being disabled is read clearly (not just silently disabled) | Pass |  |
| A11 | 4.1.2, 2.4.3 | If Remove has a confirmation dialog | Dialog has a name, focus moves inside, `Escape` cancels it, focus returns to the Remove button after cancelling | Pass |  |
| A12 | 4.1.3 | Simulate an error when removing an item/clearing the cart (block `DELETE /api/cart/items/{courseId}` or `DELETE /api/cart` in Network) | The error is announced via an alert/live region **without requiring focus to move there** (a dedicated Retry button isn't required — the original Remove/Clear button being immediately clickable again is sufficient); that button must return to a clickable state (not stuck loading/disabled) after the failure | Pass |  |

## B. CheckoutPage

| # | WCAG SC | Action | Expected | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| B0 | 2.4.2 | `VO + F2` ×2 on Checkout | Page title correctly describes the Checkout step | Pass |  |
| B1 | 1.3.1 | Open Checkout, Rotor → Headings | `Heading level 1` for the page; `Heading level 2` for Order Summary and Payment Method | Pass |  |
| B2 | 1.3.1 | Browse the Order Summary | Reads as a structured list/description, not one long unbroken block of text | Pass |  |
| B3 | 1.3.1, 4.1.2 | Browse the Total | Has a clear label, currency unit reads correctly (e.g. "Total: 499,000 Vietnamese dong" or equivalent) | Pass |  |
| B4 | 1.3.1, 2.1.1 | Enter the Payment Methods group with `VO + Command + J` | Group name is read out (fieldset/legend); Arrow Left/Right can switch between methods | Pass |  |
| B5 | 1.4.1, 4.1.2 | Select 1 payment method | The "selected" state is read out, not just shown via border/color | Pass |  |
| B6 | 3.3.2 | If there's a Terms/confirmation checkbox | Full label, no confusing abbreviations when read | N/A | No Terms/confirmation checkbox currently exists |
| B7 | 4.1.3, 4.1.2 | `[LOCAL]` Activate Place Order (on production this only runs if there's a free course) | Loading/processing state is announced; button name stays stable (doesn't change into an anonymous spinner); pressing Enter/Space again does **not** trigger a duplicate submit | Pass |  |
| B8 | 3.3.1, 2.4.3 | Submit with missing information (validation) | Focus moves to the appropriate error/summary | Pass |  |
| B9 | 4.1.3, 2.4.3 | `[LOCAL]` Simulate a backend failure during submit | Error is read via alert/error summary, focus moves correctly | Pass |  |
| B10 | 2.4.4, 3.2.2 | `[LOCAL]` Select PayPal → before redirecting to the external payment gateway | There's a clear notice "you're about to leave EduMind for PayPal" read by the screen reader before navigating | Pass |  |
| B11 | 3.3.3, 2.4.4 | Test the Direct Checkout route with a missing item/course | There's a clear recovery action (not a blank page/silent error) | Pass |  |
| B12 | 4.1.2 | Back button | Behaves as a proper link/button even when the browser history is empty | Pass |  |

## C. SePay QR Page (`/checkout/sepay-qr` — the QR payment path)

> This page sits between Checkout and Success/Failed. High risk because the QR is an image, has an expiry countdown, and has background polling that changes state.

| # | WCAG SC | Action | Expected | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| S1 | 1.3.1, 2.4.2 | Enter the QR page, Rotor → Headings + `VO + F2` ×2 | Has a `Heading level 1` ("Scan to Pay with SePay"); page title correctly describes the payment-pending step | Pass |  |
| S2 | 1.1.1 | Browse to the QR image with `VO + Right Arrow` | The QR image is currently `aria-hidden` — verify a screen reader user **can still complete payment** using text-form information (account number, transfer memo, amount) that can be read and copied. If the QR is the **only** way to pay → this is a functional fail, note it clearly | Pass |  |
| S3 | 4.1.2 | Browse to the amount and Order number | Both have a clear label when read; values read the correct currency unit | Pass |  |
| S4 | 4.1.2, 4.1.3 | Activate the Copy order number button with `VO + Space` | Button has an accessible name (not just a `title`); after copying there's a readable response ("Copied") rather than just an icon change | Pass |  |
| S5 | 4.1.3 | Rotor → Headings/Landmarks or Inspect Element on the "Waiting for payment confirmation..." line while in the `scanning` state | The element (or nearest ancestor) has `role="status"`/`aria-live="polite"` right at mount, serving as the base for all future polite updates. **Does not** require re-reading itself when fully transitioning to success/expired/error — since each state is a different JSX block (unmount/remount), the state-transition announcement is tested separately at S7/S9, not repeated here | Pass |  |
| S6 | 2.2.1 Timing Adjustable | `[LOCAL]` Observe the "Time remaining" counter when under 60s (the current warning threshold in code) | There's an **accessible** warning (announced via a live region, or text/label content change — not just a color change) that expiry is approaching, at least 20 seconds before it expires | Pass |  |
| S6b | 2.2.1 Timing Adjustable | `[LOCAL]` Check for an in-place extend/regenerate-QR mechanism (without leaving the page, without redoing checkout from scratch) before expiry | There's an in-place Extend/Regenerate button, **or**, if absent, it must be shown to fall under the **Essential Exception** of 2.2.1 (in-place extension would invalidate the activity — e.g. the QR/transfer memo is bound to one specific transaction, and allowing extension could create a double-scan/amount-mismatch risk) with the reasoning stated clearly | N/A | No in-place extend/regenerate button exists in `SepayQrPage.tsx` — only "Cancel Payment" while in `scanning` state, and "Try Again" (returns to `/checkout`, creates an entirely new order) once `expired`.<br>Accepted as an **Essential Exception**: the SePay QR is bound to one specific order/transfer memo — allowing in-place extension could lead to confusion between old/new transactions or be exploited. Restarting the whole checkout is a deliberate security choice, not a technical oversight.<br>Note: this exception does **not** exempt the requirement for an accessible warning at S6 — the two are independent. |
| S7 | 4.1.3 | `[LOCAL]` Let the countdown run to 0 | Transitioning to the `expired` state is **announced**; focus/VO cursor moves to the new heading; not silent | Pass |  |
| S8 | 4.1.3 | The seconds counter while waiting | The counter is **not** re-read every second (a live region that's too "chatty" is also a UX defect — note it clearly if VoiceOver reads continuously) | Pass |  |
| S9 | 4.1.3, 2.4.3 | `[LOCAL]` Force the webhook/polling to return success | **[CHANGED]** There's no longer a `success` state/"Payment Received!" heading on `SepayQrPage` — once `COMPLETED` is detected, `navigate()` is called immediately (0 delay, technique G110) to `CheckoutSuccessPage`, where the actual focus/announcement happens (tested at D2). The only remaining expectation here is: `navigate` is called with the correct URL, with no intermediate UI/focus to check on this page | Pass | See detailed note at **D5** (fixed in `SepayQrPage.tsx`: removed the `success` state + `setTimeout(2000ms)` entirely, `navigate` happens immediately; focus management for `expired` left unchanged). |
| S10 | 3.3.3, 2.4.4 | Enter the QR page with an invalid/expired session | There's a clear heading + an "start a new checkout" action reachable by keyboard | Pass |  |
| S11 | 2.1.1 | Complete the entire QR page using only the keyboard | Can copy the information, can go back, no mouse required | Pass |  |

## D. CheckoutSuccessPage

| # | WCAG SC | Action | Expected | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| D1 | 4.1.3 | `[LOCAL]` Enter the page right while it's capturing/loading | Has `role="status"` + readable loading text | Pass |  |
| D2 | 1.3.1, 4.1.3 | `[LOCAL]` Wait for the transition to success | Has a `Heading level 1` for success; VoiceOver **knows** the state changed from loading to success (not silent) | Pass |  |
| D3 | 1.3.1 | Browse the Order ID/number | Has a clear label when read | Pass |  |
| D4 | 4.1.2 | Browse the next actions (My Learning/Orders...) | All are links/buttons with correct semantics, clear names | Pass |  |
| D5 | 2.2.1 | Observe whether there's an auto-redirect | Doesn't navigate away before there's enough time to hear the full notification; if it does, it must be able to be turned off/postponed | N/A | No auto redirect exists |
| D6 | 4.1.3, 3.3.3 | `[LOCAL]` Simulate a capture error | Has a clear error heading/alert + recovery action | Pass |  |

## E. CheckoutFailedPage

> This entire section **can be run on production**: `/checkout/failed` renders from the query string, no real order needed. Navigate directly to the URL with each error code to test the 5 scenarios below.

| # | WCAG SC | Action | Expected | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| E1 | 1.3.1, 3.3.3 | Test the **User cancelled** scenario | `Heading level 1` appropriate to the cancel context; content clearly explains the cause | Pass |  |
| E2 | 1.3.1, 3.3.3 | Test the **Instrument declined** scenario | Heading + content differ from cancel, accurately reflecting the reason | Pass |  |
| E3 | 4.1.2 | Test the **Retry limit exceeded** scenario | The Retry button **does not appear** or is disabled with a clear reason | Pass | No Retry button, only a Start New Order button |
| E4 | 1.4.1 | Test the **Enrollment failed but already refunded** scenario | Refund status + timeline read clearly, not relying on color alone | Pass |  |
| E5 | 4.1.3 | Test the **Manual refund required** scenario | The pending state has clearly readable status text | Pass |  |
| E6 | 2.1.1, 4.1.2 | For each scenario above | Retry/Back/Support buttons work correctly via keyboard, button names accurately reflect the action | Pass |  |
| E7 | 3.3.3 | Entering the page via a deep-link with an error query string | Does not display a raw technical message/unbounded length | Pass |  |
| E8 | 2.4.3 | Focus when transitioning from Checkout to the Failed page | Focus moves to the Failed page's heading | Pass |  |

## F. WCAG 2.2 — new criteria (required for the 2.2 AA target)

| # | WCAG SC | Action | Expected | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| W1 | 3.3.7 Redundant Entry | Go Cart → Checkout → go back to edit → Checkout again | Previously entered information (selected payment method, billing info if any) is **not required to be re-entered** or the previous value can be reselected | Pass | Payment method is not reselected when navigating back |
| W2 | 3.3.7 | Payment fails → press Retry | Not required to re-enter all previously provided information from scratch | Pass | Payment method is not reselected |
| W3 | 2.2.1 Timing Adjustable | SePay QR countdown + order expiry | See details in sections **S6/S6b/S7**. Overall conclusion here: a time limit exists → must be turn-off-able/adjustable/extendable, or shown to fall under an exception. Reasoning stated clearly | Pass |  |
| W4 | 2.4.11 Focus Not Obscured (Min) | Tab through Checkout while the page is scrolled, and while the cart drawer is open | Focused element is not fully obscured by a sticky header/drawer/fixed summary bar | Pass |  |
| W5 | 2.5.8 Target Size (Min) | Review the item Remove button, drawer close button, SePay copy-order-number button, payment method radio, and Back button | ≥ 24×24 CSS px or sufficient spacing | Pass | Axe `target-size` passed for the recorded automated states; the manual pass covers the reviewed Purchase controls. |
| W6 | 2.5.7 Dragging Movements | Check whether there's any dragging interaction in the flow (drag to remove an item, quantity slider, swipe-to-delete on mobile) | Every dragging interaction has an equivalent single-pointer/keyboard alternative | N/A | No drag/drop interactions exist |
| W7 | 3.2.6 Consistent Help | Compare the Support/Contact link position across Cart, Checkout, SePay QR, Success, Failed | If present, always in the same relative position. The Failed page usually has "Contact support" — check whether other pages are consistent | Pass | The Support link sits below the footer on every page |

## G. Business experience & content

| # | WCAG SC | Item to verify | Result | Notes |
| --- | --- | --- | --- |
| G1 | 2.1.1 | Add/remove course completed entirely using only VoiceOver | Pass |  |
| G2 | 1.3.1 | Order summary reads correctly, understandably, without causing confusion about amounts | Pass |  |
| G3 | 2.1.1 | Payment method can be selected entirely via keyboard + VoiceOver | Pass |  |
| G4 | 2.1.1 | Both the Success **and** Failed flows completed via VoiceOver in the same test session | Pass |  |
| G5 | 4.1.3 | Each loading/success/error state is announced **exactly once** | Pass |  |
| G6 | 3.3.3 | Guidance content for handling refund/payment matches actual business reality (not just technically correct) | Pass |  |

## H. Quick keyboard-only pass

| # | WCAG SC | Action | Expected | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| H1 | 2.4.3 | Tab through the entire Cart → Checkout → SePay QR → Success/Failed | Focus order is logical | Pass |  |
| H2 | 2.1.1 | Arrow Left/Right to switch payment method | Works correctly, no need to Tab through each option | Pass |  |
| H3 | 2.4.3 | Escape closes the cart drawer | Focus returns to the correct trigger | Pass |  |
| H4 | 2.1.2 | Tab repeatedly through non-dialog steps (Cart page, Checkout page, SePay page) | No keyboard trap in any non-modal area; if Tab enters an area with its own trap behavior (e.g. drawer/dialog) there must be a keyboard way out (already checked at A6–A8) | Pass |  |
| H5 | 2.4.7 | Observe the focus indicator on every page in the flow | Always clearly visible, even on card/gradient backgrounds | Pass |  |

---

### Conclusion

- Total steps: 70
- Pass: 66
- Fail: 0
- N/A: 4
- Open issues: None
