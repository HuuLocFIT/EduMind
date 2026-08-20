package com.edumind.lms.modules.payment.gateway;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Result returned from payment gateway after processing.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GatewayPaymentResult {

    // Status
    private boolean success;
    private GatewayResultStatus status;  // SUCCESS, FAILED, PENDING, REQUIRES_ACTION

    // Gateway transaction info
    private String gatewayTransactionId;  // ID from gateway (for refund, status check)
    private String gatewayName;           // MOCK, PAYPAL, SEPAY

    // Amount processed
    private BigDecimal amount;
    private String currency;

    // Local currency (if converted)
    private BigDecimal localAmount;
    private String localCurrency;
    private BigDecimal exchangeRate;

    // Bank transfer info (SePay QR) - accessible text alternative to the QR image,
    // so a user who cannot scan it can still complete the transfer manually.
    private String bankCode;
    private String bankName;
    private String bankAccount;
    private String accountName;
    private String transferContent;

    // Error info (if failed)
    private String errorCode;
    private String errorMessage;

    // Redirect URL (for PayPal, SePay - redirect user to complete payment)
    private String redirectUrl;
    private boolean requiresRedirect;

    // Raw response (for debugging/logging)
    private String rawResponse;

    // Timestamps
    private LocalDateTime processedAt;

    // ===== Static Factory Methods =====

    public static GatewayPaymentResult success(String gatewayTransactionId, String gatewayName,
                                               BigDecimal amount, String currency) {
        return GatewayPaymentResult.builder()
                .success(true)
                .status(GatewayResultStatus.SUCCESS)
                .gatewayTransactionId(gatewayTransactionId)
                .gatewayName(gatewayName)
                .amount(amount)
                .currency(currency)
                .processedAt(LocalDateTime.now())
                .build();
    }

    public static GatewayPaymentResult failed(String gatewayName, String errorCode, String errorMessage) {
        return GatewayPaymentResult.builder()
                .success(false)
                .status(GatewayResultStatus.FAILED)
                .gatewayName(gatewayName)
                .errorCode(errorCode)
                .errorMessage(errorMessage)
                .processedAt(LocalDateTime.now())
                .build();
    }

    public static GatewayPaymentResult pending(String gatewayTransactionId, String gatewayName,
                                               String redirectUrl) {
        return GatewayPaymentResult.builder()
                .success(false)
                .status(GatewayResultStatus.PENDING)
                .gatewayTransactionId(gatewayTransactionId)
                .gatewayName(gatewayName)
                .redirectUrl(redirectUrl)
                .requiresRedirect(true)
                .processedAt(LocalDateTime.now())
                .build();
    }

    public static GatewayPaymentResult requiresAction(String gatewayTransactionId, String gatewayName,
                                                      String redirectUrl) {
        return GatewayPaymentResult.builder()
                .success(false)
                .status(GatewayResultStatus.REQUIRES_ACTION)
                .gatewayTransactionId(gatewayTransactionId)
                .gatewayName(gatewayName)
                .redirectUrl(redirectUrl)
                .requiresRedirect(true)
                .processedAt(LocalDateTime.now())
                .build();
    }
}
