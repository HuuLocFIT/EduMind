package com.edumind.lms.modules.course.exception;

public class AlreadyEnrolledException extends com.edumind.lms.shared.exception.ConflictException {
    public AlreadyEnrolledException(Long courseId, Long studentId) {
        super("Student " + studentId + " is already enrolled in course " + courseId);
    }
}
