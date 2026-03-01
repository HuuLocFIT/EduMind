package com.edumind.lms.modules.course.event;

import com.edumind.lms.shared.event.DomainEvent;
import lombok.Getter;

@Getter
public class CategoryDeletedEvent extends DomainEvent {
    private final Long categoryId;
    private final String categoryName;

    public CategoryDeletedEvent(Object source, Long categoryId, String categoryName) {
        super(source);
        this.categoryId = categoryId;
        this.categoryName = categoryName;
    }
}
