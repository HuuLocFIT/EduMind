# Pa11y reports

Run `npm run pa11y` from `frontend/`. The runner writes:

- `pa11y-results.json`: combined machine-readable result for every configured route.
- `<route>.html`: one human-readable report per route.

CI should upload the entire `e2e/pa11y/reports/` directory as an artifact, even
when the scan exits non-zero because accessibility issues were found.

This directory contains generated runtime output and is intentionally ignored
by Git. Immutable baseline evidence belongs in
`e2e/accessibility-reports/before/pa11y/`; remediation evidence belongs in the
corresponding `after/pa11y/` directory.
