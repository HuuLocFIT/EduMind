package com.edumind.lms.modules.course.scheduler;

import com.edumind.lms.modules.course.entity.Enrollment;
import com.edumind.lms.modules.course.repository.EnrollmentRepository;
import com.edumind.lms.modules.course.service.CertificateServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled job that retroactively generates certificates for COMPLETED enrollments
 * that are eligible for a certificate but haven't had one generated yet.
 *
 * This covers scenarios where the platform config changes after enrollments complete:
 * - requirePaidCourse changed from true to false (free courses become eligible)
 * - hasCertificate toggled from false to true on a course
 * - Certificate generation failed due to transient errors (Cloudinary outage, etc.)
 *
 * generateCertificate() already has idempotency (Gate 3) so duplicate calls are safe.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CertificateGenerationScheduler {

    private final EnrollmentRepository enrollmentRepository;
    private final CertificateServiceImpl certificateService;

    private static final int BATCH_SIZE = 20;

    /**
     * Runs every 10 minutes to find and generate certificates for eligible enrollments
     * that are missing them.
     */
    @Scheduled(fixedDelay = 10 * 60 * 1000)
    public void generateStalledCertificates() {
        Page<Enrollment> page = enrollmentRepository.findStalledCertificateEnrollments(PageRequest.of(0, BATCH_SIZE));

        if (page.isEmpty()) {
            log.debug("No stalled certificate enrollments found");
            return;
        }

        log.info("Found {} stalled certificate enrollments (total: {}), processing up to {}",
                page.getNumberOfElements(), page.getTotalElements(), BATCH_SIZE);

        int attempted = 0;
        int failed = 0;

        for (Enrollment enrollment : page.getContent()) {
            try {
                certificateService.generateCertificate(enrollment.getId());
                attempted++;
            } catch (Exception e) {
                log.error("Failed to generate certificate for enrollment {}", enrollment.getId(), e);
                failed++;
            }
        }

        log.info("Certificate generation batch complete: attempted={}, errors={}",
                attempted, failed);
    }
}
