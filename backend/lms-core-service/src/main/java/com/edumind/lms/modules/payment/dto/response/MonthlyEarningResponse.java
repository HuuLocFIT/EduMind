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
public class MonthlyEarningResponse {

    private int year;
    private int month;
    private String monthName;             // "January", "February", etc.
    private BigDecimal grossEarnings;
    private BigDecimal netEarnings;
    private BigDecimal platformFees;
    private int salesCount;
    private String currency;
}
