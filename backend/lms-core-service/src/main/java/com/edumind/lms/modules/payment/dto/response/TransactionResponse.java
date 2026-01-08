package com.edumind.lms.modules.payment.dto.response;

import com.edumind.lms.modules.payment.enums.PaymentMethod;
import com.edumind.lms.modules.payment.enums.TransactionStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransactionResponse {

    private Long id;
    private String transactionNumber;
    private Long orderId;

    // Gateway info
    private PaymentMethod gateway;
    private String gatewayTransactionId;

    // Amount
    private BigDecimal amount;
    private String currency;

    // Local currency (for SePay)
    private BigDecimal exchangeRate;
    private BigDecimal localAmount;
    private String localCurrency;

    // Status
    private TransactionStatus status;
    private String failureReason;

    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime processedAt;
}
