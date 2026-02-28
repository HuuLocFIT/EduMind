package com.edumind.lms.modules.course.event;

import com.edumind.lms.shared.event.DomainEvent;
import lombok.Getter;

@Getter
public class CategoryStatusChangedEvent extends DomainEvent {
    private final Long categoryId;
    private final String categoryName;
    private final boolean active;

    public CategoryStatusChangedEvent(Object source, Long categoryId, String categoryName, boolean active) {
        super(source);
        this.categoryId = categoryId;
        this.categoryName = categoryName;
        this.active = active;
    }
}
