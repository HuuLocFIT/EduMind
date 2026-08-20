# Known Limitations

Current operational gaps and edge cases that affect deployment or maintenance. Security-sensitive implementation details belong in private issue tracking rather than this production-facing document.

## Payments

- **SePay webhook verification uses a static shared-secret header**, not an HMAC of the request payload. Production deployments must keep signature enforcement enabled and manage the shared secret through the runtime secret store.
- **SePay pending-payment coordination is in memory**: coordination between webhook and status-poll paths does not survive a service restart. Persisted order state remains the source of truth, but an in-flight payment may require reconciliation after restart.
- **`DuplicateWebhookException` is unused**: the exception type and its controller handler exist, but no code path currently throws it — duplicate-webhook protection today comes from order/transaction status checks (e.g. skip if already `COMPLETED`/`REFUNDED`), not a dedicated webhook-event-ID table.
- **Checkout idempotency keys are optional and globally unique**: a repeated key for the same user returns the existing order, while the database index currently scopes key uniqueness globally rather than by user. Requests without a key still benefit from the one-active-order-per-user constraint, but do not receive the same replay response guarantee.
- **SePay refund and payout are manual-confirmation flows**, not automated gateway API calls — `SepayGateway.refund`/`payout` always return `MANUAL_REFUND_REQUIRED`/`MANUAL_PAYOUT_REQUIRED`; an admin must transfer funds out-of-band and confirm via `confirmManualRefund`/`confirmManualPayout`. This is by design (SePay has no refund/payout API), not a bug, but it means "refund processed" in the UI can mean "queued for manual action" rather than "money moved."

## Testing & CI

- No coverage tool (JaCoCo or otherwise) is wired into any `pom.xml` or the CI workflow — CI (`backend-ci.yml`) runs `mvn test` and publishes JUnit XML results via `dorny/test-reporter`, with no test-count or coverage percentage generated. Don't quote coverage numbers for this project until a coverage tool is actually added to the pipeline.

## Production hardening

See [Production operations](production-operations.md) for deployment configuration, secrets, migrations, verification, and operational safeguards.
