package com.edumind.lms.modules.payment.dto.response;

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
public class CheckoutPreviewResponse {

    private List<CheckoutItemResponse> items;
    private int itemCount;

    // Pricing breakdown
    private BigDecimal subtotal;          // Sum of all original prices
    private BigDecimal discountTotal;     // Total discount
    private BigDecimal taxAmount;         // Tax (0 for now)
    private BigDecimal taxRate;           // Tax rate (0%)
    private BigDecimal totalAmount;       // Final amount to pay
    private String currency;

    // Payment options
    private boolean isFreeCheckout;       // totalAmount = 0
    private List<String> availablePaymentMethods;

    // Validation
    private boolean isValid;
    private List<String> validationErrors;
}
