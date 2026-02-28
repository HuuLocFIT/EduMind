package com.edumind.lms.modules.course.event;

import com.edumind.lms.shared.event.DomainEvent;
import lombok.Getter;

@Getter
public class InstructorRepliedToReviewEvent extends DomainEvent {
    private final Long reviewId;
    private final Long courseId;
    private final Long studentId;
    private final Long instructorId;

    public InstructorRepliedToReviewEvent(Object source, Long reviewId, Long courseId, Long studentId, Long instructorId) {
        super(source);
        this.reviewId = reviewId;
        this.courseId = courseId;
        this.studentId = studentId;
        this.instructorId = instructorId;
    }
}
