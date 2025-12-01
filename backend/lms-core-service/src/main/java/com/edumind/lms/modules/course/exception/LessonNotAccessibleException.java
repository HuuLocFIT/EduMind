package com.edumind.lms.modules.course.exception;

public class LessonNotAccessibleException extends com.edumind.lms.shared.exception.UnauthorizedException {
    public LessonNotAccessibleException(Long lessonId) {
        super("Lesson " + lessonId + " requires enrollment to access");
    }
}