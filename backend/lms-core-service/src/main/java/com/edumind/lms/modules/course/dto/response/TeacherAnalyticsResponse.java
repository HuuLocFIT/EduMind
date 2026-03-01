package com.edumind.lms.modules.course.dto.response;

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
public class TeacherAnalyticsResponse {
    // Overview KPIs
    private Long totalPublishedCourses;
    private Long totalStudents;
    private Double averageRating;
    private Long totalReviews;
    private BigDecimal totalNetEarnings;
    private Double completionRate;

    // Chart data
    private List<MonthlyStatResponse> monthlyEnrollments;
    private List<MonthlyStatResponse> monthlyEarnings;

    // Breakdowns
    private List<EnrollmentStatusStatResponse> enrollmentStatusBreakdown;
    private List<RatingDistributionStatResponse> ratingDistribution;

    // Course comparison table (top 10 by students)
    private List<TeacherCourseStatResponse> topCourses;
}
