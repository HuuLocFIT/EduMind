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
public class CourseEarningResponse {

    private Long courseId;
    private String courseTitle;
    private String courseThumbnailUrl;
    private BigDecimal totalGrossEarnings;
    private BigDecimal totalNetEarnings;
    private long salesCount;
    private BigDecimal averageSalePrice;
    private String currency;
}
