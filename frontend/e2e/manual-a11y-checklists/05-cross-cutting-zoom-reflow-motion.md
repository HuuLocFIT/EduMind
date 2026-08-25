# Checklist 5 — Cross-cutting: zoom, reflow, contrast, motion, page title

Unlike the other 4 files, most of this checklist **does not require VoiceOver** — it mainly relies on visual inspection, DevTools, and system configuration.

## Test information

| Field | Value |
| --- | --- |
| Test date | 2026-08-21 |
| macOS version | macOS Sequoia - Version 15.1 |
| Safari version | Version 18.1 |
| VoiceOver verbosity (default: Medium) | Medium |
| Flow conclusion (Pass / Fail) | Pass |

## Routes tested in this file

Every step below must run across **all** of the following routes; record the result for the worst-performing route and name that route in Notes:

`/` · `/courses` · `/courses/:slug` · `/login` · `/signup` · `/forgot-password` · `/reset-password` · `/cart` · `/checkout` · `/checkout/sepay-qr` · `/checkout/success` · `/checkout/failed` · `/learning` · Course Player (video lesson) · Course Player (quiz lesson)

---

## A. Zoom & Resize text (SC 1.4.4)

Zoom in Safari with `Cmd + "+"`. Reset to 100% with `Cmd + 0`. Record the zoom level in Notes.

| # | WCAG SC | Action | Expected | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| A1 | 1.4.4 | Zoom to 200% across every route in the list above | All content and functionality remain usable; no lost text, no clipped text, no overlapping text | Pass |  |
| A2 | 1.4.4 | Zoom to 200% on `/checkout` and Course Player | The Place Order / Mark complete buttons / video controls remain clickable, not pushed off-screen | Pass |  |
| A3 | 1.4.4 | Zoom to 200% while the cart drawer, mobile filter drawer, AI Tutor panel, or error modal is open | Dialog doesn't overflow the viewport; the close button remains scrollable-to | Pass |  |
| A4 | 1.4.4 | Zoom to 200% on the Signup form with multiple errors shown at once | Error messages don't overlap the field, still fully readable | Pass |  |
| A5 | 1.4.4 | Zoom to 200%, check the sticky header | The header doesn't take up so much height that it obscures all content; the bottom of the page remains scrollable-to | Pass |  |

## B. Reflow (SC 1.4.10)

Use Responsive Design Mode (`Develop → Enter Responsive Design Mode`, enable the Develop menu via `Safari → Settings → Advanced → Show features for web developers`), set the size to **320 × 256 CSS px** — equivalent to 400% zoom at 1280×1024.

| # | WCAG SC | Action | Expected | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| B1 | 1.4.10 | Set 320×256, browse every route in the list | **No horizontal scroll** on any route (except valid exceptions: large data tables, code blocks — must scroll horizontally within that block itself, not the whole page) | Pass |  |
| B2 | 1.4.10 | 320px on `/courses` | Filter, search, course list, pagination all remain usable | Pass |  |
| B3 | 1.4.10 | 320px on `/checkout` and `/checkout/sepay-qr` | Order summary, payment method, QR code, countdown all display fully, not clipped | Pass |  |
| B4 | 1.4.10 | 320px inside Course Player | Video player, curriculum drawer, quiz, Mark complete button all operable | Pass |  |
| B5 | 1.4.10 | 320px with dialogs/drawers open | Dialog content doesn't overflow; the close button is always reachable | Pass |  |
| B6 | 1.3.4 | Rotate between portrait and landscape at a small viewport | Screen orientation isn't locked; content remains usable in both orientations | Pass |  |
| B7 | 1.4.10 | At 320px, check the AI Tutor pill button and other `position: fixed` elements | Doesn't obscure important content/buttons to the point of being unusable | Pass |  |

## C. Text spacing (SC 1.4.12)

Apply the following CSS via DevTools (`Develop → Show Web Inspector → Elements`, then add the style below to every element using the `*` selector) or a text-spacing bookmarklet:

