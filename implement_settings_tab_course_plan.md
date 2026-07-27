# Implementation Plan: Certificate Generation & Settings Tab

## Overview
Implement end-to-end certificate of completion feature:
- Add `certificate_reference` column to enrollments table for persistent UUID-based verification
- Fix `courseHasCertificate` data flow from Course → EnrollmentResponse
- Auto-generate certificate PDF (iText 8 + Cloudinary) when enrollment completes
- Student name resolution via UserClient (auth-service Feign client)
- Update CertificatesPage to filter and display certificates correctly

## Ground-Truth Findings

### Existing Schema (from V2 migration, line 163-164)
- `enrollments` table already has `certificate_issued_at TIMESTAMP` and `certificate_url VARCHAR(500)`
- **Missing**: `certificate_reference` column — must be added via new migration V39

### Enrollment Entity (Enrollment.java)
- Already has `certificateIssuedAt` (LocalDateTime, line 49) and `certificateUrl` (String, line 50)
- Already has `completedAt` (LocalDateTime, line 48)
- Does NOT have `certificateReference` field — must be added to entity

### Course Entity (Course.java)
- `hasCertificate` is `Boolean` with default `false` (line 81)
- `isPaid()` method: `price != null && price.compareTo(BigDecimal.ZERO) > 0` (line 119)
- `instructorName` is stored directly on the course (line 47) — no API call needed for instructor name
- `durationHours` is `Integer` (line 73) — a manually-set field, may be approximate

### Lesson Entity (Lesson.java)
- `videoDuration` is `Integer` seconds (line 42) — can be null

### LessonRepository (LessonRepository.java)
- `getTotalVideoDurationByCourse(Long courseId)` returns `Integer` — sums `videoDuration` for VIDEO-type lessons (line 51-52)

### UserClient (shared/client/UserClient.java)
- `getUserPublicProfile(Long userId)` returns `UserPublicProfileResponse` — contains `firstName`, `lastName`, `displayName` (line 12-13)
- `getCurrentUser()` returns `UserResponse` (line 15-16)

### CourseServiceImpl (CourseServiceImpl.java)
- Already uses `userClient.getUserPublicProfile(instructorId)` to fetch instructor profile (line 407)
- Pattern: try-catch with fallback to stub display name on failure (lines 404-420)

### Migrations
- Latest version: **V38** (`V38__Add_source_lesson_ids_to_generated_quizzes.sql`)
- Next version: **V39**

### pom.xml (iText)
- Comment on line 110 says "iText 7" but version is **8.0.5** — it's actually iText 8

### AiEventListener (ai/event/AiEventListener.java)
- Pattern to follow: `@Async("taskExecutor")` + `@Transactional(propagation = REQUIRES_NEW)` + `@TransactionalEventListener(phase = AFTER_COMMIT)` (lines 28-30, 38-40)
- Try-catch wrapping for resilience (lines 50-55)

### CourseEventListener (course/event/listener/CourseEventListener.java)
- Uses `@Async("taskExecutor")` + `@TransactionalEventListener(phase = AFTER_COMMIT, fallbackExecution = true)` (lines 29-30)
- Lesson deletion listener uses `@Transactional(propagation = REQUIRES_NEW)` (lines 93-96)

### InvoiceServiceImpl (payment/service/InvoiceServiceImpl.java)
- PDF generation pattern: generate bytes → delete old file (try-catch log warn) → upload new → save URL + publicId to entity (lines 192-229)
- Cloudinary folder: `PaymentConstants.CLOUDINARY_INVOICE_FOLDER = "documents/invoices"` (PaymentConstants.java line 37)

### CloudinaryService (common-lib)
- `uploadPdf(byte[] pdfBytes, String folder, String filename)` — uses `resource_type: "auto"` (line 75)
- `deleteFile(String publicId, String resourceType)` — resourceType: "image"/"video"/"raw" (line 227)
- `extractPublicId(String url)` — extracts public_id from Cloudinary URL (line 273)

### SecurityConfig (SecurityConfig.java)
- Pattern for public GET endpoints: `.requestMatchers(HttpMethod.GET, "/courses/slug/{slug}").permitAll()` (line 55)
- Certificate verify endpoint needs to be added here

### Gateway (api-gateway application.yml)
- No certificate route exists — new route needed for `/api/certificates/**` → LMS-CORE-SERVICE
- Pattern from existing routes: use `lb://LMS-CORE-SERVICE` with `RewritePath`

### Frontend Schemas (enrollment.schemas.ts)
- `EnrollmentResponseSchema` already has `studentName`, `studentEmail`, `studentAvatarUrl` (lines 35-37)
- **Missing**: `courseHasCertificate`, `certificateIssuedAt`, `certificateReference`

### Frontend CertificatesPage (CertificatesPage.tsx)
- Line 34 filter: `e.status === 'COMPLETED'` — missing `courseHasCertificate` check
- Lines 37-45: `handleDownload`/`handleShare` are alert stubs

