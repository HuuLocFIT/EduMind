package com.edumind.lms.modules.course.exception;

public class EnrollmentNotFoundException extends com.edumind.lms.shared.exception.ResourceNotFoundException {
    public EnrollmentNotFoundException(Long enrollmentId) {
        super("Enrollment", "id", enrollmentId);
    }

    public EnrollmentNotFoundException(Long courseId, Long studentId) {
        super(String.format("Enrollment not found for course %d and student %d", courseId, studentId));
    }
}
