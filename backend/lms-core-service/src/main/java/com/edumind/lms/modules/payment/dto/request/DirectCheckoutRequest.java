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
public class DirectCheckoutRequest {

    @NotNull(message = "Course ID is required")
    private Long courseId;

    @NotNull(message = "Payment method is required")
    private PaymentMethod paymentMethod;

    // For Mock gateway testing
    private String cardNumber;
    private String cardHolderName;
    private String expiryDate;
    private String cvv;

    // Customer info (needed for Order & Invoice)
    @Email(message = "Valid email is required")
    private String customerEmail;
    private String customerName;
    private String billingAddress;

    // Return URLs (for PayPal/SePay redirect flows)
    private String successUrl;
    private String cancelUrl;

    // Metadata
    private String ipAddress;
    private String userAgent;
}
