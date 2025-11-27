package com.edumind.lms.shared.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.time.Instant;

/**
 * Base class for all domain events in LMS Core Service
 */
@Getter
public abstract class DomainEvent extends ApplicationEvent {
    private final Instant occurredAt;

    protected DomainEvent(Object source) {
        super(source);
        this.occurredAt = Instant.now();
    }
}
