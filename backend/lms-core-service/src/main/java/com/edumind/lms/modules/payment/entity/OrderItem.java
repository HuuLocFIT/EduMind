package com.edumind.lms.modules.payment.entity;

import com.edumind.lms.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "order_items", schema = "payment")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItem extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(name = "course_id", nullable = false)
    private Long courseId;

    // Instructor info (snapshot at purchase time)
    @Column(name = "instructor_id", nullable = false)
    private Long instructorId;

    @Column(name = "instructor_name")
    private String instructorName;

    // Course info (snapshot at purchase time)
    @Column(name = "course_title", nullable = false)
    private String courseTitle;

    @Column(name = "course_slug", length = 255)
    private String courseSlug;

    @Column(name = "course_thumbnail_url", length = 500)
    private String courseThumbnailUrl;

    // Pricing (at time of purchase - immutable snapshot)
    @Column(name = "original_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal originalPrice;

    @Column(name = "discount_amount", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "final_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal finalPrice;

    @Column(length = 3)
    @Builder.Default
    private String currency = "USD";

    // Relationship to earning
    @OneToOne(mappedBy = "orderItem", cascade = CascadeType.ALL)
    private InstructorEarning earning;

    // Helper methods
    public boolean hasDiscount() {
        return discountAmount != null && discountAmount.compareTo(BigDecimal.ZERO) > 0;
    }

    public boolean isFree() {
        return finalPrice.compareTo(BigDecimal.ZERO) == 0;
    }


}
