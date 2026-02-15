package com.edumind.lms.modules.payment.gateway;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Result of a payout request to a payment gateway.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GatewayPayoutResult {

    private boolean success;
    private GatewayPayoutStatus status;

    // Payout transaction info
    private String payoutTransactionId;
    private String gatewayName;

    // Amount paid out
    private BigDecimal amount;
    private String currency;

    // Error info
    private String errorCode;
    private String errorMessage;

    // Raw response
    private String rawResponse;

    private LocalDateTime processedAt;

    // ===== Static Factory Methods =====

    public static GatewayPayoutResult success(String payoutTransactionId, String gatewayName,
                                             BigDecimal amount, String currency) {
        return GatewayPayoutResult.builder()
                .success(true)
                .status(GatewayPayoutStatus.COMPLETED)
                .payoutTransactionId(payoutTransactionId)
                .gatewayName(gatewayName)
                .amount(amount)
                .currency(currency)
                .processedAt(LocalDateTime.now())
                .build();
    }

    public static GatewayPayoutResult failed(String gatewayName, String errorCode, String errorMessage) {
        return GatewayPayoutResult.builder()
                .success(false)
                .status(GatewayPayoutStatus.FAILED)
                .gatewayName(gatewayName)
                .errorCode(errorCode)
                .errorMessage(errorMessage)
                .processedAt(LocalDateTime.now())
                .build();
    }

    public static GatewayPayoutResult pending(String payoutTransactionId, String gatewayName) {
        return GatewayPayoutResult.builder()
                .success(false)
                .status(GatewayPayoutStatus.PENDING)
                .payoutTransactionId(payoutTransactionId)
                .gatewayName(gatewayName)
                .processedAt(LocalDateTime.now())
                .build();
    }
}
