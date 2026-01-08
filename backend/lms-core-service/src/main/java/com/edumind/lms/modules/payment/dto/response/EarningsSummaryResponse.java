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
public class EarningsSummaryResponse {

    private Long instructorId;

    // Totals
    private BigDecimal totalGrossEarnings;     // All time gross
    private BigDecimal totalNetEarnings;       // All time net
    private BigDecimal totalPlatformFees;      // All time platform fees

    // By status
    private BigDecimal pendingEarnings;        // Waiting for clearance
    private BigDecimal availableEarnings;      // Ready for payout
    private BigDecimal paidEarnings;           // Already paid out

    // Current period (this month)
    private BigDecimal currentMonthGross;
    private BigDecimal currentMonthNet;
    private int currentMonthSales;

    // Previous period (last month) - for comparison
    private BigDecimal previousMonthGross;
    private BigDecimal previousMonthNet;
    private int previousMonthSales;

    // Growth
    private BigDecimal monthOverMonthGrowthPercent;

    // Stats
    private long totalSales;                   // Total number of sales
    private int totalCoursesSold;              // Unique courses sold

    // Top performing courses
    private List<CourseEarningResponse> topCourses;

    private String currency;
}
