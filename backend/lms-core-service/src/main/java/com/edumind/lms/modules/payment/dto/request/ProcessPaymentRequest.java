package com.edumind.lms.modules.payment.dto.request;

import com.edumind.lms.modules.payment.enums.PaymentMethod;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProcessPaymentRequest {

    @NotNull(message = "Order ID is required")
    private Long orderId;

    @NotNull(message = "Payment method is required")
    private PaymentMethod paymentMethod;

    private String orderNumber;
    private BigDecimal amount;
    private String currency;

    // Payment details
    private String cardNumber;
    private String cardHolderName;

    // User info
    private Long userId;
    private String userEmail;
    private String userName;

    // Metadata
    private String ipAddress;
    private String userAgent;
}
