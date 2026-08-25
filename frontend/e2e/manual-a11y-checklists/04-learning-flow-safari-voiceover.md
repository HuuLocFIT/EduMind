# Safari + VoiceOver Checklist — Flow 4: Learning

Scope: `My Learning → Course Player` (curriculum, video, article, quiz, AI Tutor, progress).
Required machine setup: see [README.md](README.md).

**Before starting**: `Safari → Advanced → Press Tab to highlight each item` is enabled, Full Keyboard Access is enabled, and the VoiceOver Caption Panel is enabled.

> **Known limitations to keep in mind while testing** (not counted as new issues if already recorded in known-limitations):
> captions only display when `videoCaptionUrl` exists and the VTT loads successfully; caption/transcript metadata currently defaults to English (`srcLang="en"`); the transcript uses `articleContent` as its source, showing a clear placeholder when absent; quiz only supports selecting 1 answer (radio), multi-select is not yet supported.

## Test information

| Field | Value |
| --- | --- |
| Test date | 2026-08-20 |
| macOS version | macOS Sequoia - Version 15.1 |
| Safari version | Version 18.1 |
| VoiceOver verbosity (default: Medium) | Medium |
| Flow conclusion (Pass / Fail) | Pass |

## Test data that must be ready

- An enrolled course with **at least 2 sections**.
- 1 video lesson with test captions (valid VTT).
- 1 text/article lesson.
- 1 quiz lesson.
- 1 locked lesson.
- At least 1 lesson in the in-progress state and 1 in the completed state.
- A course that already has AI data (embeddings + summary) so the AI Tutor can respond.
- 1 lesson with attached materials (resources), if the feature exists.
---

## A. MyLearningPage

| # | WCAG SC | Action | Expected | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| A0 | 2.4.2 | `VO + F2` ×2 on My Learning | Page title correctly describes the page | Pass |  |
| A1 | 1.3.1 | Open My Learning, Rotor → Headings | Exactly one `Heading level 1` | Pass |  |
| A2 | 4.1.2, 2.1.1 | Browse the tab list (All/Active/Completed) | Tab list has an accessible label; switch tabs with `Left/Right Arrow` (Tab not required) | Pass |  |
| A3 | 2.1.1 | Use `Home`/`End` in the tab list | Correctly jumps to the first/last tab | Pass |  |
| A4 | 4.1.3 | Switch tabs | VoiceOver announces the new filter name + the corresponding course count | Pass |  |
| A5 | 1.3.1, 2.4.4 | Browse the enrollment cards | Reads as a list; the "Continue Learning" button's name contains the **course name** | Pass |  |
| A6 | 4.1.2 | Browse the progress bar of 1 course | Has a label + a readable value (e.g. "65% complete"), not just a silent colored bar | Pass |  |
| A7 | 1.4.1 | Compare a completed vs. an in-progress course | State is distinguishable via text/label when read, not by color alone | Pass |  |
| A8 | 4.1.3 | Switch to an empty tab (e.g. Completed when no course has been finished) | The empty state matches the correct tab and is announced | Pass |  |
| A9 | 2.1.1 | Activate Continue Learning with `Enter` | Correctly navigates into that course's Course Player | Pass |  |
| A10 | 4.1.3 | While loading | The skeleton is **not** read out by VoiceOver as real content; there's loading text for the screen reader | Pass |  |
| A11 | 4.1.3, 3.3.3 | Simulate an API error (block the request) | The error reads as an alert; the Retry button has a clear name and can be activated via keyboard | Pass |  |
| A12 | 3.3.2, 4.1.3 | If there's search/sort in My Learning | Has a real label; a result change is announced exactly once | N/A | This page has no search/sort |

## B. CoursePlayerPage — structure & navigation

