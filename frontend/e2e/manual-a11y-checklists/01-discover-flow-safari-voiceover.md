# Safari + VoiceOver Checklist — Flow 1: Discover

Scope: `Home → Browse Courses → Course Detail → Add to Cart`.
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

---

## A. HomePage

| # | WCAG SC | Action | Expected (VoiceOver / focus) | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| A0 | 2.4.2 | Press `VO + F2` twice on Home | Page title correctly describes the page (not "React App" or a title duplicated from another route) | Pass |  |
| A1 | 1.3.1 | Open Home, open `VO + U` → select **Landmarks** | See `banner`/`header`, `navigation`, `main`, `contentinfo`/`footer` all present | Pass |  |
| A2 | 1.3.1, 2.4.6 | Open Rotor → select **Headings** | Only one `Heading level 1`; sub-headings follow correct hierarchical order (no skipped levels) | Pass |  |
| A3 | 2.4.1 | Tab from the top of the page | The first item to receive focus is **Skip to main content** | Pass |  |
| A4 | 2.4.1 | Activate the skip link with `Enter` | Focus/VO cursor jumps to `main`, not back to the top of the page | Pass |  |
| A5 | 2.4.4, 4.1.2 | Use `VO + Right Arrow` to browse a course card in the featured list | VoiceOver reads a **meaningful course name** (not just "View course"), the rating reads as **one** accessible description only (not each star individually), price reads naturally | Pass |  |
| A6 | 1.1.1 | Browse course card/instructor images | Informative images have descriptive `alt` text; decorative images are **not** read out (VoiceOver skips them) | Pass |  |
| A7 | 4.1.3, 3.3.1 | Simulate an API error (block the request in Network) or observe the empty state | The error state is read as an alert; the Retry button has a clear name when reached | Pass |  |
| A8 | 4.1.3 | Reload the page, use `VO + Right Arrow` while still loading | There is loading text dedicated to screen readers (not silent waiting); skeletons are not read out as real content | Pass |  |
| A9 | 1.3.2, 2.1.2 | Open the mobile viewport (Responsive Design Mode), browse the mobile menu | Menu reading order is logical, no getting stuck inside the menu | Pass |  |
| A10 | 2.2.2 | If the hero/banner has a carousel or animation that auto-runs > 5 seconds | There is a way to pause/stop/hide it; the animation doesn't auto-loop indefinitely without interaction | N/A | No animation present |

## B. BrowseCoursesPage

