package com.edumind.lms.modules.payment.dto.request;

import com.edumind.lms.modules.payment.enums.PaymentMethod;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckoutRequest {

    @NotNull(message = "Payment method is required")
    private PaymentMethod paymentMethod;

    // For Mock gateway testing
    // Test cards: ends with 0000 = success, 1111 = fail
    private String cardNumber;
    private String cardHolderName;
    private String expiryDate;
    private String cvv;

    // Customer info (needed for Order & Invoice)
    @Email(message = "Valid email is required")
    private String customerEmail;
    private String customerName;
    private String billingAddress;  // Optional

    // Return URLs (for PayPal/SePay redirect flows)
    private String successUrl;
    private String cancelUrl;

    // Metadata (optional - for logging/fraud detection)
    private String ipAddress;
    private String userAgent;

    /**
     * Optional cart signature returned from preview.
     * When provided, checkout() will validate that the current cart state
     * matches the previewed state before creating an order.
     */
    private String cartSignature;

    /**
     * FIX #12: Optional idempotency key to prevent duplicate orders.
     * Client should generate a unique key (e.g., UUID) per checkout attempt.
     * If a request with the same key is received, return the existing order.
     */
    private String idempotencyKey;
}
