package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.payment.dto.request.CreatePayoutRequestDto;
import com.edumind.lms.modules.payment.dto.request.UpdatePayoutRequestDto;
import com.edumind.lms.modules.payment.dto.response.PayoutResponseDto;
import com.edumind.lms.modules.payment.dto.response.PayoutSummaryDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface PayoutService {

    /**
     * Create a payout for an instructor (manual or scheduled)
     */
    PayoutResponseDto createPayout(Long instructorId, CreatePayoutRequestDto request);

    /**
     * Admin: Update payout recipient info and payment method before processing
     */
    PayoutResponseDto updatePayout(Long payoutId, UpdatePayoutRequestDto request);

    /**
     * Process a payout via gateway
     */
    PayoutResponseDto processPayout(Long payoutId);

    /**
     * Get payout by ID
     */
    PayoutResponseDto getPayoutById(Long payoutId, Long instructorId);

    /**
     * Get instructor's payout history
     */
    Page<PayoutResponseDto> getInstructorPayouts(Long instructorId, Pageable pageable);

    /**
     * Get payout summary for instructor
     */
    PayoutSummaryDto getPayoutSummary(Long instructorId);

    /**
     * Admin: Get all pending payouts
     */
    Page<PayoutResponseDto> getPendingPayouts(Pageable pageable);

    /**
     * Admin: Get all payouts
     */
    Page<PayoutResponseDto> getAllPayouts(Pageable pageable);

    /**
     * Schedule monthly payouts (called by scheduler)
     */
    List<PayoutResponseDto> scheduleMonthlyPayouts();
}
