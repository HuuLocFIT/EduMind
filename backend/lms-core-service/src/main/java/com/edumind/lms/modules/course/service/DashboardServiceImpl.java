package com.edumind.lms.modules.course.service;

import com.edumind.lms.modules.course.dto.response.CategoryStatResponse;
import com.edumind.lms.modules.course.dto.response.DashboardStatsResponse;
import com.edumind.lms.modules.course.dto.response.MonthlyStatResponse;
import com.edumind.lms.modules.course.enums.CourseStatus;
import com.edumind.lms.modules.course.enums.EnrollmentStatus;
import com.edumind.lms.modules.course.enums.ReportRequestStatus;
import com.edumind.lms.modules.course.repository.CourseRepository;
import com.edumind.lms.modules.course.repository.EnrollmentReportRequestRepository;
import com.edumind.lms.modules.course.repository.EnrollmentRepository;
import com.edumind.lms.modules.payment.enums.RefundStatus;
import com.edumind.lms.modules.payment.repository.OrderRepository;
import com.edumind.lms.modules.payment.repository.RefundRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardServiceImpl implements DashboardService {
    private final EnrollmentRepository enrollmentRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentReportRequestRepository enrollmentReportRequestRepository;
    private final OrderRepository orderRepository;
    private final RefundRequestRepository refundRequestRepository;

    private static final DateTimeFormatter MONTH_FORMATTER = DateTimeFormatter.ofPattern("MMM yyyy");

    @Override
    public DashboardStatsResponse getDashboardStats() {
        log.info("Fetching dashboard statistics");

        // Enrollment stats
        long totalEnrollments = enrollmentRepository.count();
        long activeEnrollments = enrollmentRepository.countByStatus(EnrollmentStatus.ACTIVE);
        long completedEnrollments = enrollmentRepository.countByStatus(EnrollmentStatus.COMPLETED);

        // Course stats
        long totalCourses = courseRepository.count();
        long publishedCourses = courseRepository.countByStatus(CourseStatus.PUBLISHED);
        long pendingReviewCourses = courseRepository.countByStatus(CourseStatus.PENDING_REVIEW);
        long draftCourses = courseRepository.countByStatus(CourseStatus.DRAFT);
        long archivedCourses = courseRepository.countByStatus(CourseStatus.ARCHIVED);

        // Revenue stats
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfThisMonth = now.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime startOfLastMonth = startOfThisMonth.minusMonths(1);
        LocalDateTime endOfLastMonth = startOfThisMonth.minusNanos(1);

        BigDecimal totalRevenue = orderRepository.getTotalRevenueByDateRange(
                LocalDateTime.of(2000, 1, 1, 0, 0), now);
        BigDecimal revenueThisMonth = orderRepository.getTotalRevenueByDateRange(startOfThisMonth, now);
        BigDecimal revenueLastMonth = orderRepository.getTotalRevenueByDateRange(startOfLastMonth, endOfLastMonth);

        // Pending items
        long pendingEnrollmentReports = enrollmentReportRequestRepository
                .findAllByStatus(ReportRequestStatus.PENDING, org.springframework.data.domain.PageRequest.of(0, 1))
                .getTotalElements();
        long pendingRefunds = refundRequestRepository.countByStatus(RefundStatus.PENDING);

        // Monthly enrollment data (last 6 months)
        List<MonthlyStatResponse> monthlyEnrollments = buildMonthlyEnrollments();

        // Monthly revenue data (last 6 months)
        List<MonthlyStatResponse> monthlyRevenue = buildMonthlyRevenue();

        // Courses by category
        List<CategoryStatResponse> coursesByCategory = buildCoursesByCategory();

        return DashboardStatsResponse.builder()
                .totalEnrollments(totalEnrollments)
                .activeEnrollments(activeEnrollments)
                .completedEnrollments(completedEnrollments)
                .totalCourses(totalCourses)
                .publishedCourses(publishedCourses)
                .pendingReviewCourses(pendingReviewCourses)
                .draftCourses(draftCourses)
                .archivedCourses(archivedCourses)
                .totalRevenue(totalRevenue != null ? totalRevenue : BigDecimal.ZERO)
                .revenueThisMonth(revenueThisMonth != null ? revenueThisMonth : BigDecimal.ZERO)
                .revenueLastMonth(revenueLastMonth != null ? revenueLastMonth : BigDecimal.ZERO)
                .pendingEnrollmentReports(pendingEnrollmentReports)
                .pendingRefunds(pendingRefunds)
                .monthlyEnrollments(monthlyEnrollments)
                .monthlyRevenue(monthlyRevenue)
                .coursesByCategory(coursesByCategory)
                .build();
    }

    private List<MonthlyStatResponse> buildMonthlyEnrollments() {
        List<Object[]> results = enrollmentRepository.getMonthlyEnrollmentCounts();
        Map<String, Long> enrollmentMap = results.stream()
                .collect(Collectors.toMap(
                        row -> (String) row[0],
                        row -> ((Number) row[1]).longValue()
                ));

        List<MonthlyStatResponse> monthlyEnrollments = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
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

    private List<MonthlyStatResponse> buildMonthlyRevenue() {
        List<MonthlyStatResponse> monthlyRevenue = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        for (int i = 5; i >= 0; i--) {
            LocalDateTime monthStart = now.minusMonths(i).withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
            LocalDateTime monthEnd = monthStart.plusMonths(1).minusNanos(1);
            String monthKey = monthStart.format(MONTH_FORMATTER);
            BigDecimal revenue = orderRepository.getTotalRevenueByDateRange(monthStart, monthEnd);
            monthlyRevenue.add(MonthlyStatResponse.builder()
                    .month(monthKey)
                    .amount(revenue != null ? revenue : BigDecimal.ZERO)
                    .build());
        }
        return monthlyRevenue;
    }

    private List<CategoryStatResponse> buildCoursesByCategory() {
        List<Object[]> results = courseRepository.countCoursesByCategory();
        return results.stream()
                .limit(8) // Top 8 categories
                .map(row -> CategoryStatResponse.builder()
                        .categoryName((String) row[0])
                        .courseCount(((Number) row[1]).longValue())
                        .build())
                .collect(Collectors.toList());
    }
}
