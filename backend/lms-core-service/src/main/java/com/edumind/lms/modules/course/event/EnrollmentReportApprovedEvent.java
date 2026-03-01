package com.edumind.lms.modules.course.event;

import com.edumind.lms.shared.event.DomainEvent;
import lombok.Getter;

@Getter
public class EnrollmentReportApprovedEvent extends DomainEvent {
    private final Long reportRequestId;
    private final Long enrollmentId;
    private final Long courseId;
    private final Long studentId;
    private final Long teacherId;
    private final Long approvedByAdminId;

    public EnrollmentReportApprovedEvent(Object source, Long reportRequestId, Long enrollmentId,
            Long courseId, Long studentId, Long teacherId, Long approvedByAdminId) {
        super(source);
        this.reportRequestId = reportRequestId;
        this.enrollmentId = enrollmentId;
        this.courseId = courseId;
        this.studentId = studentId;
        this.teacherId = teacherId;
        this.approvedByAdminId = approvedByAdminId;
    }
}
