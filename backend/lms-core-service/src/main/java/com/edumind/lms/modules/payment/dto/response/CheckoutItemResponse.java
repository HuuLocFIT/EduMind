package com.edumind.lms.modules.payment.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckoutItemResponse {

    private Long courseId;
    private String courseTitle;
    private String courseThumbnailUrl;
    private String instructorName;
    private Long instructorId;

    private BigDecimal originalPrice;
    private BigDecimal discountAmount;
    private BigDecimal finalPrice;
    private String currency;

    // Validation
    private boolean isAvailable;          // Course still published
    private boolean isAlreadyPurchased;   // User already owns this
    private String unavailableReason;
}
