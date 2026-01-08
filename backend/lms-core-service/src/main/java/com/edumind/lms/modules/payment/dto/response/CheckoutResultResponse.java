package com.edumind.lms.modules.payment.dto.response;

import com.edumind.lms.modules.payment.enums.OrderStatus;
import com.edumind.lms.modules.payment.enums.PaymentMethod;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckoutResultResponse {

    private boolean success;
    private String message;

    // Order info
    private Long orderId;
    private String orderNumber;
    private OrderStatus orderStatus;
    private BigDecimal totalAmount;
    private String currency;
    private PaymentMethod paymentMethod;
    private boolean pending;  // For pending payments

    // Transaction info (if payment processed)
    private String transactionNumber;
    private String gatewayTransactionId;

    // Enrolled courses (if successful)
    private List<Long> enrolledCourseIds;

    // Invoice (if generated)
    private String invoiceNumber;
    private String invoiceUrl;

    // For redirect (PayPal, SePay)
    private String redirectUrl;
    private boolean requiresRedirect;

    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;

    // Error info (if failed)
    private String errorCode;
    private String errorMessage;
}