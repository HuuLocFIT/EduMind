package com.edumind.lms.modules.payment.dto.response;

import com.edumind.lms.modules.payment.enums.RefundStatus;
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
public class RefundResponseDto {

    private Long id;
    private Long orderId;
    private String orderNumber;
    private Long userId;

    // Refund details
    private BigDecimal requestedAmount;
    private String currency;
    private String reason;

    // Status
    private RefundStatus status;

    // Timestamps
    private LocalDateTime requestedAt;
    private LocalDateTime approvedAt;
    private Long approvedBy;
    private LocalDateTime processedAt;

    // Gateway tracking
    private String refundTransactionId;
    private String gatewayRefundId;

    // Rejection info
    private String rejectionReason;
    private LocalDateTime rejectedAt;
    private Long rejectedBy;

    // Metadata
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
