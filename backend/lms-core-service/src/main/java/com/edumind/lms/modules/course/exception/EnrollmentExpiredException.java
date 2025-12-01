package com.edumind.lms.modules.course.exception;

public class EnrollmentExpiredException extends com.edumind.lms.shared.exception.BadRequestException {
    public EnrollmentExpiredException(Long enrollmentId) {
        super("Enrollment " + enrollmentId + " has expired");
    }
}
