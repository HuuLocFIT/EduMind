package com.edumind.lms.modules.course.exception;

public class UnauthorizedCourseAccessException extends com.edumind.lms.shared.exception.UnauthorizedException {
    public UnauthorizedCourseAccessException(Long courseId, Long userId) {
        super("User " + userId + " is not authorized to access course " + courseId);
    }
}
