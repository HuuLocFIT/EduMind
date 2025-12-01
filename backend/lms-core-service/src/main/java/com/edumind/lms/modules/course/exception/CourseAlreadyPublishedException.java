package com.edumind.lms.modules.course.exception;

public class CourseAlreadyPublishedException extends com.edumind.lms.shared.exception.BadRequestException {
    public CourseAlreadyPublishedException(Long courseId) {
        super("Course with id " + courseId + " is already published");
    }
}
