package com.edumind.lms.modules.course.event;

import com.edumind.lms.shared.event.DomainEvent;
import lombok.Getter;

@Getter
public class CourseArchivedEvent extends DomainEvent {
    private final Long courseId;
    private final String courseTitle;
    private final Long instructorId;
    private final Long archivedByUserId;

    public CourseArchivedEvent(Object source, Long courseId, String courseTitle, Long instructorId, Long archivedByUserId) {
        super(source);
        this.courseId = courseId;
        this.courseTitle = courseTitle;
        this.instructorId = instructorId;
        this.archivedByUserId = archivedByUserId;
    }
}
