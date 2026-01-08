package com.edumind.lms.modules.payment.exception;

import com.edumind.common.exception.BadRequestException;

public class CourseAlreadyPurchasedException extends BadRequestException {

    public CourseAlreadyPurchasedException(Long courseId) {
        super("You have already purchased the course with ID " + courseId + ".");
    }

    public CourseAlreadyPurchasedException(String courseTitle) {
        super("You have already purchased \"" + courseTitle + "\".");
    }
}
