package com.edumind.lms.modules.course.exception;

public class LessonNotFoundException extends com.edumind.lms.shared.exception.ResourceNotFoundException {
    public LessonNotFoundException(Long lessonId) {
        super("Lesson", "id", lessonId);
    }
}
