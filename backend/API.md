# EduMind Backend — API Reference

This is the code-derived endpoint reference for `auth-service` and `lms-core-service`, verified against the controller source on **2026-08-12**. It exists because the backend does not yet expose OpenAPI/Swagger — see [Generating this from OpenAPI instead](#generating-this-from-openapi-instead) at the bottom. Until that automation exists, controller changes must update this file in the same pull request.

**All paths below are controller-level paths.** The API Gateway rewrites `/api/<x>/...` → `/<x>/...` before forwarding, so a controller path of `/auth/login` is reached externally as `POST http://localhost:8080/api/auth/login`. Always call through the Gateway (`:8080`) in practice — see the [Quick Start](README.md#-quick-start) direct-vs-gateway note.

Unless a row says otherwise, responses are wrapped in `ApiResponse<T>` (single resource) or `PagedResponse<T>` (paginated list) from `common-lib`, and the HTTP status is `200` for GET/PUT/PATCH/DELETE and `200` for POST (explicit `201`/`202`/`302` are called out under **Notes**).

---

## auth-service

### `AuthController` (`/auth`)

| Method | Path | Role | Response | Notes |
| :--- | :--- | :--- | :--- | :--- |
| POST | `/auth/signup` | Public | `ApiResponse<Void>` | 201 |
| POST | `/auth/login` | Public | `ApiResponse<JwtResponse>` or `ApiResponse<TwoFactorRequiredResponse>` | Refresh token set via HttpOnly cookie, not in body |
| POST | `/auth/login/2fa` | Public | `ApiResponse<JwtResponse>` | |
| POST | `/auth/refresh` | Public | `ApiResponse<JwtResponse>` | Reads `refreshToken` cookie |
| POST | `/auth/logout` | Authenticated | `ApiResponse<Void>` | Clears refresh cookie |

### `EmailVerificationController` (`/auth`)

| Method | Path | Role | Response | Notes |
| :--- | :--- | :--- | :--- | :--- |
| GET | `/auth/verify-email?token=` | Public | `ApiResponse<String>` | |
| POST | `/auth/resend-verification` | Public | `ApiResponse<String>` | |

### `PasswordResetController` (`/auth/password`)

| Method | Path | Role | Response | Notes |
| :--- | :--- | :--- | :--- | :--- |
| POST | `/auth/password/forgot` | Public | `ApiResponse<String>` | |
| GET | `/auth/password/validate-token?token=` | Public | `ApiResponse<TokenValidationResponse>` | 400 `ErrorResponse` on invalid token |
| POST | `/auth/password/reset` | Public | `ApiResponse<String>` | |

### `TwoFactorAuthController` (`/auth/2fa`) — all require authentication

| Method | Path | Role | Response |
| :--- | :--- | :--- | :--- |
| POST | `/auth/2fa/setup` | Authenticated | `ApiResponse<TwoFactorSetupResponse>` |
| POST | `/auth/2fa/verify` | Authenticated | `ApiResponse<TwoFactorStatusResponse>` |
| POST | `/auth/2fa/disable` | Authenticated | `ApiResponse<TwoFactorStatusResponse>` |
| GET | `/auth/2fa/status` | Authenticated | `ApiResponse<TwoFactorStatusResponse>` |
| POST | `/auth/2fa/backup-codes` | Authenticated | `ApiResponse<BackupCodesResponse>` |

### `UserController` (`/users`)

| Method | Path | Role | Response | Notes |
| :--- | :--- | :--- | :--- | :--- |
| GET | `/users/me` | Authenticated | `ApiResponse<UserResponse>` | |
| GET | `/users/{id}` | ADMIN, TEACHER | `ApiResponse<UserResponse>` | |
| GET | `/users/{id}/public-profile` | Public | `ApiResponse<PublicUserProfileResponse>` | |
| PUT | `/users/me` | Authenticated | `ApiResponse<UserResponse>` | |
| POST | `/users/me/change-password` | Authenticated | `ApiResponse<String>` | |
| DELETE | `/users/me` | Authenticated | `ApiResponse<MessageResponse>` | Clears refresh cookie |

### `TeacherApplicationController` (`/teacher-application`)

| Method | Path | Role | Response | Notes |
| :--- | :--- | :--- | :--- | :--- |
| POST | `/teacher-application/submit` | STUDENT | `MessageResponse` (not `ApiResponse`) | 201 |
| GET | `/teacher-application/my-application` | Authenticated | `ApiResponse<TeacherApplicationResponse>` | |
| GET | `/teacher-application/trial-status` | TEACHER_TRIAL | `ApiResponse<TrialStatusResponse>` | |

### `FileUploadController` (`/upload`)

| Method | Path | Role | Response |
| :--- | :--- | :--- | :--- |
| POST | `/upload/document` | Authenticated | `ApiResponse<FileUploadResponse>` |
| POST | `/upload/image` | Authenticated | `ApiResponse<FileUploadResponse>` |
| POST | `/upload/icon` | ADMIN | `ApiResponse<FileUploadResponse>` |
| DELETE | `/upload?url=` | Authenticated | `ApiResponse<Void>` |

### `AdminController` (`/admin/users`) — ADMIN only

| Method | Path | Response |
| :--- | :--- | :--- |
| POST | `/admin/users/teacher` | `ApiResponse<Void>` |
| POST | `/admin/users/admin` | `ApiResponse<Void>` |
| GET | `/admin/users` | `PagedResponse<UserListResponse>` |
| GET | `/admin/users/role/{roleName}/stats` | `ApiResponse<UserRoleStatsResponse>` |
| GET | `/admin/users/role/{roleName}` | `PagedResponse<UserListResponse>` |
| PUT | `/admin/users/{userId}/role` | `ApiResponse<Void>` |
| PATCH | `/admin/users/{userId}/status?enabled=` | `ApiResponse<Void>` |
| DELETE | `/admin/users/{userId}` | `ApiResponse<Void>` (soft delete) |
| GET | `/admin/users/applications/stats` | `ApiResponse<ApplicationStatsResponse>` |
| GET | `/admin/applications` | `PagedResponse<TeacherApplicationResponse>` |
| GET | `/admin/applications/{id}` | `ApiResponse<TeacherApplicationResponse>` |
| POST | `/admin/applications/{id}/review` | `ApiResponse<Void>` |
| GET | `/admin/trial-teachers` | `PagedResponse<TrialStatusResponse>` |
| POST | `/admin/trial-teachers/{userId}/upgrade` | `ApiResponse<Void>` |

**auth-service `SecurityConfig` summary**: public — signup/login/refresh/2fa-login/verify-email/resend-verification/password reset flow, public profile, OAuth2 endpoints, `/actuator/health`, `/actuator/info`. ADMIN-only — `/admin/**`, `/actuator/**` (metrics included). Everything else falls to `anyRequest().authenticated()`.

---

## lms-core-service

### `AiController` (`/ai`)

| Method | Path | Role | Response | Notes |
| :--- | :--- | :--- | :--- | :--- |
| GET | `/ai/jobs/{id}` | Authenticated (+ job-owner check) | `ApiResponse<AiJobResponse>` | **Async job polling** — see [AI async job pattern](#ai-async-job-pattern-202-accepted--polling) |
| POST | `/ai/quizzes/generate` | Active teacher/admin | `ApiResponse<AiJobResponse>` | **202 Accepted** |
| GET | `/ai/quizzes/lesson/{lessonId}` | Active teacher/admin | `ApiResponse<List<GeneratedQuizResponse>>` | |
| PUT | `/ai/quizzes/{quizId}/questions` | Active teacher/admin | `ApiResponse<GeneratedQuizResponse>` | |
| GET | `/ai/quizzes/lesson/{lessonId}/take` | Authenticated | `ApiResponse<GeneratedQuizResponse>` | |
| POST | `/ai/quizzes/attempts` | Authenticated | `ApiResponse<QuizAttemptResponse>` | |
| GET | `/ai/quizzes/lesson/{lessonId}/my-attempts` | Authenticated | `ApiResponse<List<QuizAttemptResponse>>` | |
| GET | `/ai/summaries/lesson/{lessonId}` | Authenticated | `ApiResponse<LessonSummaryResponse>` | |
| POST | `/ai/chat/courses/{courseId}` | Authenticated | `ApiResponse<ChatResponse>` | Non-streaming RAG chat |
| POST | `/ai/chat/courses/{courseId}/stream` | Authenticated | `Flux<ServerSentEvent<String>>`, `text/event-stream` | **SSE streaming** — see [RAG chat SSE format](#rag-chat-sse-streaming-format) |
| POST | `/ai/admin/reindex-embeddings` | ADMIN | `ApiResponse<String>` | **202 Accepted**, bulk |
| POST | `/ai/admin/reindex-summaries` | ADMIN | `ApiResponse<String>` | **202 Accepted**, bulk |
| POST | `/ai/transcribe/lessons/{lessonId}` | Active teacher | `ApiResponse<AiJobResponse>` | **202 Accepted** |

### `CategoryController` (`/categories`)

| Method | Path | Role | Response | Notes |
| :--- | :--- | :--- | :--- | :--- |
| POST | `/categories` | ADMIN | `ApiResponse<CategoryResponse>` | 201 |
| PUT | `/categories/{id}` | ADMIN | `ApiResponse<CategoryResponse>` | |
| DELETE | `/categories/{id}` | ADMIN | `ApiResponse<Void>` | |
| GET | `/categories/{id}` | Public | `ApiResponse<CategoryResponse>` | |
| GET | `/categories` | Public | `ApiResponse<List<CategoryResponse>>` | |
| GET | `/categories/all` | ADMIN | `ApiResponse<List<CategoryResponse>>` | |
| GET | `/categories/with-courses` | Public | `ApiResponse<List<CategoryResponse>>` | |
| PATCH | `/categories/{id}/toggle-status` | ADMIN | `ApiResponse<CategoryResponse>` | |

### `CourseController` (`/courses`)

| Method | Path | Role | Response | Notes |
| :--- | :--- | :--- | :--- | :--- |
| POST | `/courses` | Active teacher | `ApiResponse<CourseResponse>` | 201 |
| PUT | `/courses/{id}` | Active teacher | `ApiResponse<CourseResponse>` | |
| POST | `/courses/{id}/publish` | Active teacher | `ApiResponse<CourseResponse>` | |
| DELETE | `/courses/{id}` | Active teacher/admin | `ApiResponse<Void>` | |
| GET | `/courses/{id}` | Public | `ApiResponse<CourseDetailResponse>` | |
| GET | `/courses/slug/{slug}` | Public | `ApiResponse<CourseDetailResponse>` | |
| GET | `/courses/search` | Public | `PagedResponse<CourseResponse>` | |
| GET | `/courses/filter` | Public | `PagedResponse<CourseResponse>` | |
| GET | `/courses/category/{categoryId}` | Public | `PagedResponse<CourseResponse>` | |
| GET | `/courses/instructor/{instructorId}` | Active teacher/admin | `PagedResponse<CourseResponse>` | |
| GET | `/courses/instructor/{instructorId}/picker` | Active teacher/admin | `ApiResponse<List<Map<String,Object>>>` | |
| GET | `/courses/top-rated` | Public | `PagedResponse<CourseResponse>` | |
| GET | `/courses/most-popular` | Public | `PagedResponse<CourseResponse>` | |
| GET | `/courses/newest` | Public | `PagedResponse<CourseResponse>` | |
| GET | `/courses/free` | Public | `PagedResponse<CourseResponse>` | |
| GET | `/courses/instructors/{instructorId}/stats` | Public | `ApiResponse<InstructorStatsResponse>` | |

### `CourseReviewController` (`/reviews`)

| Method | Path | Role | Response | Notes |
| :--- | :--- | :--- | :--- | :--- |
| POST | `/reviews/courses/{courseId}` | STUDENT | `ApiResponse<ReviewResponse>` | 201 |
| PUT | `/reviews/{reviewId}` | STUDENT | `ApiResponse<ReviewResponse>` | |
| DELETE | `/reviews/{reviewId}` | STUDENT, ADMIN | `ApiResponse<Void>` | |
| GET | `/reviews/{reviewId}` | Public | `ApiResponse<ReviewResponse>` | |
| GET | `/reviews/courses/{courseId}` | Public | `PagedResponse<ReviewResponse>` | |
| GET | `/reviews/courses/{courseId}/all` | Active teacher/admin | `PagedResponse<ReviewResponse>` | |
| GET | `/reviews/courses/{courseId}/my-review` | STUDENT | `ApiResponse<ReviewResponse>` | |
| GET | `/reviews/my-reviews` | STUDENT | `PagedResponse<ReviewResponse>` | |
| GET | `/reviews/pending` | Active teacher/admin | `PagedResponse<ReviewResponse>` | |
| POST | `/reviews/{reviewId}/approve` | Active teacher/admin | `ApiResponse<ReviewResponse>` | |
| DELETE | `/reviews/{reviewId}/reject` | Active teacher/admin | `ApiResponse<Void>` | |
| GET | `/reviews/courses/{courseId}/rating-distribution` | Public | `ApiResponse<RatingDistributionResponse>` | |
| GET | `/reviews/courses/{courseId}/has-reviewed` | STUDENT | `ApiResponse<Boolean>` | |
| GET | `/reviews/config/auto-approve-enabled` | Public | `ApiResponse<Boolean>` | |
| GET | `/reviews/instructor/my-reviews` | Active teacher | `PagedResponse<ReviewResponse>` | |
| GET | `/reviews/instructor/my-reviews/stats` | Active teacher | `ApiResponse<InstructorReviewsStatsResponse>` | |
| GET | `/reviews/instructor/my-reviews/courses` | Active teacher | `ApiResponse<List<Map<String,Object>>>` | |
| POST | `/reviews/{reviewId}/reply` | Active teacher | `ApiResponse<ReviewResponse>` | Create an instructor reply |
| PUT | `/reviews/{reviewId}/reply` | Active teacher | `ApiResponse<ReviewResponse>` | Update the instructor reply |
| DELETE | `/reviews/{reviewId}/reply` | Active teacher | `ApiResponse<ReviewResponse>` | Delete the instructor reply |

### `DashboardController` (`/admin/dashboard`) — ADMIN only

| Method | Path | Response |
| :--- | :--- | :--- |
| GET | `/admin/dashboard/stats` | `ApiResponse<DashboardStatsResponse>` |

### `EnrollmentController` (`/enrollments`)

| Method | Path | Role | Response | Notes |
| :--- | :--- | :--- | :--- | :--- |
| POST | `/enrollments` | STUDENT | `ApiResponse<EnrollmentResponse>` | 201 |
| GET | `/enrollments/{id}` | STUDENT, TEACHER, ADMIN (+ ownership check) | `ApiResponse<EnrollmentResponse>` | |
| GET | `/enrollments/my-enrollments` | STUDENT | `PagedResponse<EnrollmentResponse>` | |
| GET | `/enrollments/student/{studentId}` | Active teacher/admin | `PagedResponse<EnrollmentResponse>` | |
| GET | `/enrollments/courses/{courseId}` | Active teacher/admin (+ course ownership) | `PagedResponse<EnrollmentResponse>` | |
| GET | `/enrollments/my-completed` | STUDENT | `ApiResponse<List<EnrollmentResponse>>` | |
| GET | `/enrollments/my-in-progress` | STUDENT | `ApiResponse<List<EnrollmentResponse>>` | |
| GET | `/enrollments/my-recent` | STUDENT | `ApiResponse<List<EnrollmentResponse>>` | |
| GET | `/enrollments/enrolled` | STUDENT | `ApiResponse<List<Long>>` | |
| GET | `/enrollments/check/{courseId}` | STUDENT | `ApiResponse<Boolean>` | |
| GET | `/enrollments/course/{courseId}` | STUDENT | `ApiResponse<EnrollmentResponse>` | |
| GET | `/enrollments/my-stats` | STUDENT | `ApiResponse<EnrollmentStatsResponse>` | |
| POST | `/enrollments/{id}/suspend` | Active teacher/admin (+ ownership, business rules) | `ApiResponse<Void>` | |
| POST | `/enrollments/{id}/activate` | Active teacher/admin (+ ownership, business rules) | `ApiResponse<Void>` | A teacher cannot reactivate a paid enrollment |
| DELETE | `/enrollments/{id}` | Active teacher/admin | `ApiResponse<Void>` | |
| POST | `/enrollments/{id}/report-to-admin` | Active teacher/admin | `ApiResponse<Void>` | |
| GET | `/enrollments/reports/stats` | ADMIN | `ApiResponse<EnrollmentReportStatsResponse>` | |
| GET | `/enrollments/reports` | ADMIN | `PagedResponse<EnrollmentReportResponse>` | |
| POST | `/enrollments/reports/{reportId}/approve` | ADMIN | `ApiResponse<Void>` | |
| POST | `/enrollments/reports/{reportId}/reject` | ADMIN | `ApiResponse<Void>` | |

### `LessonController` (`/lessons`)

| Method | Path | Role | Response | Notes |
| :--- | :--- | :--- | :--- | :--- |
| POST | `/lessons/sections/{sectionId}` | Active teacher | `ApiResponse<LessonResponse>` | 201 |
| PUT | `/lessons/{lessonId}` | Active teacher | `ApiResponse<LessonResponse>` | |
| DELETE | `/lessons/{lessonId}` | Active teacher | `ApiResponse<Void>` | |
| GET | `/lessons/{lessonId}` | Authenticated (+ enrollment/access check) | `ApiResponse<LessonResponse>` | |
| GET | `/lessons/sections/{sectionId}` | Authenticated | `ApiResponse<List<LessonResponse>>` | Filtered by access |
| GET | `/lessons/courses/{courseId}` | Authenticated | `ApiResponse<List<LessonResponse>>` | Filtered by access |
| GET | `/lessons/courses/{courseId}/preview` | Public | `ApiResponse<List<LessonResponse>>` | |
| GET | `/lessons/{lessonId}/can-access` | Authenticated | `ApiResponse<Boolean>` | |
| PUT | `/lessons/sections/{sectionId}/reorder` | Active teacher | `ApiResponse<Void>` | |
| POST | `/lessons/{lessonId}/video/signature` | Active teacher | `ApiResponse<VideoSignatureResponse>` | |
| PATCH | `/lessons/{lessonId}/video` | Active teacher | `ApiResponse<LessonResponse>` | Confirm a completed upload |
| DELETE | `/lessons/{lessonId}/video` | Active teacher | `ApiResponse<Void>` | Delete the video |
| POST | `/lessons/{lessonId}/video/reset` | Active teacher | `ApiResponse<Void>` | |

### `LessonProgressController` (`/progress`) — all STUDENT + ownership check

| Method | Path | Response |
| :--- | :--- | :--- |
| POST | `/progress/start` | `ApiResponse<LessonProgressResponse>` |
| PUT | `/progress/watch` | `ApiResponse<LessonProgressResponse>` |
| PUT | `/progress/complete` | `ApiResponse<LessonProgressResponse>` |
| GET | `/progress/enrollment/{enrollmentId}` | `ApiResponse<List<LessonProgressResponse>>` |
| GET | `/progress/enrollment/{enrollmentId}/completed` | `ApiResponse<List<LessonProgressResponse>>` |
| GET | `/progress/check` | `ApiResponse<Boolean>` |

### `SectionController` (`/sections`)

| Method | Path | Role | Response |
| :--- | :--- | :--- | :--- |
| POST | `/sections/courses/{courseId}` | Active teacher | `ApiResponse<SectionResponse>` (201) |
| PUT | `/sections/{sectionId}` | Active teacher | `ApiResponse<SectionResponse>` |
| DELETE | `/sections/{sectionId}` | Active teacher | `ApiResponse<Void>` |
| GET | `/sections/{sectionId}` | Authenticated | `ApiResponse<SectionResponse>` |
| GET | `/sections/{sectionId}/detail` | Authenticated | `ApiResponse<SectionDetailResponse>` |
| GET | `/sections/courses/{courseId}` | Authenticated | `ApiResponse<List<SectionResponse>>` |
| GET | `/sections/courses/{courseId}/detail` | Authenticated | `ApiResponse<List<SectionDetailResponse>>` |
| PUT | `/sections/courses/{courseId}/reorder` | Active teacher | `ApiResponse<Void>` |

### `TeacherAnalyticsController` (`/teacher/analytics`) — active teacher

| Method | Path | Response |
| :--- | :--- | :--- |
| GET | `/teacher/analytics` | `ApiResponse<TeacherAnalyticsResponse>` |

### `WishlistController` (`/wishlist`) — STUDENT only

| Method | Path | Response | Notes |
| :--- | :--- | :--- | :--- |
| POST | `/wishlist/courses/{courseId}` | `ApiResponse<WishlistItemResponse>` | 201 |
| DELETE | `/wishlist/courses/{courseId}` | `ApiResponse<Void>` | |
| GET | `/wishlist` | `PagedResponse<WishlistItemResponse>` | |
| GET | `/wishlist/courses/{courseId}/check` | `ApiResponse<Boolean>` | |
| GET | `/wishlist/count` | `ApiResponse<Long>` | |
| DELETE | `/wishlist/clear` | `ApiResponse<Void>` | |

### `CertificateController` (`/certificates`)

| Method | Path | Role | Response | Notes |
| :--- | :--- | :--- | :--- | :--- |
| POST | `/certificates/{enrollmentId}/regenerate` | STUDENT, TEACHER, ADMIN (+ ownership) | `ApiResponse<Void>` | |
| GET | `/certificates/verify/{reference}` | Public | `ApiResponse<CertificateVerificationResponse>` | Student name is GDPR-redacted |
| GET | `/certificates/{enrollmentId}/download` | STUDENT, TEACHER, ADMIN (+ ownership) | Raw redirect, **302 Found** | `Location` header → Cloudinary PDF URL, not `ApiResponse` |

### `CartController` (`/cart`) — active teacher or student

| Method | Path | Response |
| :--- | :--- | :--- |
| POST | `/cart/items` | `ApiResponse<CartResponse>` |
| GET | `/cart` | `ApiResponse<CartResponse>` |
| DELETE | `/cart/items/{courseId}` | `ApiResponse<CartResponse>` |
| DELETE | `/cart` | `ApiResponse<Void>` |
| GET | `/cart/count` | `ApiResponse<Integer>` |
| GET | `/cart/check/{courseId}` | `ApiResponse<Boolean>` |

### `CheckoutController` (`/checkout`) — active teacher or student

| Method | Path | Response | Notes |
| :--- | :--- | :--- | :--- |
| POST | `/checkout/preview` | `ApiResponse<CheckoutPreviewResponse>` | |
| POST | `/checkout` | `ApiResponse<CheckoutResultResponse>` | |
| POST | `/checkout/capture?token=` | `ApiResponse<CheckoutResultResponse>` | PayPal capture |
| POST | `/checkout/cancel?orderId=` | `ApiResponse<CheckoutResultResponse>` | |
| GET | `/checkout/status/{orderId}` | `ApiResponse<CheckoutResultResponse>` | **Polling endpoint for SePay QR payments** |
| POST | `/checkout/direct/preview?courseId=` | `ApiResponse<CheckoutPreviewResponse>` | "Buy Now" preview |
| POST | `/checkout/direct` | `ApiResponse<CheckoutResultResponse>` | "Buy Now" checkout |

### `OrderController` (`/orders`) — active teacher or student

| Method | Path | Response |
| :--- | :--- | :--- |
| GET | `/orders` | `PagedResponse<OrderSummaryResponse>` |
| GET | `/orders/{id}` | `ApiResponse<OrderResponse>` |
| GET | `/orders/number/{orderNumber}` | `ApiResponse<OrderResponse>` |
| POST | `/orders/{id}/cancel` | `ApiResponse<OrderResponse>` |
| POST | `/orders/{id}/refund?reason=` | `ApiResponse<OrderResponse>` |
| GET | `/orders/count` | `ApiResponse<OrderCountResponse>` |

### `InvoiceController` (`/invoices`) — active teacher or student

| Method | Path | Response | Notes |
| :--- | :--- | :--- | :--- |
| GET | `/invoices` | `PagedResponse<InvoiceResponse>` | |
| GET | `/invoices/{id}` | `ApiResponse<InvoiceResponse>` | |
| GET | `/invoices/number/{invoiceNumber}` | `ApiResponse<InvoiceResponse>` | |
| GET | `/invoices/order/{orderId}` | `ApiResponse<InvoiceResponse>` | |
| GET | `/invoices/{id}/download` | `ResponseEntity<Resource>` (`application/pdf`) | Download disposition; not `ApiResponse` |
| GET | `/invoices/{id}/view` | `ResponseEntity<Resource>` (`application/pdf`) | Inline disposition; not `ApiResponse` |

### `EarningController` (`/teacher/earnings`) — active teacher

| Method | Path | Response | Notes |
| :--- | :--- | :--- | :--- |
| GET | `/teacher/earnings` | `PagedResponse<EarningResponse>` | |
| GET | `/teacher/earnings/summary` | `ApiResponse<EarningsSummaryResponse>` | |
| GET | `/teacher/earnings/monthly?months=` | `ApiResponse<List<MonthlyEarningResponse>>` | |
| GET | `/teacher/earnings/by-course` | `ApiResponse<List<CourseEarningResponse>>` | |
| GET | `/teacher/earnings/{id}` | `ApiResponse<EarningResponse>` | |
| GET | `/teacher/earnings/export` | `ResponseEntity<Resource>` (`text/csv`) | Not `ApiResponse` |

### `PayoutController` (`/instructors/payouts`)

| Method | Path | Role | Response |
| :--- | :--- | :--- | :--- |
| GET | `/instructors/payouts` | Active teacher/student | `PagedResponse<PayoutResponseDto>` |
| GET | `/instructors/payouts/{id}` | Active teacher/student | `ApiResponse<PayoutResponseDto>` |
| GET | `/instructors/payouts/summary` | Active teacher/student | `ApiResponse<PayoutSummaryDto>` |
| GET | `/instructors/payouts/payment-settings` | Active teacher/student | `ApiResponse<PayoutSettingsDto>` |
| PUT | `/instructors/payouts/payment-settings` | Active teacher/student | `ApiResponse<PayoutSettingsDto>` |
| GET | `/instructors/payouts/admin/pending` | ADMIN | `PagedResponse<PayoutResponseDto>` |
| GET | `/instructors/payouts/admin?status=` | ADMIN | `PagedResponse<PayoutResponseDto>` |
| POST | `/instructors/payouts/admin` | ADMIN | `ApiResponse<PayoutResponseDto>` |
| PUT | `/instructors/payouts/admin/{id}` | ADMIN | `ApiResponse<PayoutResponseDto>` |
| POST | `/instructors/payouts/admin/{id}/process` | ADMIN | `ApiResponse<PayoutResponseDto>` |
| POST | `/instructors/payouts/admin/{id}/confirm-manual-payout` | ADMIN | `ApiResponse<PayoutResponseDto>` |

### `RefundController` (`/payments/refunds`)

| Method | Path | Role | Response |
| :--- | :--- | :--- | :--- |
| POST | `/payments/refunds/request` | Active teacher/student | `ApiResponse<RefundResponseDto>` |
| GET | `/payments/refunds/policy?orderId=` | Active teacher/student | `ApiResponse<RefundPolicyResponseDto>` |
| GET | `/payments/refunds/my-refunds` | Active teacher/student | `PagedResponse<RefundResponseDto>` |
| GET | `/payments/refunds/{id}` | Active teacher/student | `ApiResponse<RefundResponseDto>` |
| GET | `/payments/refunds/by-order/{orderId}` | Active teacher/student | `ApiResponse<RefundResponseDto>` |
| GET | `/payments/refunds/admin/pending` | ADMIN | `PagedResponse<RefundResponseDto>` |
| POST | `/payments/refunds/admin/{id}/approve` | ADMIN | `ApiResponse<RefundResponseDto>` |
| POST | `/payments/refunds/admin/{id}/reject` | ADMIN | `ApiResponse<RefundResponseDto>` |
| POST | `/payments/refunds/admin/{id}/confirm-manual-refund` | ADMIN | `ApiResponse<RefundResponseDto>` |

### `WebhookController` (`/payments/webhook`) — all public (gateway callbacks, verified by signature, not JWT)

| Method | Path | Response | Notes |
| :--- | :--- | :--- | :--- |
| POST | `/payments/webhook/mock` | `{success, ...}` JSON | Dev-only mock gateway, not `ApiResponse` |
| POST | `/payments/webhook/paypal` | Plain string | PayPal IPN, verified via signature headers |
| POST | `/payments/webhook/sepay` | `{success, ...}` JSON | SePay QR bank-transfer IPN |
| GET | `/payments/webhook/health` | `{status, ...}` JSON | Health check |

**lms-core-service `SecurityConfig` summary**: public — most course/category/review *read* endpoints, lesson preview, certificate verification, payment webhooks, `/actuator/health`, `/actuator/info`. ADMIN-only — `/actuator/**` (metrics included). `/ai/jobs/**` (GET) is explicitly `.authenticated()` for job polling. Everything else falls to `anyRequest().authenticated()`, with method-level `@PreAuthorize` and manual ownership checks layered on top for STUDENT/TEACHER/ADMIN-specific rules.

---

## RAG chat SSE streaming format

`POST /ai/chat/courses/{courseId}/stream` — `Content-Type: text/event-stream`, requires authentication; the caller must be enrolled-and-active in the course or be its instructor (checked inside the service, not by `@PreAuthorize`).

Event sequence:
1. Zero or more `event: chunk` events — `data` is a raw text fragment of the streamed answer (not JSON).
2. One final `event: metadata` event — `data` is JSON:
   ```json
   {"sourceLessons": [{"id": 12, "title": "Intro to Loops"}], "confidenceTier": "HIGH"}
   ```
   `confidenceTier` is one of `HIGH` / `MEDIUM` / `GAP`.
3. On any failure (rate limit, access denied, upstream error), a single `event: error` event instead — `data`:
   ```json
   {"message": "Daily AI chat limit exceeded (20/day)."}
   ```
   The HTTP status for the stream itself is always `200` — errors are carried inside the SSE stream, not as an HTTP error code, because the client has already committed to `Accept: text/event-stream`.

Rate limit: 20 chats/day per user. A non-streaming counterpart exists at `POST /ai/chat/courses/{courseId}` returning a plain `ApiResponse<ChatResponse>` for clients that don't need streaming.

## AI async job pattern (202 Accepted + polling)

Endpoints returning `202 Accepted` with a job (or bulk job message):

| Endpoint | Role | Job type |
| :--- | :--- | :--- |
| `POST /ai/quizzes/generate` | Active teacher/admin | `QUIZ_GENERATION` |
| `POST /ai/transcribe/lessons/{lessonId}` | Active teacher | `TRANSCRIPTION` |
| `POST /ai/admin/reindex-embeddings` | ADMIN | `EMBEDDING` (bulk) |
| `POST /ai/admin/reindex-summaries` | ADMIN | `LESSON_SUMMARY` (bulk) |

Poll with `GET /ai/jobs/{id}` — only the job's owner may poll it (enforced in the controller, not just by role). Response:

```json
{
  "jobId": 123,
  "jobType": "QUIZ_GENERATION",
  "status": "PENDING",
  "userId": 45,
  "referenceId": 67,
  "errorMessage": null,
  "startedAt": null,
  "completedAt": null,
  "nextRetryAt": null,
  "createdAt": "2026-08-12T10:00:00"
}
```

- `status`: `PENDING` → `PROCESSING` → `COMPLETED` | `FAILED` | `DELAYED`. `DELAYED` (Whisper only) means a Groq `429` set `nextRetryAt`; `TranscriptionRetryScheduler` re-queues it automatically every 30s.
- `referenceId` is populated with the ID of the entity the job produced (e.g. the generated quiz) once known.
- If the AI executor's queue is full, the triggering endpoint itself returns **HTTP 429** with `{"error":"Queue Full","message":"AI processing queue is full. Please try again later."}` instead of a job.

## Error response shapes

All error responses share the same `ErrorResponse` shape from `common-lib` (`GlobalExceptionHandler`), though 401/403 responses raised directly by the security filter chain omit `timestamp`/`requestId`.

**Validation error — 400** (`@Valid` failure on a request body):
```json
{
  "status": 400,
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Validation failed for one or more fields",
  "details": ["email: must be a well-formed email address", "password: size must be between 8 and 100"],
  "fieldErrors": {"email": "must be a well-formed email address", "password": "size must be between 8 and 100"},
  "timestamp": "2026-08-12T10:00:00",
  "requestId": "a1b2c3d4",
  "path": "/auth/signup"
}
```

**Missing/invalid JWT — 401**:
```json
{
  "status": 401,
  "success": false,
  "error": "Unauthorized",
  "errorCode": "TOKEN_MISSING",
  "message": "Authentication token is required. Please provide a valid Bearer token.",
  "path": "/users/me"
}
```
(`errorCode` is `AUTH_FAILED` instead of `TOKEN_MISSING` when a token was present but invalid/expired.)

**Bad login credentials — 401**:
```json
{
  "status": 401,
  "success": false,
  "error": "INVALID_CREDENTIALS",
  "message": "Invalid username/email or password",
  "timestamp": "2026-08-12T10:00:00",
  "requestId": "e5f6a7b8",
  "path": "/auth/login"
}
```

**Authenticated but wrong role — 403**:
```json
{
  "status": 403,
  "success": false,
  "error": "Forbidden",
  "errorCode": "ACCESS_DENIED",
  "message": "You do not have permission to access this resource",
  "path": "/admin/users"
}
```

---

## Generating this from OpenAPI instead

There is no `springdoc-openapi` (or equivalent) dependency in either service yet. Adding it to `auth-service` and `lms-core-service` would generate this table automatically from the controllers and keep it from drifting — worth doing as a follow-up; until then, this file is maintained by hand against the controller source and should be re-verified against the code (`grep -r "@PreAuthorize\|@GetMapping\|@PostMapping\|@PutMapping\|@PatchMapping\|@DeleteMapping" <service>/src/main/java`) whenever routes change materially.