### Frontend CertificateCard (CertificateCard.tsx)
- Download button exists but `onDownload` is a stub
- No regenerate button
- No loading/error state handling for null `certificateUrl`

---

## Execution Order

```
Phase 0 (Blocker) → Phase A (Blocker) → Phase B (High) → Phase C (High) → Phase D (Medium) → Phase E (Medium) → Phase F (Medium) → Phase G (Low)
```

---

## Phase 0: Database & Infrastructure (BLOCKERS)

### Task 0.1: DB Migration — Add `certificate_reference` column
- **File:** `backend/lms-core-service/src/main/resources/db/migration/V39__Add_certificate_reference_to_enrollments.sql` (NEW)
- **Action:**
  ```sql
  SET search_path TO course;

  ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS certificate_reference VARCHAR(50);

  COMMENT ON COLUMN enrollments.certificate_reference IS 'UUID-based reference for certificate verification URL. Prevents sequential enumeration.';

  CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollments_certificate_reference
  ON enrollments(certificate_reference)
  WHERE certificate_reference IS NOT NULL;
  ```
- **Note:** `VARCHAR(50)` fits a UUID string (36 chars). No NOT NULL constraint — nullable until first certificate generation.
- **Dependencies:** None
- **Severity:** BLOCKER

### Task 0.2: Gateway — Add certificate route
- **File:** `backend/api-gateway/src/main/resources/application.yml`
- **Action:** Add new route entry after enrollment-service (around line 273):
  ```yaml
  # Certificate Routes (4 endpoints)
  # STUDENT: download, regenerate certificates
  # PUBLIC: verify certificate
  # External: /api/certificates/** → Internal: /certificates/**
  - id: certificate-service
    uri: lb://LMS-CORE-SERVICE
    predicates:
      - Path=/api/certificates/**
    filters:
      - name: RequestRateLimiter
        args:
          key-resolver: "#{@ipKeyResolver}"
          redis-rate-limiter:
            replenishRate: 15
            burstCapacity: 30
            requestedTokens: 1
      - RewritePath=/api/certificates(?<segment>/?.*), /certificates${segment}
  ```
- **Dependencies:** None
- **Severity:** BLOCKER

### Task 0.3: SecurityConfig — Whitelist verify endpoint
- **File:** `backend/lms-core-service/src/main/java/com/edumind/lms/config/security/SecurityConfig.java`
- **Action:** Add after line 68 (after preview lessons permitAll):
  ```java
  // Certificate verification — public (no auth required)
  .requestMatchers(HttpMethod.GET, "/certificates/verify/{reference}").permitAll()
  ```
- **Dependencies:** 0.2
- **Severity:** BLOCKER

### Task 0.4: SecurityConfig — Rate-limit verify endpoint
- **File:** `backend/lms-core-service/src/main/java/com/edumind/lms/config/security/SecurityConfig.java`
- **Action:** No Spring Security built-in rate limiting. Instead, implement at the **controller** or **filter** level:
  - Add a `CertificateRateLimiter` service using a `ConcurrentHashMap<String, RateLimit>` with 10 requests/min per IP
  - Or use a `Bucket4j` / Guava `RateLimiter` approach
  - Alternatively: rely on Gateway rate limiting (already configured in 0.2 with `replenishRate: 15, burstCapacity: 30`) which applies IP-based rate limiting
- **Decision:** Gateway rate limiting is sufficient for the verify endpoint. No additional service-level rate limiter needed.
- **Dependencies:** 0.2
- **Severity:** MEDIUM

---

## Phase A: Fix `courseHasCertificate` Data Flow (BLOCKER)

### Task A1: Backend — Add `courseHasCertificate` and `certificateIssuedAt` to `EnrollmentResponse`
- **File:** `backend/lms-core-service/src/main/java/com/edumind/lms/modules/course/dto/response/EnrollmentResponse.java`
- **Action:**
  - Add `private Boolean courseHasCertificate;` field
  - Add `private LocalDateTime certificateIssuedAt;` field
  - Add `private String certificateReference;` field
- **Dependencies:** 0.1
- **Severity:** BLOCKER

### Task A2: Backend — Map new fields in `EnrollmentMapper`
- **File:** `backend/lms-core-service/src/main/java/com/edumind/lms/modules/course/util/EnrollmentMapper.java`
- **Action:** In `toResponse()` builder, add:
  ```java
  .courseHasCertificate(enrollment.getCourse().getHasCertificate())
  .certificateIssuedAt(enrollment.getCertificateIssuedAt())
  .certificateReference(enrollment.getCertificateReference())
  ```
  Add after line 40 (after `.suspensionReason(...)`)
- **Dependencies:** A1
- **Severity:** BLOCKER

