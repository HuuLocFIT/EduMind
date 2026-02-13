package com.edumind.lms.modules.payment.controller;

import com.edumind.common.response.ApiResponse;
import com.edumind.common.response.PagedResponse;
import com.edumind.lms.modules.payment.dto.request.ConfirmManualPayoutRequestDto;
import com.edumind.lms.modules.payment.dto.request.CreatePayoutRequestDto;
import com.edumind.lms.modules.payment.dto.request.UpdatePayoutRequestDto;
import com.edumind.lms.modules.payment.dto.request.PayoutSettingsDto;
import com.edumind.lms.modules.payment.dto.response.PayoutResponseDto;
import com.edumind.lms.modules.payment.dto.response.PayoutSummaryDto;
import com.edumind.lms.modules.payment.enums.PayoutStatus;
import com.edumind.lms.modules.payment.service.PayoutService;
import com.edumind.lms.config.security.JwtUserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/instructors/payouts")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("@teacherSecurity.isActiveTeacherOrStudent(authentication.principal.userId)")
public class PayoutController {

    private final PayoutService payoutService;

    /**
     * Get instructor's payout history
     * GET /api/instructors/payouts
     */
    @GetMapping
    public ResponseEntity<PagedResponse<PayoutResponseDto>> getInstructorPayouts(
            @PageableDefault(size = 20) Pageable pageable,
            Authentication authentication) {

        Long instructorId = extractUserId(authentication);
        log.info("Instructor {} fetching payout history", instructorId);

        Page<PayoutResponseDto> payouts = payoutService.getInstructorPayouts(instructorId, pageable);

        return ResponseEntity.ok(PagedResponse.of(
                payouts.getContent(),
                payouts.getNumber(),
                payouts.getSize(),
                payouts.getTotalElements(),
                payouts.getTotalPages()));
    }

