package com.edumind.lms.modules.course.api.impl;

import com.edumind.lms.modules.course.exception.AlreadyEnrolledException;
import com.edumind.lms.modules.course.api.EnrollmentCommandService;
import com.edumind.lms.modules.course.service.EnrollmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class EnrollmentCommandServiceImpl implements EnrollmentCommandService {

    private final EnrollmentService enrollmentService;

    @Override
    @Transactional
    public void enrollStudent(Long courseId, Long studentId) {
        // Idempotency: catch AlreadyEnrolledException as a no-op instead of querying
        // the repository directly. This ensures the ACL respects any service-layer
        // caching or soft-delete filtering that EnrollmentService may add in the future.
        try {
            enrollmentService.enrollStudent(courseId, studentId);
        } catch (AlreadyEnrolledException e) {
            log.debug("Student {} already has active enrollment in course {} – skipping (idempotent)",
                    studentId, courseId);
        }
    }

    /**
     * Soft-revoke enrollment by setting status to DROPPED (idempotent).
     * Delegates to EnrollmentService.dropStudent() for consistent service-layer routing.
     */
    @Override
    @Transactional
    public void revokeEnrollment(Long courseId, Long studentId) {
        // Idempotency and null-check are handled inside dropStudent().
        enrollmentService.dropStudent(courseId, studentId);
    }
}
