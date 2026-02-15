package com.edumind.lms.modules.payment.dto.response;

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
public class PayoutSummaryDto {

    private Long instructorId;
    private BigDecimal totalPayouts;  // Total amount paid out
    private BigDecimal pendingPayouts;  // Amount in pending payouts
    private BigDecimal availableForPayout;  // Amount available but not yet in payout
    private Integer totalPayoutCount;  // Total number of payouts
    private LocalDateTime lastPayoutDate;  // Date of last completed payout
    private String currency;
}