### Task A3: Backend — Add `certificateReference` to `Enrollment` entity
- **File:** `backend/lms-core-service/src/main/java/com/edumind/lms/modules/course/entity/Enrollment.java`
- **Action:** Add after line 50 (after `certificateUrl`):
  ```java
  @Column(length = 50)
  private String certificateReference;
  ```
- **Dependencies:** 0.1
- **Severity:** BLOCKER

### Task A4: Backend — Resolve student name via `UserClient`
- **File:** `backend/lms-core-service/src/main/java/com/edumind/lms/modules/course/service/CertificateServiceImpl.java` (NEW, see B2)
- **Action:** At generation time, call:
  ```java
  ApiResponse<UserPublicProfileResponse> response = userClient.getUserPublicProfile(enrollment.getStudentId());
  String studentName = (response != null && response.getData() != null)
      ? response.getData().getDisplayName()
      : "Student #" + enrollment.getStudentId();
  ```
  Follow the pattern from `CourseServiceImpl.fetchInstructorProfile()` (lines 404-420): try-catch with fallback to stub name.
- **Note:** `UserClient` field already available on `CourseServiceImpl` — need to inject into new `CertificateServiceImpl` as well.
- **Dependencies:** A3
- **Severity:** BLOCKER

### Task A5: Frontend — Add new fields to `EnrollmentResponseSchema`
- **File:** `frontend/libs/shared/types/src/lib/enrollment.schemas.ts`
- **Action:** Add to `EnrollmentResponseSchema`:
  ```typescript
  courseHasCertificate: z.boolean().optional().nullable(),
  certificateIssuedAt: z.string().optional().nullable(),
  certificateReference: z.string().optional().nullable(),
  ```
  Add after existing `certificateUrl` field (line 50).
- **Dependencies:** A1
- **Severity:** BLOCKER

### Task A6: Frontend — Fix `CertificatesPage` filter logic
- **File:** `frontend/apps/user/src/app/pages/learning/CertificatesPage.tsx`
- **Action:** Line 34: Change filter from:
  ```typescript
  return enrollments.filter((e: EnrollmentResponse) => e.status === 'COMPLETED');
  ```
  to:
  ```typescript
  return enrollments.filter((e: EnrollmentResponse) => e.status === 'COMPLETED' && e.courseHasCertificate);
  ```
- **Dependencies:** A5
- **Severity:** BLOCKER

### Task A7: Frontend — Update empty state message
- **File:** `frontend/apps/user/src/app/pages/learning/CertificatesPage.tsx`
- **Action:** Lines 84-86: Update empty state text to:
  ```tsx
  <p className="text-gray-600 mb-6">
    Complete a paid course with certificate enabled to earn your certificate
  </p>
  ```
- **Dependencies:** A6
- **Severity:** MEDIUM

---

## Phase B: Backend — Certificate Generation (HIGH)

### Task B1: Create `CertificateConstants`
- **File:** `backend/lms-core-service/src/main/java/com/edumind/lms/modules/course/config/CertificateConstants.java` (NEW)
- **Action:**
  ```java
  package com.edumind.lms.modules.course.config;

  public final class CertificateConstants {
      private CertificateConstants() {}

      public static final String CLOUDINARY_CERTIFICATE_FOLDER = "documents/certificates";
      public static final String VERIFICATION_BASE_PATH = "/certificates/verify/";
  }
  ```
- **Note:** Folder follows the `documents/` prefix pattern from `PaymentConstants.CLOUDINARY_INVOICE_FOLDER = "documents/invoices"`.
- **Dependencies:** None
- **Severity:** HIGH

### Task B2: Create `CertificatePdfGenerator`
- **File:** `backend/lms-core-service/src/main/java/com/edumind/lms/modules/course/service/CertificatePdfGenerator.java` (NEW)
- **Action:** Generate iText 8 PDF with:
  - **Header:** "Certificate of Completion" (bold, large, centered)
  - **Course title:** from enrollment (bold, large)
  - **Student name:** passed as parameter (resolved by CertificateServiceImpl via UserClient)
  - **Instructor name:** `enrollment.getCourse().getInstructorName()` (stored on course entity — no API call needed)
  - **Completion date:** `enrollment.getCompletedAt()`, formatted as `MMMM dd, yyyy`
  - **Total course hours:** passed as `double totalHours` parameter (calculated by CertificateServiceImpl)
  - **Certificate reference:** `enrollment.getCertificateReference()` (UUID, formatted in uppercase)
  - **Verification URL:** `{baseUrl}/certificates/verify/{reference}` (baseUrl from application config or property)
  - **Footer disclaimer** (strengthened):
    > "EduMind is not an accredited institution. This certificate of completion is not an official degree, diploma, or professional certification. It demonstrates skills and accomplishments in the stated course and cannot be used for formal academic or professional accreditation purposes."
  - **Design:** Clean layout with EduMind branding. Use Helvetica fonts (StandardFonts) consistent with InvoiceServiceImpl pattern.
