package com.edumind.lms.modules.course.api;

/**
 * Anti-corruption layer (ACL) interface for mutating enrollments from other modules.
 */
public interface EnrollmentCommandService {
    void enrollStudent(Long courseId, Long studentId);

    void revokeEnrollment(Long courseId, Long studentId);
}

