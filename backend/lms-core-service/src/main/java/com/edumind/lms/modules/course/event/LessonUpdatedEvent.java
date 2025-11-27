package com.edumind.lms.modules.course.event;

import com.edumind.lms.modules.course.entity.Lesson;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class LessonUpdatedEvent extends ApplicationEvent {
    private final Lesson lesson;

    public LessonUpdatedEvent(Object source, Lesson lesson) {
        super(source);
        this.lesson = lesson;
    }
}