- **Method signature:**
  ```java
  public byte[] generate(Enrollment enrollment, String studentName, double totalHours, String verificationBaseUrl)
  ```
- **Dependencies:** iText 8 already in pom.xml (kernel 8.0.5, layout 8.0.5, io 8.0.5)
- **Severity:** HIGH

### Task B3: Create `CertificateServiceImpl`
- **File:** `backend/lms-core-service/src/main/java/com/edumind/lms/modules/course/service/CertificateServiceImpl.java` (NEW)
- **Logic:**
  1. **Load enrollment:** `enrollmentRepository.findById(enrollmentId)` — uses `EntityGraph("Enrollment.withCourse")` so course is eagerly loaded
  2. **Gate check — paid course with certificate:**
     ```java
     Course course = enrollment.getCourse();
     if (!course.isPaid() || !Boolean.TRUE.equals(course.getHasCertificate())) {
         log.warn("Certificate generation skipped for enrollment {}: isPaid={}, hasCertificate={}",
                 enrollmentId, course.isPaid(), course.getHasCertificate());
         return;
     }
     ```
  3. **Gate check — enrollment is COMPLETED:**
     ```java
     if (enrollment.getStatus() != EnrollmentStatus.COMPLETED) {
         log.warn("Certificate generation skipped for enrollment {}: status is {}", enrollmentId, enrollment.getStatus());
         return;
     }
     ```
  4. **Idempotency guard:**
     ```java
     if (enrollment.getCertificateUrl() != null) {
         log.info("Certificate already generated for enrollment {}, skipping", enrollmentId);
         return;
     }
     ```
  5. **Resolve student name:**
     ```java
     String studentName;
     try {
         ApiResponse<UserPublicProfileResponse> response = userClient.getUserPublicProfile(enrollment.getStudentId());
         studentName = (response != null && response.getData() != null)
             ? response.getData().getDisplayName()
             : "Student #" + enrollment.getStudentId();
     } catch (Exception e) {
         log.warn("Failed to fetch student profile for id {}, using fallback", enrollment.getStudentId(), e);
         studentName = "Student #" + enrollment.getStudentId();
     }
     ```
  6. **Calculate total hours:**
     ```java
     double totalHours;
     Integer totalVideoSeconds = lessonRepository.getTotalVideoDurationByCourse(enrollment.getCourse().getId());
     if (totalVideoSeconds != null && totalVideoSeconds > 0) {
         totalHours = Math.round(totalVideoSeconds / 3600.0 * 10.0) / 10.0; // Round to 1 decimal
     } else {
         // Fallback to course.durationHours
         totalHours = course.getDurationHours() != null ? course.getDurationHours().doubleValue() : 0.0;
     }
     ```
  7. **Generate reference (UUID-based):**
     ```java
     String certificateReference = UUID.randomUUID().toString().toUpperCase();
     enrollment.setCertificateReference(certificateReference);
     ```
     - UUID prevents sequential enumeration (no `CERT-{enrollmentId}-{random}` pattern).
  8. **Generate PDF:**
     ```java
     byte[] pdfBytes = certificatePdfGenerator.generate(
         enrollment, studentName, totalHours, verificationBaseUrl);
     ```
  9. **Upload to Cloudinary:**
     ```java
     try {
         String filename = certificateReference;
         var uploadResult = cloudinaryService.uploadPdf(
             pdfBytes,
             CertificateConstants.CLOUDINARY_CERTIFICATE_FOLDER,
             filename
         );
         enrollment.setCertificateUrl(uploadResult.getUrl());
     } catch (Exception e) {
         log.error("Failed to upload certificate PDF to Cloudinary for enrollment {}: {}",
                 enrollmentId, e.getMessage(), e);
         // Don't re-throw — leave certificateUrl null so regenerate endpoint can retry
         enrollmentRepository.save(enrollment); // Save the reference at least
         return;
     }
     ```
  10. **Save enrollment:**
      ```java
      enrollment.setCertificateIssuedAt(LocalDateTime.now());
      // certificateUrl already set from Cloudinary upload
      // certificateReference already set
      enrollmentRepository.save(enrollment);
      log.info("Certificate generated for enrollment {}: reference={}, url={}",
              enrollmentId, certificateReference, enrollment.getCertificateUrl());
      ```
- **Dependencies:** A1, A3, A4, B1, B2, 0.1
- **Severity:** HIGH

### Task B4: Create `CertificateEventListener`
- **File:** `backend/lms-core-service/src/main/java/com/edumind/lms/modules/course/event/listener/CertificateEventListener.java` (NEW)
- **Action:** Follow the `AiEventListener` pattern exactly:
  ```java
  @Slf4j
  @Component
  @RequiredArgsConstructor
  public class CertificateEventListener {

      private final CertificateServiceImpl certificateService;

      @Async("taskExecutor")
      @Transactional(propagation = Propagation.REQUIRES_NEW)
      @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
      public void onCourseCompleted(CourseCompletedEvent event) {
          log.info("Processing certificate generation for enrollment {}", event.getEnrollmentId());
          try {
              certificateService.generateCertificate(event.getEnrollmentId());
          } catch (Exception e) {
              log.error("Certificate generation failed for enrollment {}: {}",
                      event.getEnrollmentId(), e.getMessage(), e);
              // Don't re-throw — prevent event loop
          }
      }
  }
  ```
