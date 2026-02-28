package com.edumind.lms.modules.course.event;

import com.edumind.lms.shared.event.DomainEvent;
import lombok.Getter;

@Getter
public class LessonStartedEvent extends DomainEvent {
    private final Long lessonId;
    private final Long courseId;
    private final Long enrollmentId;
    private final Long studentId;

    public LessonStartedEvent(Object source, Long lessonId, Long courseId, Long enrollmentId, Long studentId) {
        super(source);
        this.lessonId = lessonId;
        this.courseId = courseId;
        this.enrollmentId = enrollmentId;
        this.studentId = studentId;
    }
}