| # | WCAG SC | Action | Expected | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| B0 | 2.4.2 | `VO + F2` ×2 on `/courses` | Page title differs from Home and correctly describes the Browse page | Pass |  |
| B1 | 3.3.2, 4.1.2 | Enter the Search field with `VO + Command + J` | VoiceOver reads the field's real **label**, not just the placeholder | Pass |  |
| B2 | 4.1.3 | Type a keyword with results, wait for debounce to finish | The new result count is announced **exactly once** (not read per keystroke) | Pass |  |
| B3 | 1.3.1, 3.3.3 | Type a keyword with no results | Focus automatically moves to the "No courses found" heading. Using VO + →, VoiceOver reads the guidance and the "Clear All Filters" button in sequence | Pass |  |
| B4 | 1.3.1 | Browse to a filter group (category/level/price/rating) | Each group has a clear group name (fieldset/legend or group label) when entered via VO | Pass |  |
| B5 | 4.1.2, 4.1.3 | Select 1 filter with `VO + Space` | The checked state is read out; results update and the new count is announced | Pass |  |
| B6 | 2.4.4, 4.1.2 | Browse to the button that removes 1 active filter | Button name contains the **specific filter name** (e.g. "Remove filter: Beginner"), not just "Remove" | Pass |  |
| B7 | 4.1.2, 2.4.3 | Open the mobile filter drawer | Drawer is read as a named dialog; `Escape` closes it; focus returns to the button that opened the drawer | Pass |  |
| B8 | 2.1.2 | Inside the drawer, try `VO + Right Arrow` repeatedly to move past the drawer | Focus does **not** escape to the page background while the drawer is open | Pass |  |
| B9 | 4.1.2, 2.4.3 | Change page via Pagination | The current page is read as "current page"; after changing pages, the VO cursor/focus moves to a heading or the results list, **not** pushed back to the top of the document | Pass |  |
| B10 | 3.2.2 | Select a filter/change sort via keyboard | The change does not unexpectedly shift context (does not auto-submit/navigate outside the user's expectation) | Pass |  |

## C. CourseDetailPage

| # | WCAG SC | Action | Expected | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| C0 | 2.4.2 | `VO + F2` ×2 on the course detail page | Page title contains the course name and differs from previous routes | Pass |  |
| C1 | 1.3.1 | Open 1 course detail page, browse Rotor → Headings | The course name is `Heading level 1`; metadata (price, rating, etc.) is not falsely marked as a heading | Pass |  |
| C2 | 2.4.4 | Browse the breadcrumb/back link | Text is meaningful when read out of context, not "Click here" | Pass |  |
| C3 | 1.3.1 | Browse the price/discount section | Reads as one coherent sentence (e.g. "Original price \$X, now \$Y"), old/new prices aren't read mixed together without context | Pass |  |
| C4 | 1.1.1, 4.1.2 | Browse to the rating stars | Only **one** accessible value (e.g. "4.5 out of 5 stars"), not each star icon read individually | Pass |  |
| C5 | 4.1.2 | Enter the curriculum, activate 1 section with `VO + Space` | Expanded/collapsed state is announced; pressing `VO + Space` again correctly collapses it back | Pass |  |
| C6 | 4.1.2 | Use the "Expand all / Collapse all" button if present | Button name updates according to the current state | Pass |  |
| C7 | 1.4.1, 1.1.1 | Browse to a locked lesson | The "locked" state has a text alternative when read, not just a silent lock icon | Pass |  |
| C8 | 4.1.3, 4.1.2 | Activate **Add to Cart** | After adding: a success message is announced; if the cart drawer auto-opens, it's handled as a dialog (has a name, focus moves inside, `Escape` closes it) | Pass |  |
| C9 | 4.1.2 | With a course while logged out / already enrolled | The CTA correctly changes based on state (Add to cart / Continue learning) and the button name reflects that state accurately | Pass |  |
| C10 | 1.3.1, 2.4.4 | Try a non-existent course route (404) | There's a `Heading level 1` for the not-found state, and the link back to Browse has a clear name | Pass |  |
| C11 | 1.3.1 | Browse the review list | There's a heading for the review section; reading order for each review is logical (name, rating, content) | Pass |  |
| C12 | 4.1.2, 2.1.2 | If there's a video preview/trailer modal | Modal has an accessible name, focus moves inside on open, `Escape` closes it, focus returns to the trigger button; video does not autoplay with sound | N/A | Video preview feature not yet implemented |

## D. WCAG 2.2 — new criteria (required for the 2.2 AA target)

| # | WCAG SC | Action | Expected | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| W1 | 2.4.11 Focus Not Obscured (Min) | Tab slowly from top to bottom of Home and Browse while the page is **already scrolled to the middle** | The focused element is **not fully obscured by the sticky header**; at least part of it is always visible | Pass |  |
| W2 | 2.4.11 | Tab through controls below the fold while a floating element is present (floating CTA, cookie banner if any) | No element receiving focus is fully obscured by a floating element | N/A | No such elements exist on these pages |
| W3 | 2.4.11 | Open the mobile filter drawer then Tab | The focused item inside the drawer is not obscured by the overlay/drawer itself | Pass |  |
| W4 | 2.5.8 Target Size (Min) | Review small targets: pagination button, remove-active-filter button, cart icon, drawer close button, clickable rating stars | Clickable area is **at least 24×24 CSS px** or has sufficient spacing to avoid overlap | Pass | Axe `target-size` passed for the recorded automated states; the manual pass covers the reviewed Discover controls. |
| W5 | 2.5.7 Dragging Movements | If there's a price range slider filter | Can be adjusted **entirely via keyboard** (Arrow keys), dragging with the mouse is not required | Pass |  |
| W6 | 3.2.6 Consistent Help | Compare the Help/Support/Contact link position on Home, Browse, Course Detail | If present, it appears in the **same relative position** across all pages in the flow (e.g. always in the footer) | Pass |  |
| W7 | 1.4.13 Content on Hover or Focus | If there's a tooltip (e.g. price info icon, level badge) | Tooltip is: dismissible via `Escape` without losing focus, hoverable (moving the mouse onto the tooltip doesn't make it disappear), persistent (doesn't auto-hide after a few seconds) | N/A | No tooltips are used on these pages |

## E. Content & experience checks (not just technical)

| # | WCAG SC | Item to verify | Result | Notes |
| --- | --- | --- | --- | --- |
| E1 | 2.4.4 | All links/buttons in the flow read clearly when standing alone (not dependent on visible context) | Pass |  |
| E2 | 4.1.3 | No notification (toast/alert/live region) is read **twice** by VoiceOver | Pass |  |
| E3 | 2.4.2, 3.2.3 | Navigating routes (Home → Browse → Detail) doesn't lose context — VoiceOver always knows which page it's on | Pass |  |
| E4 | 1.1.1 | Alt text for course/instructor images correctly describes their purpose, without describing incorrect content | Pass | `CourseCard.tsx:61` uses `alt=""` for the thumbnail — intentional, not an oversight: the title is read immediately after via the `<a>` link, so a descriptive alt would read the course name twice (violating E2). All other locations use a fully descriptive alt. Outstanding: this decision isn't yet explained with a code comment (git blame: `eb1c60a`) — should be added |
| E5 | 3.2.3 | Header/nav keeps the same order and naming across the 3 pages in the flow | Pass |  |

## F. Quick keyboard-only pass (no mouse)

| # | WCAG SC | Action | Expected | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| F1 | 2.4.3 | Tab through the entire Home → Browse → Detail flow | Focus order is logical and follows visual order, no erratic jumps | Pass |  |
| F2 | 2.4.7 | Focus indicator | Always clearly visible on every background (including images/gradients) | Pass |  |
| F3 | 2.4.3 | Tab through the whole page, observe the stopping points | No hidden/disabled element receives Tab focus | Pass |  |
| F4a | 2.1.2 | Open the curriculum accordion (not a dialog) then Tab repeatedly | No keyboard trap; Tab moves freely in/out of sections without getting stuck | Pass |  |
| F4b | 2.1.2 | Open the mobile filter drawer (a dialog) then Tab repeatedly | Tab **is allowed** to cycle inside the drawer (this is correct modal behavior, not considered a trap) — but it must be possible to exit via `Escape` or a Close button reachable by Tab; Tab **must not** leak out to the page background while the drawer is open (consistent with B8) | Pass |  |
| F5 | 2.1.1 | Complete Home → Browse → Detail → Add to Cart using only the keyboard | Every main function is operable, no mouse required | Pass |  |

---

### Conclusion

- Total steps: 53
- Pass: 49
- Fail: 0
- N/A: 4
- Open issues: None