- **Key decisions:**
  - `@Async("taskExecutor")` — uses the shared async executor (core=10, max=20, queue=50), non-blocking
  - `@Transactional(propagation = REQUIRES_NEW)` — new transaction so the event processor doesn't block the completion transaction or get rolled back
  - `@TransactionalEventListener(phase = AFTER_COMMIT)` — only fires after the enrollment completion transaction has successfully committed
  - **NOT** using `fallbackExecution = true` — certificate generation should only fire on successful commit, not in a no-transaction context
  - Try-catch wrapping prevents the error from propagating and blocking other listeners
- **Dependencies:** B3
- **Severity:** HIGH

### Task B5: Create `CertificateController`
- **File:** `backend/lms-core-service/src/main/java/com/edumind/lms/modules/course/controller/CertificateController.java` (NEW)
- **Endpoints:**

  1. **Regenerate certificate:**
     ```java
     @PostMapping("/certificates/{enrollmentId}/regenerate")
     public ResponseEntity<ApiResponse<EnrollmentResponse>> regenerateCertificate(
             @PathVariable Long enrollmentId,
             Authentication authentication) {
         // Authorization: only owning student OR course instructor
         Long userId = getUserIdFromAuth(authentication);
         Enrollment enrollment = enrollmentService.getEnrollmentById(enrollmentId);

         // Check: student owns enrollment OR user is the course instructor
         if (!enrollment.getStudentId().equals(userId)
                 && !enrollment.getCourse().getInstructorId().equals(userId)) {
             throw new UnauthorizedException("Not authorized to regenerate this certificate");
         }

         // Check: enrollment must be COMPLETED and course has certificate enabled
         if (enrollment.getStatus() != EnrollmentStatus.COMPLETED) {
             throw new BadRequestException("Enrollment is not completed");
         }
         if (!Boolean.TRUE.equals(enrollment.getCourse().getHasCertificate())) {
             throw new BadRequestException("Course does not offer certificates");
         }

         // Delete old PDF from Cloudinary before regenerating
         if (enrollment.getCertificateUrl() != null) {
             try {
                 String publicId = cloudinaryService.extractPublicId(enrollment.getCertificateUrl());
                 cloudinaryService.deleteFile(publicId, "raw");
             } catch (Exception e) {
                 log.warn("Failed to delete old certificate PDF: {}", e.getMessage());
             }
         }

         // Clear existing certificate data to allow re-generation
         enrollment.setCertificateUrl(null);
         enrollment.setCertificateReference(null);
         enrollment.setCertificateIssuedAt(null);
         enrollmentRepository.save(enrollment);

         // Trigger generation (runs async via the same listener pattern)
         certificateService.generateCertificate(enrollmentId);

         return ResponseEntity.ok(ApiResponse.success("Certificate regeneration initiated"));
     }
     ```

  2. **Verify certificate (public):**
     ```java
     @GetMapping("/certificates/verify/{reference}")
     public ResponseEntity<ApiResponse<CertificateVerificationResponse>> verifyCertificate(
             @PathVariable String reference) {
         Enrollment enrollment = enrollmentRepository.findByCertificateReference(reference)
                 .orElseThrow(() -> new ResourceNotFoundException("Certificate not found"));

         // GDPR consideration: only show first name + last initial publicly
         String studentNameRedacted;
         try {
             ApiResponse<UserPublicProfileResponse> response = userClient.getUserPublicProfile(enrollment.getStudentId());
             if (response != null && response.getData() != null) {
                 String firstName = response.getData().getFirstName();
                 String lastName = response.getData().getLastName();
                 String lastInitial = (lastName != null && !lastName.isEmpty())
                     ? lastName.charAt(0) + "."
                     : "";
                 studentNameRedacted = firstName + " " + lastInitial;
             } else {
                 studentNameRedacted = "Student";
             }
         } catch (Exception e) {
             studentNameRedacted = "Student";
         }

         return ResponseEntity.ok(ApiResponse.success(
             CertificateVerificationResponse.builder()
                 .courseTitle(enrollment.getCourse().getTitle())
                 .studentName(studentNameRedacted) // Only first name + last initial
                 .instructorName(enrollment.getCourse().getInstructorName())
                 .completionDate(enrollment.getCompletedAt())
                 .certificateIssuedAt(enrollment.getCertificateIssuedAt())
                 .isValid(enrollment.getStatus() == EnrollmentStatus.COMPLETED
                     && enrollment.getCertificateUrl() != null)
                 .build()));
     }
     ```

  3. **Download certificate:**
     - No dedicated download endpoint needed — the `certificateUrl` field in EnrollmentResponse points directly to the Cloudinary PDF. Frontend opens this URL directly.
     - But optionally add:
     ```java
     @GetMapping("/certificates/{enrollmentId}/download")
     public ResponseEntity<?> downloadCertificate(
             @PathVariable Long enrollmentId,
             Authentication authentication) {
         // Authorization: only owning student or course instructor
         Long userId = getUserIdFromAuth(authentication);
         Enrollment enrollment = enrollmentService.getEnrollmentById(enrollmentId);
         if (!enrollment.getStudentId().equals(userId)
                 && !enrollment.getCourse().getInstructorId().equals(userId)) {
             throw new UnauthorizedException("Not authorized");
         }
         if (enrollment.getCertificateUrl() == null) {
             throw new ResourceNotFoundException("Certificate not yet generated");
         }
         // Redirect to Cloudinary URL
         return ResponseEntity.status(HttpStatus.FOUND)
                 .header(HttpHeaders.LOCATION, enrollment.getCertificateUrl())
                 .build();
     }
     ```

