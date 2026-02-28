package com.edumind.lms.modules.course.event;

import com.edumind.lms.shared.event.DomainEvent;
import lombok.Getter;

@Getter
public class EnrollmentSuspendedEvent extends DomainEvent {
    private final Long enrollmentId;
    private final Long courseId;
    private final Long studentId;
    private final String reason;

    public EnrollmentSuspendedEvent(Object source, Long enrollmentId, Long courseId, Long studentId, String reason) {
        super(source);
        this.enrollmentId = enrollmentId;
        this.courseId = courseId;
        this.studentId = studentId;
        this.reason = reason;
    }
}
