package com.edumind.lms.modules.payment.dto.request;

import com.edumind.lms.modules.payment.enums.PaymentMethod;
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
    private String cardNumber;      // Test: ends with 0000 = success, 1111 = fail
    private String cardHolderName;

    // Future: PayPal return URLs
    private String successUrl;
    private String cancelUrl;

    // Metadata
    private String ipAddress;
    private String userAgent;
}
