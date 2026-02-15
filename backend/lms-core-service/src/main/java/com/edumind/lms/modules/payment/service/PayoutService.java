package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.payment.dto.request.CreatePayoutRequestDto;
import com.edumind.lms.modules.payment.dto.request.UpdatePayoutRequestDto;
import com.edumind.lms.modules.payment.dto.request.PayoutSettingsDto;
import com.edumind.lms.modules.payment.dto.response.PayoutResponseDto;
import com.edumind.lms.modules.payment.dto.response.PayoutSummaryDto;
import com.edumind.lms.modules.payment.enums.PayoutStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Map;

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
     * Admin: Get all payouts filtered by status
     */
    Page<PayoutResponseDto> getAllPayouts(PayoutStatus status, Pageable pageable);

    /**
     * Admin: Confirm manual payout after bank transfer
     */
    PayoutResponseDto confirmManualPayout(Long payoutId, Long adminId, String bankTransferReference);

    /**
     * Schedule monthly payouts (called by scheduler)
     */
    List<PayoutResponseDto> scheduleMonthlyPayouts();

    /**
     * Instructor: Get payout settings (bank / PayPal details)
     */
    PayoutSettingsDto getPayoutSettings(Long instructorId);

    /**
     * Instructor: Update payout settings (upsert)
     */
    PayoutSettingsDto updatePayoutSettings(Long instructorId, PayoutSettingsDto request);

    /**
     * Check status of payouts that are still in PROCESSING state.
     * Called by scheduler to finalize payouts that were accepted by the gateway
     * but hadn't completed within the initial polling window.
     */
    void checkProcessingPayouts();

    /**
     * Handle payout-related webhook events from PayPal.
     * Routes PAYOUTS-ITEM.SUCCEEDED/FAILED etc. to mark payouts as COMPLETED or FAILED.
     *
     * @param eventType The PayPal event type (e.g., "PAYMENT.PAYOUTS-ITEM.SUCCEEDED")
     * @param rawResource The raw resource map from the webhook payload
     */
    void handlePayoutWebhook(String eventType, Map<String, Object> rawResource);
}
