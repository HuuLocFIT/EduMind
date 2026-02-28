package com.edumind.lms.modules.course.event;

import com.edumind.lms.shared.event.DomainEvent;
import lombok.Getter;

@Getter
public class EnrollmentActivatedEvent extends DomainEvent {
    private final Long enrollmentId;
    private final Long courseId;
    private final Long studentId;

    public EnrollmentActivatedEvent(Object source, Long enrollmentId, Long courseId, Long studentId) {
        super(source);
        this.enrollmentId = enrollmentId;
        this.courseId = courseId;
        this.studentId = studentId;
    }
}
