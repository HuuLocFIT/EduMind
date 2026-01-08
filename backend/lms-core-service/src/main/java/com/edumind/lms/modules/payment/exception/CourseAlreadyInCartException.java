package com.edumind.lms.modules.payment.exception;

import com.edumind.common.exception.BadRequestException;

public class CourseAlreadyInCartException extends BadRequestException {

    public CourseAlreadyInCartException(Long courseId) {
        super("Course with ID " + courseId + " is already in your cart.");
    }

    public CourseAlreadyInCartException(String courseTitle) {
        super("\"" + courseTitle + "\" is already in your cart.");
    }
}
