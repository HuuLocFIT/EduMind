package com.edumind.lms.modules.payment.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItemResponse {

    private Long id;
    private Long courseId;

    // Course snapshot
    private String courseTitle;
    private String courseSlug;
    private String courseThumbnailUrl;

    // Instructor snapshot
    private Long instructorId;
    private String instructorName;

    // Pricing (at time of purchase)
    private BigDecimal originalPrice;
    private BigDecimal discountAmount;
    private BigDecimal finalPrice;
    private String currency;

    private LocalDateTime createdAt;
}
