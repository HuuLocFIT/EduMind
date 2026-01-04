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
public class CheckoutItemPreview {

    private Long courseId;
    private String courseTitle;
    private String courseSlug;
    private String courseThumbnailUrl;
    private String instructorName;
    private Long instructorId;

    private BigDecimal originalPrice;
    private BigDecimal effectivePrice;
    private BigDecimal discountAmount;
    private String currency;

    private boolean isFree;
}

