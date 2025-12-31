package com.edumind.lms.modules.payment.gateway;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Current status of a payment from gateway.
 * Used to check/sync payment status.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GatewayPaymentStatus {

    private String gatewayTransactionId;
    private String gatewayName;

    private GatewayResultStatus status;

    // Amount info
    private BigDecimal amount;
    private String currency;

    // Refund info (if any)
    private boolean hasRefund;
    private BigDecimal refundedAmount;

    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;

    // Error info (if failed)
    private String errorCode;
    private String errorMessage;

    // Raw response
    private String rawResponse;
}
