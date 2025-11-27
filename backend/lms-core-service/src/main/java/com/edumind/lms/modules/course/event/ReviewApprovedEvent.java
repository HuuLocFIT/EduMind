package com.edumind.lms.modules.course.event;

import com.edumind.lms.modules.course.entity.CourseReview;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class ReviewApprovedEvent extends ApplicationEvent {
    private final CourseReview review;

    public ReviewApprovedEvent(Object source, CourseReview review) {
        super(source);
        this.review = review;
    }
}
