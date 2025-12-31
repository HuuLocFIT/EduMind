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
public class OrderResponse {

    private Long id;
    private String orderNumber;
    private Long userId;

    // Pricing
    private BigDecimal subtotal;
    private BigDecimal discountTotal;
    private BigDecimal totalAmount;
    private String currency;

    // Payment
    private PaymentMethod paymentMethod;
    private OrderStatus status;

    // Items
    private List<OrderItemResponse> items;
    private int itemCount;

    // Related
    private TransactionResponse latestTransaction;
    private InvoiceResponse invoice;

    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
}
