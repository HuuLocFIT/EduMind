# Manual Accessibility Test Summary

Summary of manual test results for EduMind's critical journeys. This is an overview page for readers; the steps, expectations, and results of each check are recorded in the detailed checklists.

Results reflect the **final, manually verified state**. Issues found during development are fixed and re-checked before the results are updated; each step records only the final result and does not require a screenshot.

Setup instructions and how results are recorded: [README.md](README.md).

## 1. Scope and environment

Test scope covers Safari + VoiceOver on macOS for four critical journeys and one cross-cutting pass covering keyboard, zoom, reflow, contrast, and motion.

| Field | Value |
| --- | --- |
| Test date | 2026-08-22 |
| macOS version | macOS Sequoia - Version 15.1 |
| Safari version | Version 18.1 |
| VoiceOver verbosity (default: Medium) | Medium |
| Flow conclusion (Pass / Fail) | Pass |

## 2. Current results

| Flow | Checklist | Total steps | Pass | Fail | N/A | Conclusion |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Discover | [01](01-discover-flow-safari-voiceover.md) | 53 | 49 | 0 | 4 | **Pass** |
| Authentication | [02](02-auth-flow-safari-voiceover.md) | 56 | 53 | 0 | 3 | **Pass** |
| Purchase | [03](03-purchase-flow-safari-voiceover.md) | 70 | 66 | 0 | 4 | **Pass** |
| Learning | [04](04-learning-flow-safari-voiceover.md) | 81 | 75 | 0 | 6 | **Pass** |
| Cross-cutting | [05](05-cross-cutting-zoom-reflow-motion.md) | 27 | 25 | 0 | 2 | **Pass** |
| **Total** | | **287** | **268** | **0** | **19** | **5/5 passed** |

Conclusion rules:

- `Pass`: every applicable step is `Pass`; every `N/A` step has a clear reason.
- `Fail`: at least one step is `Fail`.

## 3. Open issues

No `Fail` issues are recorded in the detailed checklists.

## 4. Known limitations

The limitations below are outside the current support or test scope; they are not presented as completed features.

| Limitation | Affected scope |
| --- | --- |
| Captions are only available when the course provides a valid VTT file. | Learning — video |
| Captions default to `srcLang="en"`; the API does not yet provide language metadata. | Learning — video |
| Transcript depends on `articleContent`; missing data shows a placeholder. | Learning — lesson content |
| Quiz currently supports only a single answer per question. | Learning — quiz |
| Real `forced-colors` testing on Windows High Contrast has not been performed. | Cross-cutting — visual accessibility |
| After exiting video fullscreen, VoiceOver may read out the window title as an additional announcement, due to WebKit behavior. | Learning — video fullscreen |
