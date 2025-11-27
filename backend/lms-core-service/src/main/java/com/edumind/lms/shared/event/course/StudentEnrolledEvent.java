package com.edumind.lms.shared.event.course;

import com.edumind.lms.shared.event.DomainEvent;
import lombok.Getter;

@Getter
public class StudentEnrolledEvent extends DomainEvent {
    private final Long enrollmentId;
    private final Long courseId;
    private final Long studentId;

    public StudentEnrolledEvent(Object source, Long enrollmentId, Long courseId, Long studentId) {
        super(source);
        this.enrollmentId = enrollmentId;
        this.courseId = courseId;
        this.studentId = studentId;
    }
}