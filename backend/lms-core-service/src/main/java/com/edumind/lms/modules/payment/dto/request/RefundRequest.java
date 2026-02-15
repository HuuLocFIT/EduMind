package com.edumind.lms.modules.payment.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefundRequest {

    @NotNull(message = "Order ID is required")
    @Positive(message = "Order ID must be positive")
    private Long orderId;

    // Optional: specific order item IDs to refund (null = entire order)
    private List<Long> orderItemIds;

    // Optional: partial refund amount (null = full refund)
    @Positive(message = "Refund amount must be positive")
    private BigDecimal amount;          // null = full refund

    @NotBlank(message = "Refund reason is required")
    @Size(min = 10, max = 500, message = "Reason must be between 10 and 500 characters")
    private String reason;

    private String notes;

    // Bank account information for manual refunds (required only for SePay)
    // For PayPal and other auto-refund methods, these fields are optional
    @Size(max = 100, message = "Bank name must not exceed 100 characters")
    private String bankName;

    @Size(max = 100, message = "Account holder name must not exceed 100 characters")
    private String accountHolderName;

    @Size(max = 50, message = "Account number must not exceed 50 characters")
    private String accountNumber;

    @Size(max = 20, message = "Swift/BIC code must not exceed 20 characters")
    private String swiftCode; // Optional for international transfers

    @Size(max = 200, message = "Bank address must not exceed 200 characters")
    private String bankAddress; // Optional additional info
}