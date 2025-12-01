package com.edumind.lms.modules.course.exception;

public class CategoryNotFoundException extends com.edumind.lms.shared.exception.ResourceNotFoundException {
    public CategoryNotFoundException(Long categoryId) {
        super("Category", "id", categoryId);
    }

    public CategoryNotFoundException(String slug) {
        super("Category", "slug", slug);
    }
}
