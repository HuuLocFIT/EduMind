package com.edumind.lms.modules.course.service;

import com.edumind.common.response.ApiResponse;
import com.edumind.common.service.CloudinaryService;
import com.edumind.lms.modules.course.config.CertificateConstants;
import com.edumind.lms.modules.course.dto.response.UserPublicProfileResponse;
import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.entity.Enrollment;
import com.edumind.lms.modules.course.enums.EnrollmentStatus;
import com.edumind.lms.modules.course.repository.EnrollmentRepository;
import com.edumind.lms.modules.course.repository.LessonRepository;
import com.edumind.lms.shared.client.UserClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CertificateServiceImpl {

    /*
     * == Name change behavior ==
     * If a student changes their name in auth-service after certificate issuance, the
     * certificate PDF is a static file and retains the old name. Regeneration uses the
     * new name. The existing certificate remains valid — the verification endpoint
     * always shows the current name at verification time (resolved via UserClient).
     */

    private final UserClient userClient;
    private final EnrollmentRepository enrollmentRepository;
    private final LessonRepository lessonRepository;
    private final CloudinaryService cloudinaryService;
    private final CertificatePdfGenerator certificatePdfGenerator;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    @Value("${app.certificate.require-paid-course:true}")
    private boolean requirePaidCourse;

    /**
     * Generates a certificate for a completed enrollment.
     * Performs gate checks, generates PDF, uploads to Cloudinary, and saves the enrollment.
     *
     * @param enrollmentId the enrollment to generate a certificate for
     */
    @Transactional
    public void generateCertificate(Long enrollmentId) {
        Enrollment enrollment = enrollmentRepository.findByIdForUpdate(enrollmentId)
                .orElseThrow(() -> new IllegalArgumentException("Enrollment not found: " + enrollmentId));

        Course course = enrollment.getCourse();

        /*
         * Gate 1: paid course check (configurable) with certificate enabled
         *
         * hasCertificate toggle behavior:
         * If an instructor toggles hasCertificate from true to false AFTER certificates
         * have been issued, existing certificates remain valid (URLs still work, already-
         * issued certificates are not revoked). New completions will not generate
         * certificates. Toggling back to true re-enables generation for future completions.
         *
         * requirePaidCourse behavior:
         * When true (default), only paid courses can issue certificates.
         * When false, free courses can also issue certificates (isPaid check is skipped).
         */
        if ((requirePaidCourse && !course.isPaid()) || !Boolean.TRUE.equals(course.getHasCertificate())) {
            log.warn("Certificate generation skipped for enrollment {}: requirePaidCourse={}, isPaid={}, hasCertificate={}",
                    enrollmentId, requirePaidCourse, course.isPaid(), course.getHasCertificate());
            return;
        }

        // Gate 2: enrollment must be COMPLETED
        if (enrollment.getStatus() != EnrollmentStatus.COMPLETED) {
            log.warn("Certificate generation skipped for enrollment {}: status is {}", enrollmentId, enrollment.getStatus());
            return;
        }

        // Gate 3: idempotency — skip if already generated
        if (enrollment.getCertificateUrl() != null) {
            log.info("Certificate already generated for enrollment {}, skipping", enrollmentId);
            return;
        }

        // Gate 4: completedAt must be set (defensive)
        if (enrollment.getCompletedAt() == null) {
            log.error("Cannot generate certificate for enrollment {}: completedAt is null", enrollmentId);
            throw new IllegalStateException("Enrollment " + enrollmentId + " has no completion date");
        }

        // Resolve student name
        String studentName = resolveStudentName(enrollment.getStudentId());

        // Calculate total hours
        double totalHours = calculateTotalHours(course);

        // Generate certificate reference (UUID-based)
        String certificateReference = UUID.randomUUID().toString();
        enrollment.setCertificateReference(certificateReference);

        // Generate PDF bytes (use frontend URL for verification link in PDF)
        byte[] pdfBytes = certificatePdfGenerator.generate(enrollment, studentName, totalHours, frontendUrl);

        // Upload to Cloudinary
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
            // Don't save partial state — enrollment still has certificateUrl=null,
            // the frontend will show a "Generating..." state, and the user can retry via regenerate
            return;
        }

        // Save enrollment with certificate data
        enrollment.setCertificateIssuedAt(LocalDateTime.now());
        enrollmentRepository.save(enrollment);

        log.info("Certificate generated for enrollment {}: reference={}, url={}",
                enrollmentId, certificateReference, enrollment.getCertificateUrl());
    }

    /**
     * Resolves the student's display name via the auth service.
     * Falls back to a placeholder if the service is unavailable.
     */
    private String resolveStudentName(Long studentId) {
        try {
            ApiResponse<UserPublicProfileResponse> response = userClient.getUserPublicProfile(studentId);
            if (response != null && response.getData() != null) {
                return response.getData().getDisplayName();
            }
        } catch (Exception e) {
            log.warn("Failed to fetch student profile for id {}, using fallback", studentId, e);
        }
        return "Student #" + studentId;
    }

    /**
     * Calculates total course hours from video durations, falling back to the manually-set durationHours.
     */
    private double calculateTotalHours(Course course) {
        Integer totalVideoSeconds = lessonRepository.getTotalVideoDurationByCourse(course.getId());
        if (totalVideoSeconds != null && totalVideoSeconds > 0) {
            return Math.round(totalVideoSeconds / 3600.0 * 10.0) / 10.0;
        } else {
            return course.getDurationHours() != null ? course.getDurationHours().doubleValue() : 0.0;
        }
    }

    /**
     * Regenerates a certificate for a completed enrollment.
     * Runs asynchronously — returns immediately to the caller.
     * Single transaction with pessimistic lock prevents concurrent duplicate generation.
     */
    @Async("taskExecutor")
    @Transactional
    public void regenerateCertificate(Long enrollmentId) {
        log.info("Regenerating certificate for enrollment {}", enrollmentId);

        Enrollment enrollment = enrollmentRepository.findByIdForUpdate(enrollmentId)
                .orElseThrow(() -> new IllegalArgumentException("Enrollment not found: " + enrollmentId));

        Course course = enrollment.getCourse();

        if ((requirePaidCourse && !course.isPaid()) || !Boolean.TRUE.equals(course.getHasCertificate())) {
            log.warn("Certificate regeneration skipped for enrollment {}: requirePaidCourse={}, isPaid={}, hasCertificate={}",
                    enrollmentId, requirePaidCourse, course.isPaid(), course.getHasCertificate());
            return;
        }

        if (enrollment.getStatus() != EnrollmentStatus.COMPLETED) {
            log.warn("Certificate regeneration skipped for enrollment {}: status is {}", enrollmentId, enrollment.getStatus());
            return;
        }

        if (enrollment.getCompletedAt() == null) {
            log.error("Cannot regenerate certificate for enrollment {}: completedAt is null", enrollmentId);
            return;
        }

        // Save old certificate URL for cleanup after successful regeneration
        String oldCertificateUrl = enrollment.getCertificateUrl();
        String oldPublicId = null;
        String oldResourceType = "image";
        if (oldCertificateUrl != null) {
            try {
                oldPublicId = cloudinaryService.extractPublicId(oldCertificateUrl);
                oldResourceType = cloudinaryService.extractResourceType(oldCertificateUrl);
            } catch (Exception e) {
                log.warn("Failed to extract publicId from old certificate URL: {}", e.getMessage());
            }
        }

        // Clear existing certificate data to allow regeneration
        enrollment.setCertificateUrl(null);
        enrollment.setCertificateReference(null);
        enrollment.setCertificateIssuedAt(null);
        enrollmentRepository.save(enrollment); // Flush before generateCertificate re-fetches

        // Generate and upload new certificate
        generateCertificate(enrollmentId);

        // Delete old file from Cloudinary only after new one is committed
        if (oldPublicId != null) {
            try {
                cloudinaryService.deleteFile(oldPublicId, oldResourceType);
                log.info("Deleted old certificate file {} for enrollment {} (type: {})", oldPublicId, enrollmentId, oldResourceType);
            } catch (Exception e) {
                log.warn("Failed to delete old certificate file {}: {}", oldPublicId, e.getMessage());
            }
        }
    }
}
