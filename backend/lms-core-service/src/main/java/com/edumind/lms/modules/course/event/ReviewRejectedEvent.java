package com.edumind.lms.modules.course.event;

import com.edumind.lms.shared.event.DomainEvent;
import lombok.Getter;

@Getter
public class ReviewRejectedEvent extends DomainEvent {
    private final Long reviewId;
    private final Long courseId;
    private final Long studentId;

    public ReviewRejectedEvent(Object source, Long reviewId, Long courseId, Long studentId) {
        super(source);
        this.reviewId = reviewId;
        this.courseId = courseId;
        this.studentId = studentId;
    }
}
