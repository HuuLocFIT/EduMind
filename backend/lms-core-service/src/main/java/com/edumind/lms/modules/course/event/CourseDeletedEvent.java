package com.edumind.lms.modules.course.event;

import com.edumind.lms.shared.event.DomainEvent;
import lombok.Getter;

@Getter
public class CourseDeletedEvent extends DomainEvent {
    private final Long courseId;
    private final String courseTitle;
    private final Long instructorId;
    /** True when the course is soft-deleted (set to ARCHIVED). False for future hard deletes. */
    private final boolean softDelete;

    public CourseDeletedEvent(Object source, Long courseId, String courseTitle, Long instructorId, boolean softDelete) {
        super(source);
        this.courseId = courseId;
        this.courseTitle = courseTitle;
        this.instructorId = instructorId;
        this.softDelete = softDelete;
    }
}
