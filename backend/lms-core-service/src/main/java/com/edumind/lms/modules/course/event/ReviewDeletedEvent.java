package com.edumind.lms.modules.course.event;

import com.edumind.lms.shared.event.DomainEvent;
import lombok.Getter;

@Getter
public class ReviewDeletedEvent extends DomainEvent {
    private final Long reviewId;
    private final Long courseId;
    private final Long studentId;
    private final boolean deletedByAdmin;

    public ReviewDeletedEvent(Object source, Long reviewId, Long courseId, Long studentId, boolean deletedByAdmin) {
        super(source);
        this.reviewId = reviewId;
        this.courseId = courseId;
        this.studentId = studentId;
        this.deletedByAdmin = deletedByAdmin;
    }
}
