package com.edumind.lms.modules.payment.entity;

import com.edumind.lms.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "carts", schema = "payment",
        uniqueConstraints = @UniqueConstraint(columnNames = "user_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Cart extends BaseEntity {
    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @OneToMany(mappedBy = "cart", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CartItem> items = new ArrayList<>();

    // Helper methods
    public int getItemCount() {
        return items.size();
    }

    public boolean isEmpty() {
        return items.isEmpty();
    }

    public BigDecimal getTotalPrice() {
        return items.stream()
                .map(CartItem::getPriceSnapshot)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public boolean containsCourse(Long courseId) {
        return items.stream()
                .anyMatch(item -> item.getCourseId().equals(courseId));
    }

    public void addItem(CartItem item) {
        items.add(item);
        item.setCart(this);
    }

    public void removeItem(CartItem item) {
        items.remove(item);
        item.setCart(null);
    }

    public void removeItemByCourseId(Long courseId) {
        items.removeIf(item -> item.getCourseId().equals(courseId));
    }

    public void clearItems() {
        items.clear();
    }
}
