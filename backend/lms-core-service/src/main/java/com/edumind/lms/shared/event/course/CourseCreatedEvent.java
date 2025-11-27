package com.edumind.lms.shared.event.course;

import com.edumind.lms.shared.event.DomainEvent;
import lombok.Getter;

@Getter
public class CourseCreatedEvent extends DomainEvent {
    private final Long courseId;
    private final String courseTitle;
    private final Long instructorId;

    public CourseCreatedEvent(Object source, Long courseId, String courseTitle, Long instructorId) {
        super(source);
        this.courseId = courseId;
        this.courseTitle = courseTitle;
        this.instructorId = instructorId;
    }
}
