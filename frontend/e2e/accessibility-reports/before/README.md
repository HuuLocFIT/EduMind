# Phase 0 before-remediation evidence

This directory is intentionally committed as the immutable baseline for task
2.4. Generate the Axe and keyboard JSON files with:

```bash
npx playwright test --config=e2e/playwright.baseline-a11y.config.ts
```

The collector records every Axe violation and keyboard observation without
failing on accessibility findings. A route-level `scanError` is evidence of a
blocked scan, not a passing result.

Committed Pa11y baseline evidence is stored in `pa11y/`. It is an immutable copy
of the generated runtime reports that supported the Phase 0 audit. The normal
Pa11y output directory remains `e2e/pa11y/reports/`; that directory is ignored
by Git and is intended for local runs and CI artifacts.

Do not replace these files during remediation. Write re-scan evidence to an
`after/` directory.
