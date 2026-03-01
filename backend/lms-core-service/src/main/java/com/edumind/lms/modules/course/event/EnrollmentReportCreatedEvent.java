package com.edumind.lms.modules.course.event;

import com.edumind.lms.shared.event.DomainEvent;
import lombok.Getter;

@Getter
public class EnrollmentReportCreatedEvent extends DomainEvent {
    private final Long reportRequestId;
    private final Long enrollmentId;
    private final Long courseId;
    private final Long teacherId;

    public EnrollmentReportCreatedEvent(Object source, Long reportRequestId, Long enrollmentId, Long courseId, Long teacherId) {
        super(source);
        this.reportRequestId = reportRequestId;
        this.enrollmentId = enrollmentId;
        this.courseId = courseId;
        this.teacherId = teacherId;
    }
}
