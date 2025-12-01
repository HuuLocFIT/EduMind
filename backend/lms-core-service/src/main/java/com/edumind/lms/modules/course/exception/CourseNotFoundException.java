package com.edumind.lms.modules.course.exception;

public class CourseNotFoundException extends com.edumind.lms.shared.exception.ResourceNotFoundException {
    public CourseNotFoundException(Long courseId) {
        super("Course", "id", courseId);
    }

    public CourseNotFoundException(String slug) {
        super("Course", "slug", slug);
    }
}