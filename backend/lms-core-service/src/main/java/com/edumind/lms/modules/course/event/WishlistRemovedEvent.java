package com.edumind.lms.modules.course.event;

import com.edumind.lms.modules.course.entity.Wishlist;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class WishlistRemovedEvent extends ApplicationEvent {
    private final Wishlist wishlist;

    public WishlistRemovedEvent(Object source, Wishlist wishlist) {
        super(source);
        this.wishlist = wishlist;
    }
}
