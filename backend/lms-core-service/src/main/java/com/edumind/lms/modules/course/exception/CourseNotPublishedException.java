package com.edumind.lms.modules.course.exception;

public class CourseNotPublishedException extends com.edumind.lms.shared.exception.BadRequestException {
    public CourseNotPublishedException(Long courseId) {
        super("Course with id " + courseId + " is not published yet");
    }
}