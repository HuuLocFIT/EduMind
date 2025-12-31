package com.edumind.lms.modules.payment.gateway;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Payment request to be sent to payment gateway.
 * This is different from CheckoutRequest - this is internal gateway DTO.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GatewayPaymentRequest {

    // Order reference
    private String orderNumber;
    private Long orderId;

    // Amount
    private BigDecimal amount;
    private String currency;  // USD

    // For SePay - local currency conversion
    private BigDecimal localAmount;      // Amount in VND
    private String localCurrency;        // VND
    private BigDecimal exchangeRate;     // USD to VND rate

    // Customer info (for gateway records)
    private Long userId;
    private String customerEmail;
    private String customerName;

    // Payment method details (for Mock testing)
    private String cardNumber;           // Mock: ends with 0000 = success, 1111 = fail
    private String cardHolderName;
    private String expiryDate;           // MM/YY
    private String cvv;

    // Return URLs (for PayPal, SePay redirect flow)
    private String successUrl;
    private String cancelUrl;
    private String webhookUrl;

    // Additional metadata
    private String description;          // "Payment for Order #ORD-202501-0001"
    private String ipAddress;            // Customer IP for fraud detection
}