- **Dependencies:** B3, 0.1, 0.3
- **Severity:** HIGH

### Task B6: Repository — Add `findByCertificateReference`
- **File:** `backend/lms-core-service/src/main/java/com/edumind/lms/modules/course/repository/EnrollmentRepository.java`
- **Action:** Add:
  ```java
  @EntityGraph("Enrollment.withCourse")
  Optional<Enrollment> findByCertificateReference(String certificateReference);
  ```
- **Dependencies:** 0.1, A3
- **Severity:** HIGH

### Task B7: Create `CertificateVerificationResponse` DTO
- **File:** `backend/lms-core-service/src/main/java/com/edumind/lms/modules/course/dto/response/CertificateVerificationResponse.java` (NEW)
- **Action:**
  ```java
  @Data @Builder @NoArgsConstructor @AllArgsConstructor
  public class CertificateVerificationResponse {
      private String courseTitle;
      private String studentName;      // First name + last initial (GDPR)
      private String instructorName;
      private LocalDateTime completionDate;
      private LocalDateTime certificateIssuedAt;
      private boolean isValid;
  }
  ```
- **Dependencies:** None
- **Severity:** HIGH

---

## Phase C: Frontend — Certificate Download & Share (HIGH)

### Task C1: Create `certificate.service.ts`
- **File:** `frontend/apps/user/src/app/services/certificate.service.ts` (NEW)
- **Action:**
  ```typescript
  import { apiClient } from './api-client.service.js';
  import { CERTIFICATE_ENDPOINTS } from '@edumind/shared-utils';

  export const certificateService = {
    async regenerateCertificate(enrollmentId: number): Promise<void> {
      await apiClient.post(CERTIFICATE_ENDPOINTS.REGENERATE(enrollmentId));
    },

    async verifyCertificate(reference: string): Promise<CertificateVerificationResponse> {
      const response = await apiClient.get<CertificateVerificationResponse>(
        CERTIFICATE_ENDPOINTS.VERIFY(reference)
      );
      return response.data;
    },
  };
  ```
- **Dependencies:** B5 (endpoint URLs needed)
- **Severity:** HIGH

### Task C2: Add `CERTIFICATE_ENDPOINTS` to shared constants
- **File:** `frontend/libs/shared/utils/src/lib/api-endpoints.ts`
- **Action:** Add:
  ```typescript
  export const CERTIFICATE_ENDPOINTS = {
    REGENERATE: (enrollmentId: number | string) =>
      `${API_URL}/certificates/${enrollmentId}/regenerate`,
    VERIFY: (reference: string) =>
      `${API_URL}/certificates/verify/${reference}`,
    DOWNLOAD: (enrollmentId: number | string) =>
      `${API_URL}/certificates/${enrollmentId}/download`,
  };
  ```
- **Dependencies:** None
- **Severity:** HIGH

### Task C3: Update `CertificateCard` — real download
- **File:** `frontend/apps/user/src/app/components/course-module/CertificateCard.tsx`
- **Action:**
  - Replace `handleDownload` stub with:
    ```typescript
    const handleDownload = () => {
      if (enrollment.certificateUrl) {
        window.open(enrollment.certificateUrl, '_blank');
      }
    };
    ```
  - Add loading state: show spinner if `certificateUrl` is null and `status === 'COMPLETED'` (certificate still generating)
  - Add error state: show "Certificate not yet generated" message if `certificateUrl` is null
- **Dependencies:** A5
- **Severity:** HIGH

