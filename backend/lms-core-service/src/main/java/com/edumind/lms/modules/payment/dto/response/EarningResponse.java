package com.edumind.lms.modules.payment.dto.response;

import com.edumind.lms.modules.payment.enums.EarningStatus;
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
public class EarningResponse {

    private Long id;
    private Long instructorId;
    private Long orderId;
    private String orderNumber;
    private Long courseId;

    // Course info
    private String courseTitle;
    private String courseThumbnailUrl;

    // Buyer info (anonymized)
    private String buyerName;             // e.g., "John D." or just initials

    // Amounts
    private BigDecimal grossAmount;        // Sale price
    private BigDecimal platformFeePercent; // e.g., 20
    private BigDecimal platformFeeAmount;  // Amount kept by platform
    private BigDecimal netAmount;          // Amount instructor receives
    private String currency;

    // Status
    private EarningStatus status;

    // Payout info
    private Long payoutId;
    private LocalDateTime paidAt;

    // Timestamps
    private LocalDateTime createdAt;
}
