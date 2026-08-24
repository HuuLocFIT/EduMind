# Known Limitations

Current operational gaps, edge cases, and boundary policies that affect deployment or maintenance. Security-sensitive implementation details belong in private issue tracking rather than this production-facing document.

## Architecture

The LMS core is deliberately deployed as a modular monolith, with separate `course`, `payment`, and `ai` schemas and module APIs as the preferred in-process contracts. Most transactional flows follow those contracts, but `DashboardServiceImpl` and `TeacherAnalyticsServiceImpl` still query payment repositories directly for reporting. This coupling does not prevent the current deployment model from operating, but it must be removed before the affected modules can be extracted or deployed independently.

New transactional paths must use module-owned APIs rather than add cross-module repository access. The existing reporting queries should be migrated when their reporting contracts change or independent extraction becomes a real requirement; a broad repository refactor is not justified solely to make the current modular monolith look like distributed services.

## Background processing

AI generation, embeddings, summaries, quiz generation, and transcription run on bounded in-process executors. Scheduled jobs handle selected recovery and lifecycle work. There is no Kafka, RabbitMQ, or other durable message broker, which keeps deployment and operations proportional to the project's current single-service scale.

The tradeoff is that executor queues and in-flight execution are not durable across a process restart. Persisted domain and AI-job state remains authoritative, but recovery is workflow-specific: transcription rate limits use persisted `DELAYED` state and a retry scheduler, while failed or interrupted quiz, embedding, and summary work requires the originating action or an administrative operation to trigger new work. A durable broker becomes appropriate when the system requires horizontal workers, guaranteed handoff across restarts, replay, or independent workload scaling.

## Runtime validation policy

Runtime validation is an architectural control applied according to risk, not a requirement to parse every response with Zod. For new or materially changed frontend integrations:

- External or otherwise untrusted payloads must be validated before the application relies on their shape.
- Authentication, payment, AI, browser-persisted data, and responses likely to change independently of the frontend require runtime validation.
- SSE events, uploads, and direct third-party payloads require validation designed for their protocol, provider, and failure mode.
- Internal, stable, low-risk responses may use strict TypeScript contracts without duplicate runtime schemas.

This policy describes the adoption direction; it does not claim complete coverage across the existing frontend. A focused inventory found broad runtime-schema coverage across checkout, orders, refunds, payouts, invoices, earnings, and non-streaming AI responses. Coverage remains uneven in auth refresh and browser rehydration, AI SSE metadata/error events, persisted upload jobs, and direct Cloudinary or general file-upload responses.

Those existing paths are follow-up hardening work, prioritized when the relevant integration changes or when its backend contract, compatibility behavior, failure handling, and tests can be verified together. They are not being changed solely to support a README claim, because introducing fail-closed parsing at an established frontend/backend boundary can itself create user-visible regressions. Until a path explicitly parses a schema, callers must not assume that its runtime shape has been validated.

## Payments

- **The current SePay webhook integration uses API-key authentication rather than payload signing**: EduMind verifies SePay's `Authorization: Apikey ...` header and rejects missing or invalid credentials when signature enforcement is enabled. SePay also supports and recommends HMAC-SHA256 with timestamped signature headers, so migrating this endpoint to HMAC and replay protection is a project hardening opportunity, not a provider restriction. Until then, production deployments must keep API-key enforcement enabled, use HTTPS, and manage the key through the runtime secret store. See SePay's [webhook authentication](https://developer.sepay.vn/vi/sepay-webhooks/xac-thuc) and [security checklist](https://developer.sepay.vn/vi/sepay-webhooks/bao-mat).
- **SePay pending-payment coordination is in memory**: coordination between webhook and status-poll paths does not survive a service restart. Persisted order state remains the source of truth, but an in-flight payment may require reconciliation after restart.
- **Duplicate SePay webhook handling is state-based rather than event-ledger-based**: repeated callbacks are ignored according to persisted order and transaction state, not deduplicated by the provider transaction `id` in a dedicated processed-event table. This protects the current order lifecycle from repeated side effects, but it does not provide an independent webhook audit/replay ledger. SePay's current production guidance explicitly recommends deduplication by transaction `id`; see the [webhook quick start](https://developer.sepay.vn/vi/sepay-webhooks/bat-dau-nhanh).
- **SePay refund and payout are deliberately manual-confirmation flows in this integration**: the adapter is built around QR collection, incoming-transaction webhooks, and transaction lookup; it does not initiate outbound transfers. `SepayGateway.refund`/`payout` therefore return `MANUAL_REFUND_REQUIRED`/`MANUAL_PAYOUT_REQUIRED`, after which an admin transfers funds out-of-band and confirms the result in EduMind. This describes the product flow implemented here rather than making a permanent claim about every SePay product or future API. UI and operations must distinguish “awaiting manual transfer” from “money moved.”
