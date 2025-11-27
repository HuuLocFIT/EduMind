package com.edumind.lms.modules.course.event;

import com.edumind.lms.modules.course.entity.Lesson;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class LessonDeletedEvent extends ApplicationEvent {
    private final Lesson lesson;

    public LessonDeletedEvent(Object source, Lesson lesson) {
        super(source);
        this.lesson = lesson;
    }
}
