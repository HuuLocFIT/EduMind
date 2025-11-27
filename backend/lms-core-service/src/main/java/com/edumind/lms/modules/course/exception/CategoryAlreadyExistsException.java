package com.edumind.lms.modules.course.exception;

public class CategoryAlreadyExistsException extends com.edumind.lms.shared.exception.ConflictException {
    public CategoryAlreadyExistsException(String name) {
        super("Category with name '" + name + "' already exists");
    }
}
