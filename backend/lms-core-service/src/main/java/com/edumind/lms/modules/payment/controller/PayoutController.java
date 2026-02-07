package com.edumind.lms.modules.payment.controller;

import com.edumind.common.response.ApiResponse;
import com.edumind.lms.modules.payment.dto.request.CreatePayoutRequestDto;
import com.edumind.lms.modules.payment.dto.request.UpdatePayoutRequestDto;
import com.edumind.lms.modules.payment.dto.response.PayoutResponseDto;
import com.edumind.lms.modules.payment.dto.response.PayoutSummaryDto;
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
    public ResponseEntity<ApiResponse<Page<PayoutResponseDto>>> getInstructorPayouts(
            @PageableDefault(size = 20) Pageable pageable,
            Authentication authentication) {

        Long instructorId = extractUserId(authentication);
        log.info("Instructor {} fetching payout history", instructorId);

        Page<PayoutResponseDto> payouts = payoutService.getInstructorPayouts(instructorId, pageable);

        return ResponseEntity.ok(ApiResponse.success(payouts));
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

    // ==================== Admin Endpoints ====================

    /**
     * Admin: Get all pending payouts
     * GET /api/instructors/payouts/admin/pending
     */
    @GetMapping("/admin/pending")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<PayoutResponseDto>>> getPendingPayoutsAdmin(
            @PageableDefault(size = 20) Pageable pageable) {

        log.info("Admin fetching pending payouts");

        Page<PayoutResponseDto> payouts = payoutService.getPendingPayouts(pageable);

        return ResponseEntity.ok(ApiResponse.success(payouts));
    }

    /**
     * Admin: Get all payouts
     * GET /api/instructors/payouts/admin
     */
    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<PayoutResponseDto>>> getAllPayoutsAdmin(
            @PageableDefault(size = 20) Pageable pageable) {

        log.info("Admin fetching all payouts");

        Page<PayoutResponseDto> payouts = payoutService.getAllPayouts(pageable);

        return ResponseEntity.ok(ApiResponse.success(payouts));
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