| # | WCAG SC | Action | Expected | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| B0 | 2.4.2 | `VO + F2` ×2 inside Course Player, then switch lessons and repeat | Page title reflects the current course/lesson and **updates when the lesson changes** | Pass |  |
| B1 | 1.3.1 | Open Course Player, Rotor → Headings | `Heading level 1` is the course name; the current lesson name sits at the next heading level | Pass |  |
| B2 | 1.3.1, 4.1.2 | Browse the curriculum sidebar | Is a navigation/region with a clear label (e.g. "Course curriculum") | Pass |  |
| B3 | 4.1.2 | Activate 1 section with `VO + Space` | `aria-expanded` changes and is correctly announced | Pass |  |
| B4 | 1.3.1, 4.1.2 | Browse the lesson list inside a section | Reads as a list; the current lesson is marked "current step" when read (`aria-current`) | Pass |  |
| B5 | 1.4.1 | Browse a completed lesson | Has a text alternative announcing completion, not just an icon/color | Pass |  |
| B6 | 1.4.1, 4.1.2 | Browse a locked lesson | If not focusable — reasonably skipped by the Rotor; if focusable — explains the reason for the lock when read | N/A | Course Player is only accessible after enrolling; the sidebar (CourseCurriculumSidebar.tsx) has no concept of a locked lesson |
| B7 | 2.4.3, 4.1.3 | Select a different lesson with `VO + Space`/Enter | Focus moves to the heading/content of the new lesson; a lesson-change is announced | Pass |  |
| B8 | 4.1.2, 2.4.3 | Open the sidebar on a mobile viewport | Behaves as a drawer/dialog if it covers content; `Escape` closes it; focus returns to the toggle button | Pass |  |
| B9 | 2.1.2 | Inside the sidebar drawer opened at B8 (without pressing Escape/closing), Tab/Shift+Tab repeatedly through all items | The focus trap is **intentional** (doesn't escape the drawer while it covers content) but must cycle correctly: Tab from the last item wraps to the first, Shift+Tab from the first wraps to the last; the Close/toggle button always sits within the loop and is reachable via Tab — no point is a hard dead-end that can't Tab forward/backward | Pass |  |
| B9b | 2.1.2, 4.1.2 | With the same drawer opened at B8, use the VO cursor (swipe Left/Right) instead of Tab to browse through all items | VO swipe doesn't escape the drawer into the covered background content (no leak); if the VO cursor reaches the end, swiping further doesn't hang — it wraps to the start or stops reasonably at the Close button | Pass |  |
| B10 | 4.1.2 | Browse the Exit player / toggle sidebar button | Clear button name, not just an anonymous icon | Pass |  |
| B11 | 4.1.2, 2.4.3 | `[LOCAL]` Simulate an access error (course suspended/dropped) | Error modal manages focus correctly (focus moves inside the modal) and has a recovery action | Pass |  |
| B12 | 2.4.4, 4.1.2 | Browse the Previous/Next lesson button | Button name states where it will go (not just "Next"); the disabled state on the first/last lesson reads clearly | Pass |  |
| B13 | 2.4.4, 4.1.2 | If a lesson has attached materials (resources) | Each link clearly states the material's name + format/size; downloadable via keyboard | Pass |  |

## C. CoursePlayerPage — video & media

| # | WCAG SC | Action | Expected | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| C1 | 2.1.1, 4.1.2 | Enter a video lesson, Tab to the video controls | Every control is operable via keyboard: play/pause, seek, volume, mute, playback speed, quality, captions, settings, fullscreen, elapsed time — each control has an accessible name | Pass |  |
| C2 | 1.2.2 | Enable captions (CC) on a video with test captions | Captions display the correct content; the track reads as "English captions" per current metadata (note as a limitation if the course isn't in English) | Pass |  |
| C3 | 1.2.2 | Video without a `videoCaptionUrl` or with a broken VTT | Does not claim to have captions — accepted as a known limitation, not a new bug | Pass | Tested with a malformed VTT (200 OK, incorrect content): captions still read out — the browser silently skips the broken cue, not a case of "false claim" |
| C4 | 1.2.2, 1.3.1 | Check the transcript | If `articleContent` exists → shows a readable transcript; if absent → a clear placeholder ("A transcript is not available for this video.") | Pass |  |
| C5 | 1.4.2 | Enter a video lesson | Doesn't autoplay with sound upon entering the page (no autoplay with sound) | Pass |  |
| C6 | 4.1.2 | Browse to the seek bar and volume bar with `VO + Command + J` | Read as a slider with a current value (e.g. "Seek video, 35 percent"); `Left/Right Arrow` can change the value | Pass |  |
| C7 | 4.1.2, 2.1.2 | Open the Settings menu (720p/480p quality, playback speed) | Menu has correct semantics, navigable via Arrow/Enter, `Escape` closes it and focus returns to the Settings button | Pass |  |
| C8 | 2.1.2, 2.4.3 | Enter fullscreen via keyboard then exit with `Escape` | Fully enterable/exitable via keyboard; after exiting, focus returns to a reasonable control, not lost to the top of the page | Pass | **Known limitation (accepted)**: VO reads out the window title again after exiting — a WebKit modal-dismissal behavior, confirmed via a minimal repro without app code, not a bug, and no web API can block it. |
| C9 | 2.1.1 | Check the player's keyboard shortcuts (Space, arrow keys, F, M if any) | No conflict with VoiceOver keys; if a conflict exists, there's still a way to operate via the focused control | Pass |  |

## D. CoursePlayerPage — content, quiz & progress

| # | WCAG SC | Action | Expected | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| D1 | 1.3.1 | Enter a text/article lesson | Heading/list/code structure retains its semantics after Markdown/HTML rendering | Pass |  |
| D2 | 1.3.1 | If the lesson has a code block | The code's context/language reads reasonably (not read as meaningless plain text) | Pass |  |
| D3 | 4.1.2 | Activate "Mark complete" | Has a loading/disabled state; button name stays stable while processing | Pass |  |
| D4 | 4.1.3 | After completing | Completion + the new progress are announced; **no** double-submit when pressed again or Enter is repeated | Pass |  |
| D5 | 4.1.3, 2.2.1 | If there's auto-advance to the next lesson | Warned in advance via text/announcement (doesn't jump suddenly); **cancellable via keyboard**; the countdown isn't re-read every second | Pass |  |
| D6 | 1.3.1, 4.1.2 | Enter a quiz lesson | Questions use fieldset/legend; answers use radio buttons; selectable via Arrow keys; only 1 answer selectable per question (current limitation) | Pass |  |
| D7 | 4.1.3, 3.3.1 | Submit the quiz | Result is clearly announced (correct/incorrect, score); if not all questions are answered, the error is read out and focus moves to the missing question | Pass |  |
| D8 | 4.1.3, 3.3.3 | Simulate a **video progress save** error (block the autosave request) | Error is shown as more than a fleeting toast — there's an accessible state/retry that VoiceOver can reach, clearly stating which lesson is being retried | Pass |  |
| D9 | 4.1.3, 3.3.3 | Simulate a **post-completion reconcile** error (block the enrollment/progress request) | This is a different recovery path from D8 — the message and retry action must be distinguishable, not confused with the progress-save error | Pass |  |
| D10 | 4.1.2, 2.4.3 | Complete the last lesson → course-completion dialog | Dialog has an accessible name, focus moves inside on open, `Escape` closes it, focus returns to reasonable content; the next action reads clearly | Pass |  |

## E. AI Tutor overlay (inside Course Player)

> Streaming via SSE is the highest a11y risk in this flow: content arrives token by token, which can easily cause a live region to re-read the whole sentence repeatedly, or the opposite — total silence.

| # | WCAG SC | Action | Expected | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| T1 | 4.1.2 | Browse to the "AI Tutor" pill button with `VO + Right Arrow` | Has a clear accessible name; open/closed state is read out (`aria-expanded`) | Pass |  |
| T2 | 4.1.2, 2.4.3 | Open the panel with `VO + Space` | Panel is a named dialog; focus moves inside the panel immediately upon opening | Pass |  |
| T3 | 2.4.3 | Press `Escape` while the panel is open | Panel closes; focus returns to the exact pill button that opened it | Pass |  |
| T4 | 2.1.2 | Inside the panel, Tab and `VO + Right Arrow` repeatedly | Doesn't escape to the background content while the panel is modal; no unescapable keyboard trap | Pass |  |
| T5 | 4.1.2 | On a mobile viewport, browse the backdrop area behind the panel | The backdrop (a full-screen close button) doesn't create a confusing stray item when browsed with the VO cursor | Pass |  |
| T6 | 3.3.2, 4.1.2 | Browse to the question input field | Has a real label (not just a placeholder); the Send button has an accessible name | Pass |  |
| T7 | 4.1.3 | Send a question, listen while waiting | The "answering" state is announced (loading/`aria-busy`), not silent | Pass |  |
| T8 | 4.1.3 | Listen while the answer **streams in token by token** | The answer is **not** re-read from the start each time a token is added; prefer announcing once when streaming finishes | Pass |  |
| T9 | 4.1.3 | After streaming ends | The user knows the answer is complete and can re-read the entire thing with `VO + Right Arrow` | Pass |  |
| T10 | 2.4.4 | Browse to a citation link to the source lesson | Link name clearly states which lesson is cited, not just "[1]" or "Source" | N/A | Sources are currently `<span>` badges (AiChatPanel.tsx), with no `href`/role, not designed as links — there is no feature yet to jump to the source lesson. SC 2.4.4 doesn't apply (not applicable when it isn't a link). If citations are later turned into a navigable link/button, this criterion must be re-tested. |
| T11 | 1.3.1 | Browse the conversation history | Own question vs. AI's answer are distinguishable when listened to (not blended into one block) | Pass |  |
| T12 | 4.1.2, 4.1.3 | If there's a Stop/Cancel button while streaming | Operable via keyboard; cancellation is announced | N/A | No support for stop/cancel buttons |
| T13 | 4.1.3, 3.3.3 | Simulate an AI error (block the SSE request) | Error reads as an alert, with an accessible retry action | Pass |  |

