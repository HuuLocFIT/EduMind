package com.edumind.lms.modules.course.event;

import com.edumind.lms.shared.event.DomainEvent;
import lombok.Getter;

@Getter
public class CourseArchivedEvent extends DomainEvent {
    private final Long courseId;
    private final String courseTitle;
    private final Long instructorId;
    private final Long archivedByUserId;
    private final String actorRole;
    private final String previousStatus;
    private final String reason;
    private final long protectedEnrollmentCount;

    public CourseArchivedEvent(Object source, Long courseId, String courseTitle, Long instructorId, Long archivedByUserId,
            String actorRole, String previousStatus, String reason, long protectedEnrollmentCount) {
        super(source);
        this.courseId = courseId;
        this.courseTitle = courseTitle;
        this.instructorId = instructorId;
        this.archivedByUserId = archivedByUserId;
        this.actorRole = actorRole;
        this.previousStatus = previousStatus;
        this.reason = reason;
        this.protectedEnrollmentCount = protectedEnrollmentCount;
    }
}
