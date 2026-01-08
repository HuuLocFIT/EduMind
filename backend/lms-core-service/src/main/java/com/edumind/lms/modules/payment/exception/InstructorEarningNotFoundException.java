package com.edumind.lms.modules.payment.exception;

import com.edumind.common.exception.ResourceNotFoundException;

public class InstructorEarningNotFoundException extends ResourceNotFoundException {

    public InstructorEarningNotFoundException(Long earningId) {
        super("Instructor earning not found with id: " + earningId);
    }
}

