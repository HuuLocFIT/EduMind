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

    // Bank account information for manual refunds
    private String bankName;
    private String accountHolderName;
    private String accountNumber;
    private String swiftCode;
    private String bankAddress;

    // Status
    private RefundStatus status;

    // Timestamps
    private LocalDateTime requestedAt;
    private LocalDateTime approvedAt;
    private Long approvedBy;
    private String approvedByName;  // Display name of the admin who approved
    private LocalDateTime processedAt;

    // Gateway tracking
    private String refundTransactionId;
    private String gatewayRefundId;
    private String gatewayResponse;  // Error message for FAILED refunds

    // Rejection info
    private String rejectionReason;
    private LocalDateTime rejectedAt;
    private Long rejectedBy;
    private String rejectedByName;  // Display name of the admin who rejected

    // Metadata
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
