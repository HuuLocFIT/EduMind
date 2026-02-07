package com.edumind.lms.modules.payment.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayoutItemResponseDto {

    private Long earningId;
    private Long orderId;
    private String orderNumber;
    private Long courseId;
    private String courseTitle;
    private BigDecimal netAmount;
    private String currency;
}
