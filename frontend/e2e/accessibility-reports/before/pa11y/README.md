# Pa11y before-remediation evidence

This directory contains the committed Pa11y baseline used by the Phase 0 audit.
It was generated on 2026-07-31 against the deterministic local fixtures and
contains 30 errors across nine routes with no route scan errors.

These files are immutable evidence. Normal local and CI runs write generated
output to `e2e/pa11y/reports/`, which is intentionally ignored by Git.

Do not overwrite this directory during remediation. Store the corresponding
re-scan in `e2e/accessibility-reports/after/pa11y/`.
