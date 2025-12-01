package com.edumind.lms.modules.course.event;

import com.edumind.lms.shared.event.DomainEvent;
import lombok.Getter;

@Getter
public class CourseCompletedEvent extends DomainEvent {
    private final Long courseId;
    private final Long studentId;
    private final Long enrollmentId;

    public CourseCompletedEvent(Object source, Long courseId, Long studentId, Long enrollmentId) {
        super(source);
        this.courseId = courseId;
        this.studentId = studentId;
        this.enrollmentId = enrollmentId;
    }
}
