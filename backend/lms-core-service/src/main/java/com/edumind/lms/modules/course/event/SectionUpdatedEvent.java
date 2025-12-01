package com.edumind.lms.modules.course.event;

import com.edumind.lms.modules.course.entity.Section;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class SectionUpdatedEvent extends ApplicationEvent {
    private final Section section;

    public SectionUpdatedEvent(Object source, Section section) {
        super(source);
        this.section = section;
    }
}
