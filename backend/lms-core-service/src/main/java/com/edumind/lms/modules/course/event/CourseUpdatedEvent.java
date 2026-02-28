package com.edumind.lms.modules.course.event;

import com.edumind.lms.shared.event.DomainEvent;
import lombok.Getter;

@Getter
public class CourseUpdatedEvent extends DomainEvent {
    private final Long courseId;
    private final Long instructorId;

    public CourseUpdatedEvent(Object source, Long courseId, Long instructorId) {
        super(source);
        this.courseId = courseId;
        this.instructorId = instructorId;
    }
}