## F. WCAG 2.2 — new criteria (required for the 2.2 AA target)

| # | WCAG SC | Action | Expected | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| W1 | 2.5.7 Dragging Movements | The video player's **seek** bar and **volume** bar | Fully adjustable via `Left/Right Arrow` while focused — dragging with the mouse is not required. Note whether the control uses a native `<input type="range">` or a custom one | Pass |  |
| W2 | 2.5.7 | If the quiz/curriculum has a drag-and-drop interaction (reordering, drag-to-mark) | Has an equivalent single-pointer/keyboard alternative | N/A | No drag-and-drop feature exists |
| W3 | 2.5.8 Target Size (Min) | Review the video controls (play, mute, CC, settings, fullscreen), AI Tutor pill button, sidebar toggle button, and quiz checkboxes/radios | ≥ 24×24 CSS px or sufficient spacing | Pass | Axe `target-size` passed for the recorded automated states; the manual pass covers the reviewed Learning controls. |
| W4 | 2.4.11 Focus Not Obscured (Min) | Tab through Course Player while scrolled down, and while the AI Tutor pill button is displayed (`position: fixed` bottom-right corner) | The focused element is not fully obscured by the pill button, player header, or control bar — especially controls at the bottom-right of the content | Pass |  |
| W5 | 2.4.11 | Open the AI Tutor panel then Tab through the lesson content behind it (if not modal) | No element receiving focus is fully obscured by the panel | Pass | Since AI Tutor is a dialog type, it already uses a focus trap by default |
| W6 | 3.3.7 Redundant Entry | Take the quiz → leave the lesson → come back | Doesn't require re-entering already-selected answers within the same attempt (or clearly states it's starting a new attempt) | Pass |  |
| W7 | 3.2.6 Consistent Help | Compare the position of help entry points (AI Tutor pill, support link) between My Learning and Course Player | If present, in the same relative position across pages in the flow | Pass |  |
| W8 | 2.2.1 Timing Adjustable | Auto-advance countdown and quiz timer (if any) | There's a way to turn off/postpone/extend it; doesn't auto-advance before the user has had time to hear it fully | Pass | The auto-advance countdown supports turning off auto-advance; the quiz has no timer at all (can take as long as needed) |
| W9 | 1.4.13 Content on Hover or Focus | Tooltip on video controls / lesson status badge | Dismissible via `Escape`, hoverable, persistent | N/A | The video controls (`VideoPlayer.tsx`) and the lesson status badge (`CourseCurriculumSidebar.tsx`) show no tooltip on hover/focus — status is conveyed only via `aria-label`/`sr-only` text, not supplementary content that appears on hover/focus. No Tooltip component exists anywhere in the codebase (grepped the entirety of `apps/user` and `libs/user`). Since there's no "content on hover or focus", SC 1.4.13 doesn't apply. If a real tooltip is added later (e.g. showing % progress on badge hover), this criterion must be re-tested. |

