package com.edumind.lms.modules.course.event;

import com.edumind.lms.shared.event.DomainEvent;
import lombok.Getter;

@Getter
public class LessonCompletedEvent extends DomainEvent {
    private final Long courseId;
    private final Long lessonId;
    private final Long studentId;
    private final Integer progressPercentage;

    public LessonCompletedEvent(Object source, Long courseId, Long lessonId, Long studentId, Integer progressPercentage) {
        super(source);
        this.courseId = courseId;
        this.lessonId = lessonId;
        this.studentId = studentId;
        this.progressPercentage = progressPercentage;
    }
}