```css
* { line-height: 1.5 !important; letter-spacing: 0.12em !important;
    word-spacing: 0.16em !important; }
p { margin-bottom: 2em !important; }
```

| # | WCAG SC | Action | Expected | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| C1 | 1.4.12 | Apply the CSS above on Home, Course Detail, Checkout, Course Player | No lost content, no clipped text, no overlapping text; buttons still show their full label | Pass |  |
| C2 | 1.4.12 | Specifically check buttons and badges with short text inside a fixed-size box | Text doesn't overflow outside the box or get clipped by `overflow: hidden` | Pass |  |

## D. Contrast & color (SC 1.4.1, 1.4.3, 1.4.11)

Axe/Pa11y already cover contrast of text on flat backgrounds. The items below are places **automated tools cannot check**.

| # | WCAG SC | Action | Expected | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| D1 | 1.4.3 | Check text sitting **on top of an image/gradient** (hero, course card overlay, video poster) | Contrast ≥ 4.5:1 against the worst-case background (the brightest part of the image) | Pass |  |
| D2 | 1.4.3 | Enable `System Settings → Accessibility → Display → Increase contrast`, re-browse the 4 flows | Interface remains usable, borders/boundaries between blocks aren't lost | Pass |  |
| D3 | 1.4.1 | Enable `System Settings → Accessibility → Display → Differentiate without color` | Every state conveyed only by color (completed/locked, selected filter, selected payment method, refund status, quiz correct/incorrect) remains distinguishable via text/icon/shape | Pass |  |
| D4 | 1.4.11 | Check the focus indicator and input borders on every background | Indicator contrast ≥ 3:1 against the adjacent background, including on dark cards/gradients | Pass |  |
| D5 | 1.4.5 | Look for images containing text (promotional banner, badge, chart) | No images of text used where CSS could achieve the same; if unavoidable, has a fully descriptive alt | Pass |  |
| D6 | 1.4.1 | Test real `forced-colors` mode (Windows High Contrast + Edge/Chrome) | UI doesn't disappear, icons remain visible, focus indicator still shows. **macOS/Safari doesn't support `forced-colors`** — if no Windows machine is available, mark `N/A` + reason, treat as a known limitation, don't claim it was tested | N/A | No Windows device available for testing; needs re-testing if a device becomes available |

## E. Motion (SC 2.3.3, 2.2.2)

Enable `System Settings → Accessibility → Display → Reduce motion` before testing this section.

| # | WCAG SC | Action | Expected | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| E1 | 2.3.3 | Enable Reduce motion, re-browse Home, Browse, Course Player | Transition/parallax/slide animations are reduced or disabled; the app respects `prefers-reduced-motion` | Pass |  |
| E2 | 2.3.3 | Reduce motion + open/close the drawer, modal, AI Tutor panel | No more large slide/scale animations causing discomfort; dialogs still open/close correctly | Pass |  |
| E3 | 2.2.2 | Find any content that moves on its own for > 5 seconds (carousel, marquee, skeleton pulse, an infinitely-running spinner, the "waiting" dots on SePay) | Has a way to pause/stop/hide it, or the content carries no information and causes no distraction | Pass |  |
| E4 | 2.3.1 | Check that no content flashes > 3 times/second | No flash exceeds the threshold | N/A | No content flashes > 3 times/second |

## F. System-wide page title (SC 2.4.2)

| # | WCAG SC | Action | Expected | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| F1 | 2.4.2 | Browse through every route in the list at the top of the file in turn, record each route's `document.title` | Each route has a **unique** title that correctly describes its content; no route is left with the app's default title | Pass |  |
| F2 | 2.4.2 | Switch lessons in Course Player | Title updates to reflect the current lesson (doesn't keep the old title) | Pass |  |
| F3 | 2.4.2 | 404 page and error page | Title accurately reflects the error state, doesn't reuse the previous page's title | Pass |  |

---

### Conclusion

- Total steps: 27
- Pass: 25
- Fail: 0
- N/A: 2
- Open issues: None
