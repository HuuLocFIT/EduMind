package com.edumind.lms.modules.course.event;

import com.edumind.lms.shared.event.DomainEvent;
import lombok.Getter;

@Getter
public class CoursePublishedEvent extends DomainEvent {
    private final Long courseId;
    private final String courseTitle;

    public CoursePublishedEvent(Object source, Long courseId, String courseTitle) {
        super(source);
        this.courseId = courseId;
        this.courseTitle = courseTitle;
    }
}