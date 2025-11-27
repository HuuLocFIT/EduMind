package com.edumind.lms.modules.course.event;

import com.edumind.lms.modules.course.entity.Section;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class SectionDeletedEvent extends ApplicationEvent {
    private final Section section;

    public SectionDeletedEvent(Object source, Section section) {
        super(source);
        this.section = section;
    }
}
