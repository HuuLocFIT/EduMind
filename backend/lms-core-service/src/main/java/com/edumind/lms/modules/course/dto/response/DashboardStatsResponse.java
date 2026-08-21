package com.edumind.lms.modules.course.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DashboardStatsResponse {
    // Enrollment
    private Long totalEnrollments;
    private Long activeEnrollments;
    private Long completedEnrollments;

    // Courses
    private Long totalCourses;
    private Long publishedCourses;
    private Long draftCourses;
    private Long archivedCourses;

    // Revenue (from completed orders)
    private BigDecimal totalRevenue;
    private BigDecimal revenueThisMonth;
    private BigDecimal revenueLastMonth;

    // Pending items
    private Long pendingEnrollmentReports;
    private Long pendingRefunds;

    // Chart data (last 6 months)
    private List<MonthlyStatResponse> monthlyEnrollments;
    private List<MonthlyStatResponse> monthlyRevenue;
    private List<CategoryStatResponse> coursesByCategory;
}
