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
public class CartItemResponse {

    private Long id;
    private Long courseId;

    // Course details (fetched from Course module)
    private String courseTitle;
    private String courseSlug;
    private String courseThumbnailUrl;
    private String instructorName;
    private Long instructorId;

    // Pricing
    private BigDecimal originalPrice;
    private BigDecimal discountPrice;      // If course has discount
    private BigDecimal effectivePrice;     // Price to charge
    private String currency;

    // Course meta
    private String level;
    private Integer totalLessons;
    private BigDecimal averageRating;
    private Integer totalReviews;

    private LocalDateTime addedAt;
}
