package com.edumind.lms.modules.course.service;

import com.edumind.lms.modules.course.dto.model.InstructorStatsProjection;
import com.edumind.lms.modules.course.dto.response.*;
import com.edumind.lms.modules.course.enums.CourseStatus;
import com.edumind.lms.modules.course.enums.EnrollmentStatus;
import com.edumind.lms.modules.course.repository.CourseRepository;
import com.edumind.lms.modules.course.repository.CourseReviewRepository;
import com.edumind.lms.modules.course.repository.EnrollmentRepository;
import com.edumind.lms.modules.payment.enums.EarningStatus;
import com.edumind.lms.modules.payment.repository.InstructorEarningRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TeacherAnalyticsServiceImpl implements TeacherAnalyticsService {
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final CourseReviewRepository courseReviewRepository;
    private final InstructorEarningRepository instructorEarningRepository;

    private static final DateTimeFormatter MONTH_FORMATTER = DateTimeFormatter.ofPattern("MMM yyyy");

    @Override
    public TeacherAnalyticsResponse getAnalytics(Long instructorId) {
        log.info("Fetching analytics for instructor: {}", instructorId);

        // 1. Get overview KPIs from instructor stats
        InstructorStatsProjection stats = courseRepository
                .getInstructorStats(instructorId)
                .orElse(null);

        long totalPublishedCourses = stats != null ? stats.getTotalCourses() : 0L;
        long totalStudents = stats != null ? stats.getTotalStudents() : 0L;
        double averageRating = stats != null && stats.getAverageRating() != null
                ? stats.getAverageRating() : 0.0;
        long totalReviews = stats != null ? stats.getTotalReviews() : 0L;

        // 2. Get total net earnings
        BigDecimal totalNetEarnings = instructorEarningRepository
                .sumNetAmountByInstructorIdAndStatus(instructorId, EarningStatus.AVAILABLE);
        if (totalNetEarnings == null) {
            totalNetEarnings = BigDecimal.ZERO;
        }

        // 3. Calculate completion rate
        List<Object[]> statusBreakdown = enrollmentRepository
                .getEnrollmentStatusBreakdownByInstructor(instructorId);
        long totalEnrollments = 0L;
        long completedEnrollments = 0L;
        for (Object[] row : statusBreakdown) {
            EnrollmentStatus status = (EnrollmentStatus) row[0];
            Long count = ((Number) row[1]).longValue();
            totalEnrollments += count;
            if (status == EnrollmentStatus.COMPLETED) {
                completedEnrollments = count;
            }
        }
        double completionRate = totalEnrollments > 0
                ? (completedEnrollments * 100.0) / totalEnrollments
                : 0.0;

        // 4. Build monthly enrollments (last 6 months)
        List<MonthlyStatResponse> monthlyEnrollments = buildMonthlyEnrollments(instructorId);

        // 5. Build monthly earnings (last 6 months)
        List<MonthlyStatResponse> monthlyEarnings = buildMonthlyEarnings(instructorId);

        // 6. Build enrollment status breakdown
        List<EnrollmentStatusStatResponse> enrollmentStatusBreakdown = statusBreakdown.stream()
                .map(row -> EnrollmentStatusStatResponse.builder()
                        .status(((EnrollmentStatus) row[0]).name())
                        .count(((Number) row[1]).longValue())
                        .build())
                .collect(Collectors.toList());

        // 7. Build rating distribution
        List<RatingDistributionStatResponse> ratingDistribution = buildRatingDistribution(instructorId);

        // 8. Get top courses (top 10 by students)
        List<TeacherCourseStatResponse> topCourses = buildTopCourses(instructorId);

        return TeacherAnalyticsResponse.builder()
                .totalPublishedCourses(totalPublishedCourses)
                .totalStudents(totalStudents)
                .averageRating(averageRating)
                .totalReviews(totalReviews)
                .totalNetEarnings(totalNetEarnings)
                .completionRate(completionRate)
                .monthlyEnrollments(monthlyEnrollments)
                .monthlyEarnings(monthlyEarnings)
                .enrollmentStatusBreakdown(enrollmentStatusBreakdown)
                .ratingDistribution(ratingDistribution)
                .topCourses(topCourses)
                .build();
    }

    private List<MonthlyStatResponse> buildMonthlyEnrollments(Long instructorId) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startDate = now.minusMonths(5).withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);

        List<Object[]> results = enrollmentRepository.getMonthlyEnrollmentCountsByInstructor(instructorId, startDate);
        Map<String, Long> enrollmentMap = results.stream()
                .collect(Collectors.toMap(
                        row -> (String) row[0],
                        row -> ((Number) row[1]).longValue()
                ));

        List<MonthlyStatResponse> monthlyEnrollments = new ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            LocalDateTime month = now.minusMonths(i);
            String monthKey = month.format(MONTH_FORMATTER);
            Long count = enrollmentMap.getOrDefault(monthKey, 0L);
            monthlyEnrollments.add(MonthlyStatResponse.builder()
                    .month(monthKey)
                    .count(count)
                    .build());
        }
        return monthlyEnrollments;
    }

    private List<MonthlyStatResponse> buildMonthlyEarnings(Long instructorId) {
        List<MonthlyStatResponse> monthlyEarnings = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        for (int i = 5; i >= 0; i--) {
            LocalDateTime monthStart = now.minusMonths(i).withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
            LocalDateTime monthEnd = monthStart.plusMonths(1).minusNanos(1);
            String monthKey = monthStart.format(MONTH_FORMATTER);

            BigDecimal earnings = instructorEarningRepository.sumNetAmountByInstructorIdAndDateRange(
                    instructorId, monthStart, monthEnd);
            if (earnings == null) {
                earnings = BigDecimal.ZERO;
            }

            monthlyEarnings.add(MonthlyStatResponse.builder()
                    .month(monthKey)
                    .amount(earnings)
                    .build());
        }
        return monthlyEarnings;
    }

    private List<RatingDistributionStatResponse> buildRatingDistribution(Long instructorId) {
        List<Object[]> rawDistribution = courseReviewRepository.getInstructorRatingDistribution(instructorId);
        Map<Integer, Long> distributionMap = new HashMap<>();

        // Initialize all ratings from 5 to 1 with 0
        for (int i = 5; i >= 1; i--) {
            distributionMap.put(i, 0L);
        }

        // Fill with actual counts
        for (Object[] row : rawDistribution) {
            Integer ratingValue = ((Number) row[0]).intValue();
            Long count = ((Number) row[1]).longValue();
            distributionMap.put(ratingValue, count);
        }

        // Convert to response list (5 to 1 stars)
        List<RatingDistributionStatResponse> ratingDistribution = new ArrayList<>();
        for (int i = 5; i >= 1; i--) {
            ratingDistribution.add(RatingDistributionStatResponse.builder()
                    .stars(i)
                    .count(distributionMap.getOrDefault(i, 0L))
                    .build());
        }

        return ratingDistribution;
    }

    private List<TeacherCourseStatResponse> buildTopCourses(Long instructorId) {
        // Get top 10 courses by totalStudents
        List<com.edumind.lms.modules.course.entity.Course> courses = courseRepository
                .findByInstructorIdAndStatus(instructorId, CourseStatus.PUBLISHED, PageRequest.of(0, 10))
                .getContent();

        // Get earnings per course
        List<Object[]> courseEarningsData = instructorEarningRepository
                .sumNetAmountByCourseIdAndInstructorId(instructorId, EarningStatus.AVAILABLE);
        Map<Long, BigDecimal> earningsMap = courseEarningsData.stream()
                .collect(Collectors.toMap(
                        row -> ((Number) row[0]).longValue(),
                        row -> (BigDecimal) row[1]
                ));

        List<TeacherCourseStatResponse> topCourses = new ArrayList<>();
        for (com.edumind.lms.modules.course.entity.Course course : courses) {
            // Calculate completion rate for this course
            long courseTotalEnrollments = enrollmentRepository.countByCourseId(course.getId());
            long courseCompletedEnrollments = enrollmentRepository
                    .countByCourseIdAndStatus(course.getId(), EnrollmentStatus.COMPLETED);
            double courseCompletionRate = courseTotalEnrollments > 0
                    ? (courseCompletedEnrollments * 100.0) / courseTotalEnrollments
                    : 0.0;

            // Get net earnings for this course
            BigDecimal courseEarnings = earningsMap.getOrDefault(course.getId(), BigDecimal.ZERO);

            topCourses.add(TeacherCourseStatResponse.builder()
                    .courseId(course.getId())
                    .title(course.getTitle())
                    .totalStudents(course.getTotalStudents() != null ? course.getTotalStudents().longValue() : 0L)
                    .averageRating(course.getAverageRating() != null ? course.getAverageRating() : BigDecimal.ZERO)
                    .netEarnings(courseEarnings)
                    .completionRate(courseCompletionRate)
                    .status(course.getStatus().name())
                    .build());
        }

        // Sort by totalStudents descending
        topCourses.sort((a, b) -> Long.compare(b.getTotalStudents(), a.getTotalStudents()));

        return topCourses;
    }
}
