package com.edumind.lms.modules.payment.exception;

import com.edumind.common.exception.BadRequestException;

public class CourseNotAvailableException extends BadRequestException {

    public CourseNotAvailableException(Long courseId) {
        super("Course with ID " + courseId + " is not available for purchase.");
    }

    public CourseNotAvailableException(String courseTitle) {
        super("\"" + courseTitle + "\" is not available for purchase.");
    }
}
