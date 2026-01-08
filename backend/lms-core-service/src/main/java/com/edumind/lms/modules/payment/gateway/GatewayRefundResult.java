package com.edumind.lms.modules.payment.gateway;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Result of a refund request.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GatewayRefundResult {

    private boolean success;
    private GatewayRefundStatus status;

    // Refund transaction info
    private String refundTransactionId;
    private String originalTransactionId;
    private String gatewayName;

    // Amount refunded
    private BigDecimal amount;
    private String currency;

    // Error info
    private String errorCode;
    private String errorMessage;

    // Raw response
    private String rawResponse;

    private LocalDateTime processedAt;

    // ===== Static Factory Methods =====

    public static GatewayRefundResult success(String refundTransactionId, String originalTransactionId,
                                              String gatewayName, BigDecimal amount, String currency) {
        return GatewayRefundResult.builder()
                .success(true)
                .status(GatewayRefundStatus.COMPLETED)
                .refundTransactionId(refundTransactionId)
                .originalTransactionId(originalTransactionId)
                .gatewayName(gatewayName)
                .amount(amount)
                .currency(currency)
                .processedAt(LocalDateTime.now())
                .build();
    }

    public static GatewayRefundResult failed(String originalTransactionId, String gatewayName,
                                             String errorCode, String errorMessage) {
        return GatewayRefundResult.builder()
                .success(false)
                .status(GatewayRefundStatus.FAILED)
                .originalTransactionId(originalTransactionId)
                .gatewayName(gatewayName)
                .errorCode(errorCode)
                .errorMessage(errorMessage)
                .processedAt(LocalDateTime.now())
                .build();
    }

    public static GatewayRefundResult pending(String refundTransactionId, String originalTransactionId,
                                              String gatewayName) {
        return GatewayRefundResult.builder()
                .success(false)
                .status(GatewayRefundStatus.PENDING)
                .refundTransactionId(refundTransactionId)
                .originalTransactionId(originalTransactionId)
                .gatewayName(gatewayName)
                .processedAt(LocalDateTime.now())
                .build();
    }
}
