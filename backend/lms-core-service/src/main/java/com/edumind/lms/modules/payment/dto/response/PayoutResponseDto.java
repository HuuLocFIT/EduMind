package com.edumind.lms.modules.payment.dto.response;

import com.edumind.lms.modules.payment.enums.PayoutMethod;
import com.edumind.lms.modules.payment.enums.PayoutStatus;
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
public class PayoutResponseDto {

    private Long id;
    private String payoutNumber;
    private Long instructorId;

    // Amounts
    private BigDecimal totalAmount;
    private String currency;

    // Payment method
    private PayoutMethod paymentMethod;

    // Status
    private PayoutStatus status;

    // Timestamps
    private LocalDateTime scheduledAt;
    private LocalDateTime processedAt;

    // Gateway tracking
    private String gatewayTransactionId;

    // Recipient info
    private String bankName;
    private String accountHolderName;
    private String bankAccount;
    private String swiftCode;
    private String bankAddress;
    private String paypalEmail;

    // Failure tracking
    private String failureReason;
    private String failureCode;
    private Integer retryCount;

    // Earnings included in this payout
    private List<PayoutItemResponseDto> items;
    private Integer earningsCount;

    // Metadata
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