    /**
     * Get payout by ID
     * GET /api/instructors/payouts/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PayoutResponseDto>> getPayoutById(
            @PathVariable Long id,
            Authentication authentication) {

        Long instructorId = extractUserId(authentication);
        log.info("Instructor {} fetching payout {}", instructorId, id);

        PayoutResponseDto payout = payoutService.getPayoutById(id, instructorId);

        return ResponseEntity.ok(ApiResponse.success(payout));
    }

    /**
     * Get payout summary for instructor
     * GET /api/instructors/payouts/summary
     */
    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<PayoutSummaryDto>> getPayoutSummary(
            Authentication authentication) {

        Long instructorId = extractUserId(authentication);
        log.info("Instructor {} fetching payout summary", instructorId);

        PayoutSummaryDto summary = payoutService.getPayoutSummary(instructorId);

        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    /**
     * Get instructor payout settings (bank / PayPal)
     * GET /api/instructors/payouts/payment-settings
     */
    @GetMapping("/payment-settings")
    public ResponseEntity<ApiResponse<PayoutSettingsDto>> getPayoutSettings(Authentication authentication) {
        Long instructorId = extractUserId(authentication);
        log.info("Instructor {} fetching payout settings", instructorId);

        PayoutSettingsDto settings = payoutService.getPayoutSettings(instructorId);
        return ResponseEntity.ok(ApiResponse.success(settings));
    }

    /**
     * Update instructor payout settings (bank / PayPal)
     * PUT /api/instructors/payouts/payment-settings
     */
    @PutMapping("/payment-settings")
    public ResponseEntity<ApiResponse<PayoutSettingsDto>> updatePayoutSettings(
            @Valid @RequestBody PayoutSettingsDto request,
            Authentication authentication) {
        Long instructorId = extractUserId(authentication);
        log.info("Instructor {} updating payout settings", instructorId);

        PayoutSettingsDto settings = payoutService.updatePayoutSettings(instructorId, request);
        return ResponseEntity.ok(ApiResponse.success("Payout settings updated", settings));
    }

    // ==================== Admin Endpoints ====================

    /**
     * Admin: Get all pending payouts
     * GET /api/instructors/payouts/admin/pending
     */
    @GetMapping("/admin/pending")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PagedResponse<PayoutResponseDto>> getPendingPayoutsAdmin(
            @PageableDefault(size = 20) Pageable pageable) {

        log.info("Admin fetching pending payouts");

        Page<PayoutResponseDto> payouts = payoutService.getPendingPayouts(pageable);

        return ResponseEntity.ok(PagedResponse.of(
                payouts.getContent(),
                payouts.getNumber(),
                payouts.getSize(),
                payouts.getTotalElements(),
                payouts.getTotalPages()));
    }

    /**
     * Admin: Get all payouts (optionally filtered by status)
     * GET /api/instructors/payouts/admin?status=PENDING
     */
    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PagedResponse<PayoutResponseDto>> getAllPayoutsAdmin(
            @RequestParam(required = false) String status,
            @PageableDefault(size = 20) Pageable pageable) {

        log.info("Admin fetching all payouts, status filter: {}", status);

        Page<PayoutResponseDto> payouts;
        if (status != null && !status.isBlank()) {
            PayoutStatus payoutStatus = PayoutStatus.valueOf(status.toUpperCase());
            payouts = payoutService.getAllPayouts(payoutStatus, pageable);
        } else {
            payouts = payoutService.getAllPayouts(pageable);
        }

        return ResponseEntity.ok(PagedResponse.of(
                payouts.getContent(),
                payouts.getNumber(),
                payouts.getSize(),
                payouts.getTotalElements(),
                payouts.getTotalPages()));
    }

    /**
     * Admin: Create payout manually
     * POST /api/instructors/payouts/admin
     */
    @PostMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PayoutResponseDto>> createPayoutAdmin(
            @Valid @RequestBody CreatePayoutRequestDto request) {

        log.info("Admin creating payout for instructor {}", request.getInstructorId());

        PayoutResponseDto payout = payoutService.createPayout(request.getInstructorId(), request);

        return ResponseEntity.ok(ApiResponse.success("Payout created", payout));
    }

    /**
     * Admin: Update payout recipient info and payment method
     * PUT /api/instructors/payouts/admin/{id}
     */
    @PutMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PayoutResponseDto>> updatePayoutAdmin(
            @PathVariable Long id,
            @Valid @RequestBody UpdatePayoutRequestDto request) {

        log.info("Admin updating payout {}", id);

        PayoutResponseDto payout = payoutService.updatePayout(id, request);

        return ResponseEntity.ok(ApiResponse.success("Payout updated", payout));
    }

    /**
     * Admin: Process payout via gateway
     * POST /api/instructors/payouts/admin/{id}/process
     */
    @PostMapping("/admin/{id}/process")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PayoutResponseDto>> processPayoutAdmin(
            @PathVariable Long id) {

        log.info("Admin processing payout {}", id);

        PayoutResponseDto payout = payoutService.processPayout(id);

        return ResponseEntity.ok(ApiResponse.success("Payout processed", payout));
    }

    /**
     * Admin: Confirm manual payout after bank transfer
     * POST /api/instructors/payouts/admin/{id}/confirm-manual-payout
     */
    @PostMapping("/admin/{id}/confirm-manual-payout")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PayoutResponseDto>> confirmManualPayoutAdmin(
            @PathVariable Long id,
            @Valid @RequestBody ConfirmManualPayoutRequestDto request,
            Authentication authentication) {

        Long adminId = extractUserId(authentication);
        log.info("Admin {} confirming manual payout {}", adminId, id);

        PayoutResponseDto payout = payoutService.confirmManualPayout(
                id, adminId, request.getBankTransferReference());

        return ResponseEntity.ok(ApiResponse.success("Manual payout confirmed", payout));
    }

    /**
     * Extract user ID from authentication
     */
    private Long extractUserId(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new IllegalStateException("User not authenticated");
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof JwtUserPrincipal) {
            return ((JwtUserPrincipal) principal).userId();
        }
        return Long.valueOf(principal.toString());
    }
}
