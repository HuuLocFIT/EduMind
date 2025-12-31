package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.payment.dto.response.EarningResponse;
import com.edumind.lms.modules.payment.dto.response.EarningsSummaryResponse;
import com.edumind.lms.modules.payment.entity.Order;
import com.edumind.lms.modules.payment.enums.EarningStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;

/**
 * Service to manage instructor earnings.
 */
public interface EarningService {

    /**
     * Create earnings for all instructors in an order
     */
    void createEarningsForOrder(Order order);

    /**
     * Get instructor's earnings summary
     */
    EarningsSummaryResponse getEarningsSummary(Long instructorId);

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
     * Mark earnings as available for payout
     */
    void markEarningsAvailable(Long earningId);

    /**
     * Mark earnings as paid
     */
    void markEarningsPaid(Long earningId, String payoutReference);
}