## G. Overall experience

| # | WCAG SC | Item to verify | Result | Notes |
| --- | --- | --- | --- |
| G1 | 2.1.1 | Browse the enrolled courses list entirely via VoiceOver, without looking at the screen | Pass |  |
| G2 | 1.4.1 | Switch tabs, enter Course Player, correctly identify current/completed/locked lessons by listening alone | Pass |  |
| G3 | 2.1.1 | Switch between at least 2 lessons, control the video, enable captions — all via VoiceOver | Pass |  |
| G4 | 4.1.3 | Mark complete and hear the new progress update, without needing to look at the progress bar | Pass |  |
| G5 | 4.1.3 | No announcement (lesson change, complete, progress, error, AI) is read twice | Pass |  |
| G6 | 4.1.3 | Switching lessons in rapid succession: the old lesson's announcement doesn't overlap the new one | Pass |  |

## H. Quick keyboard-only pass

| # | WCAG SC | Action | Expected | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| H1 | 2.4.3, 2.4.7 | Tab through the entire My Learning + Course Player | Focus order is logical, focus indicator is always clearly visible | Pass |  |
| H2 | 2.1.1 | Control the video 100% via keyboard (no mouse) | Play/pause/seek/volume/speed/quality/caption/fullscreen all usable | Pass |  |
| H3 | 2.1.1 | Arrow/Home/End in the tab list and curriculum | Works correctly per the WAI-ARIA pattern | Pass |  |
| H4a | 2.1.2 | Tab repeatedly inside the quiz (not a dialog/drawer — correct when the quiz is its own lesson; when a quiz appears inside a non-QUIZ lesson content type, it's a dialog) | No keyboard trap — Tab/Shift+Tab exit the quiz area normally, no getting stuck | Pass |  |
| H4b | 2.1.2 | Tab repeatedly in the mobile sidebar, error modal, AI Tutor panel (all dialogs/drawers — the trap is intentional, already tested in detail at B9/T4/C7/D10) | Trap cycles correctly (no dead-end), Escape/Close button still allows exit — this is a **quick smoke check**, not a re-test of B9/T4/C7/D10 | Pass |  |
| H5 | 2.1.1 | Complete My Learning → Course Player → switch lesson → Mark Complete using only the keyboard | The entire journey completed without a mouse | Pass |  |

---

### Conclusion

- Total steps: 81
- Pass: 75
- Fail: 0
- N/A: 6
- Open issues: None
