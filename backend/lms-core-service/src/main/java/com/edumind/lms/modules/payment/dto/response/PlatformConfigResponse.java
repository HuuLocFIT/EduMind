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
public class PlatformConfigResponse {

    // Pricing
    private BigDecimal platformFeePercent;
    private BigDecimal minCoursePrice;
    private BigDecimal maxCoursePrice;
    private String defaultCurrency;

    // Company info (for invoices)
    private String companyName;
    private String companyAddress;
    private String companyTaxId;
    private String companyEmail;
    private String companyPhone;
}