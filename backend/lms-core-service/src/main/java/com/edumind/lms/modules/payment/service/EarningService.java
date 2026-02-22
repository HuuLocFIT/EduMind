package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.payment.dto.response.CourseEarningResponse;
import com.edumind.lms.modules.payment.dto.response.EarningResponse;
import com.edumind.lms.modules.payment.dto.response.EarningsSummaryResponse;
import com.edumind.lms.modules.payment.dto.response.MonthlyEarningResponse;
import com.edumind.lms.modules.payment.entity.Order;
import com.edumind.lms.modules.payment.enums.EarningStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;

/**
 * Service to manage instructor earnings.
 */
public interface EarningService {

    /**
     * Create earnings for all instructors in an order
     */
    void createEarningsForOrder(Order order);

    /**
     * Create earnings for all instructors in an order (loads order internally).
     * Useful for event-driven listeners where only the orderId is available.
     */
    void createEarningsForOrder(Long orderId);

    /**
     * Get instructor's earnings summary
     */
    EarningsSummaryResponse getEarningsSummary(Long instructorId);

    /**
     * Get instructor's earnings summary for date range
     */
    EarningsSummaryResponse getEarningsSummary(Long instructorId, LocalDate fromDate, LocalDate toDate);

    /**
     * Get instructor's earnings with pagination
     */
    Page<EarningResponse> getInstructorEarnings(Long instructorId, Pageable pageable);

    /**
     * Get instructor's earnings by status
     */
    Page<EarningResponse> getInstructorEarningsByStatus(Long instructorId,
                                                        EarningStatus status,
                                                        Pageable pageable);

    /**
     * Get instructor's earnings for date range
     */
    Page<EarningResponse> getInstructorEarningsForPeriod(Long instructorId,
                                                         LocalDate startDate,
                                                         LocalDate endDate,
                                                         Pageable pageable);

    /**
     * Get instructor's earnings with filters (status, courseId, date range)
     */
    Page<EarningResponse> getEarningsByInstructor(Long instructorId,
                                                  EarningStatus status,
                                                  Long courseId,
                                                  LocalDate fromDate,
                                                  LocalDate toDate,
                                                  Pageable pageable);

    /**
     * Get monthly earnings for instructor
     */
    List<MonthlyEarningResponse> getMonthlyEarnings(Long instructorId, int months);

    /**
     * Get earnings grouped by course
     */
    List<CourseEarningResponse> getEarningsByCourse(Long instructorId, LocalDate fromDate, LocalDate toDate);

    /**
     * Export earnings to CSV
     */
    byte[] exportEarningsToCsv(Long instructorId, LocalDate fromDate, LocalDate toDate, EarningStatus status);

    /**
     * Get earning by ID with instructor ownership check
     */
    EarningResponse getEarningByIdAndInstructor(Long earningId, Long instructorId);

    /**
     * Mark earnings as available for payout
     */
    void markEarningsAvailable(Long earningId);

    /**
     * Mark earnings as paid
     */
    void markEarningsPaid(Long earningId, String payoutReference);
}