### Task C4: Update `CertificateCard` — add regenerate button
- **File:** `frontend/apps/user/src/app/components/course-module/CertificateCard.tsx`
- **Action:**
  - Add regenerate button (available for ALL COMPLETED enrollments with `courseHasCertificate === true`, regardless of `progressPercentage`):
    ```tsx
    <Button
      variant="secondary"
      onClick={handleRegenerate}
      size="sm"
      disabled={isRegenerating}
    >
      <RefreshCw className={`w-4 h-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
      Regenerate
    </Button>
    ```
  - Wire up to `certificateService.regenerateCertificate(enrollmentId)`
  - Add `isRegenerating` state for loading feedback
- **Dependencies:** C1, C2
- **Severity:** HIGH

### Task C5: Update `CertificateCard` — share functionality
- **File:** `frontend/apps/user/src/app/components/course-module/CertificateCard.tsx`
- **Action:** Replace `handleShare` stub:
  ```typescript
  const handleShare = () => {
    const verifyUrl = `${window.location.origin}/certificates/verify/${enrollment.certificateReference}`;
    navigator.clipboard.writeText(verifyUrl).then(() => {
      // Show toast: "Verification link copied!"
    });
  };
  ```
- **Dependencies:** A5 (certificateReference field)
- **Severity:** MEDIUM

### Task C6: Frontend — Add `certificateIssuedAt` display on CertificateCard
- **File:** `frontend/apps/user/src/app/components/course-module/CertificateCard.tsx`
- **Action:** Display `certificateIssuedAt` next to completedAt:
  ```tsx
  {enrollment.certificateIssuedAt && (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <Calendar className="w-4 h-4" />
      <span>Issued: {formatDate(enrollment.certificateIssuedAt)}</span>
    </div>
  )}
  ```
- **Dependencies:** A5
- **Severity:** MEDIUM

---

## Phase D: ToS & Legal (MEDIUM)

### Task D1: Update Terms of Service
- **File:** Not in this repo (likely a separate content file or DB-driven page)
- **Action:** Add clause about certificates:
  > "EduMind certificates of completion are not accredited degrees, diplomas, or professional certifications. They represent skills and knowledge demonstrated by completing course requirements. Certificates should not be used for formal academic credit or professional licensure purposes."
- **Dependencies:** None
- **Severity:** MEDIUM

### Task D2: Add opt-out toggle for public certificate verification
- **File:** `backend/lms-core-service/src/main/java/com/edumind/lms/modules/course/entity/Enrollment.java`
- **Decision:** Deferred to future work. Current implementation redacts student name to first name + last initial on verification page. A full opt-out toggle (hide certificate from public verification) would require a new column `certificate_public_visible BOOLEAN DEFAULT true` — add to future milestone.
- **Severity:** MEDIUM (not implemented now, documented for future)

---

## Phase E: Documentation & Decisions (MEDIUM)

### Task E1: Document `hasCertificate` toggle behavior
- **Decision:** If an instructor toggles `hasCertificate` from `true` to `false` AFTER certificates have been issued, existing certificates remain valid (URLs still work, already-issued certificates don't get revoked). New completions won't generate certificates. Toggling back to `true` re-enables generation for future completions.
- **Action:** Add code comment in `CertificateServiceImpl.generateCertificate()` documenting this behavior.
- **Severity:** MEDIUM

### Task E2: Document name change behavior
- **Decision:** If a student changes their name in auth-service after certificate issuance, the certificate PDF will show the old name (it's a static file). Regeneration will use the new name. The existing certificate remains valid — the verification endpoint will show the current name at verification time.
- **Action:** Add code comment in `CertificateServiceImpl` documenting this.
- **Severity:** MEDIUM

---

## Phase F: Frontend Polish (LOW)

### Task F1: Loading state for CertificatesPage during certificate generation
- **File:** `frontend/apps/user/src/app/pages/learning/CertificatesPage.tsx`
- **Action:** When enrollment is COMPLETED, has `courseHasCertificate === true`, but `certificateUrl` is null → show "Generating certificate..." loading indicator on CertificateCard
- **Dependencies:** C3
- **Severity:** LOW

### Task F2: Toast notifications for certificate actions
- **File:** `frontend/apps/user/src/app/components/course-module/CertificateCard.tsx`
- **Action:** Show toast on:
  - Regenerate initiated: "Certificate regeneration started — this may take a moment"
  - Share link copied: "Verification link copied to clipboard"
  - Download error: "Certificate not yet available"
- **Dependencies:** None
- **Severity:** LOW

---

## Phase G: Fixes & Test Plan (LOW)

### Task G1: Fix pom.xml comment (iText version)
- **File:** `backend/lms-core-service/pom.xml`
- **Action:** Line 110: Change comment from `<!-- iText 7 for PDF generation -->` to `<!-- iText 8 for PDF generation -->`
- **Dependencies:** None
- **Severity:** LOW

### Task G2: Test Plan

| # | Test Case | Verification |
|---|-----------|-------------|
| 1 | Enrollment API returns `courseHasCertificate`, `certificateIssuedAt`, `certificateReference` fields | GET /api/enrollments/:id |
| 2 | `certificateReference` is null for enrollments without certificates | Check nullable |
| 3 | `CertificatesPage` only shows COMPLETED + `courseHasCertificate = true` enrollments | Filter works |
| 4 | Certificate PDF auto-generates on course completion (async, non-blocking) | Check Cloudinary after completion |
| 5 | Certificate PDF contains: course title, student name (from UserClient), instructor name, total hours, completion date, reference, verification URL, strengthened disclaimer | Open PDF and verify all fields |
| 6 | Total hours = sum of videoDuration / 3600 rounded to 1 decimal; falls back to course.durationHours | Test with video-only, mixed, and article-only courses |
| 7 | Certificate NOT generated for: free courses, `hasCertificate=false`, SUSPENDED/DROPPED enrollments | Negative test cases |
| 8 | PDF uploaded to `documents/certificates/` folder on Cloudinary | Check Cloudinary dashboard |
| 9 | `certificateUrl`, `certificateIssuedAt`, `certificateReference` saved to enrollment after generation | Check enrollment record |
| 10 | Download button opens Cloudinary PDF URL in new tab | Click download |
| 11 | Regenerate: authorized for owning student AND course instructor | Test both roles |
| 12 | Regenerate: deletes old Cloudinary PDF before uploading new one | Check Cloudinary after regenerate |
| 13 | Regenerate: works for ALL COMPLETED enrollments with `courseHasCertificate=true` (regardless of progress %) | Test with various progress values |
| 14 | Verify endpoint returns redacted student name (first name + last initial) | GET /api/certificates/verify/:reference |
| 15 | Verify endpoint returns `isValid=false` for SUSPENDED/DROPPED enrollments | Test with different statuses |
| 16 | Idempotency: calling generateCertificate twice doesn't create duplicate PDFs | Check Cloudinary |
| 17 | Cloudinary upload failure: doesn't crash, certUrl stays null, regenerate endpoint retries | Simulate Cloudinary failure |
| 18 | Gateway rate limiting applies to `/api/certificates/**` routes | Test with load tool |
| 19 | Certificate URL hidden for SUSPENDED/DROPPED in EnrollmentMapper (existing logic) | Verify mapper logic |
| 20 | Re-enrollment after DROP clears certificate data (existing logic in `enrollStudent()`) | Verify re-enrollment flow |
| 21 | UserClient failure doesn't crash generation — falls back to "Student #{id}" | Test with auth-service down |
| 22 | Empty state message updated on CertificatesPage | Check empty state text |

---

## Verification Checklist (Updated)

- [ ] DB migration V39 adds `certificate_reference` column with unique index
- [ ] Gateway routes `/api/certificates/**` to LMS-CORE-SERVICE
- [ ] SecurityConfig whitelists `GET /certificates/verify/{reference}` as public
- [ ] EnrollmentResponse returns `courseHasCertificate`, `certificateIssuedAt`, `certificateReference`
- [ ] `CertificatesPage` only shows COMPLETED + `courseHasCertificate` enrollments
- [ ] Student name resolved via `UserClient.getUserPublicProfile()` with try-catch fallback
- [ ] Certificate PDF auto-generates on course completion (async, non-blocking)
- [ ] Certificate PDF contains all required fields (student, instructor, hours, date, strengthened disclaimer)
- [ ] Total hours: sum of `videoDuration` across course lessons, converted to hours, rounded to 1 decimal; fallback to `course.durationHours`
- [ ] PDF uploaded to Cloudinary under `documents/certificates/`
- [ ] `certificateUrl`, `certificateIssuedAt`, and `certificateReference` saved to enrollment
- [ ] Listener pattern: `@Async("taskExecutor")` + `@Transactional(REQUIRES_NEW)` + `@TransactionalEventListener(AFTER_COMMIT)`
- [ ] Cloudinary upload failure handled with try-catch + log error (regenerate serves as manual retry)
- [ ] Regenerate: authorized for owning student OR course instructor
- [ ] Regenerate: deletes old Cloudinary PDF before uploading new
- [ ] Regenerate: available for ALL COMPLETED enrollments with `courseHasCertificate=true`
- [ ] Idempotency guard: skips if `certificateUrl != null`
- [ ] Certificate reference is UUID-based (not sequential)
- [ ] Verification endpoint: public, shows first name + last initial (GDPR)
- [ ] Verification endpoint: `isValid=false` for non-COMPLETED statuses
- [ ] Download button opens Cloudinary PDF URL
- [ ] Share button copies verification URL to clipboard
- [ ] `certificateIssuedAt` displayed on CertificateCard
- [ ] ToS updated with certificate disclaimer
- [ ] pom.xml comment fixed: "iText 8" not "iText 7"
- [ ] Certificate data cleared on re-enrollment (existing logic — verified correct)
- [ ] Certificate hidden for SUSPENDED/DROPPED enrollments (existing mapper logic — verified correct)
