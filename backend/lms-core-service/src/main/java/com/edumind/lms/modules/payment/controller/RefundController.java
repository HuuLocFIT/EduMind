package com.edumind.lms.modules.payment.controller;

import com.edumind.common.response.ApiResponse;
import com.edumind.lms.modules.payment.dto.request.ApproveRefundRequestDto;
import com.edumind.lms.modules.payment.dto.request.RefundRequest;
import com.edumind.lms.modules.payment.dto.request.RejectRefundRequestDto;
import com.edumind.lms.modules.payment.dto.response.RefundPolicyResponseDto;
import com.edumind.lms.modules.payment.dto.response.RefundResponseDto;
import com.edumind.lms.modules.payment.service.RefundService;
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
@RequestMapping("/payments/refunds")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("@teacherSecurity.isActiveTeacherOrStudent(authentication.principal.userId)")
public class RefundController {

    private final RefundService refundService;

    /**
     * Request a refund for an order
     * POST /api/payments/refunds/request
     */
    @PostMapping("/request")
    public ResponseEntity<ApiResponse<RefundResponseDto>> requestRefund(
            @Valid @RequestBody RefundRequest request,
            Authentication authentication) {

        Long userId = extractUserId(authentication);
        log.info("User {} requesting refund for order {}", userId, request.getOrderId());

        RefundResponseDto response = refundService.requestRefund(userId, request.getOrderId(), request);

        return ResponseEntity.ok(ApiResponse.success("Refund request submitted", response));
    }

    /**
     * Get refund policy for an order
     * GET /api/payments/refunds/policy?orderId=...
     */
    @GetMapping("/policy")
    public ResponseEntity<ApiResponse<RefundPolicyResponseDto>> getRefundPolicy(
            @RequestParam Long orderId,
            Authentication authentication) {

        Long userId = extractUserId(authentication);
        log.info("User {} checking refund policy for order {}", userId, orderId);

        RefundPolicyResponseDto policy = refundService.getRefundPolicy(userId, orderId);

        return ResponseEntity.ok(ApiResponse.success(policy));
    }

    /**
     * Get user's refund history
     * GET /api/payments/refunds/my-refunds
     */
    @GetMapping("/my-refunds")
    public ResponseEntity<ApiResponse<Page<RefundResponseDto>>> getMyRefunds(
            @PageableDefault(size = 20) Pageable pageable,
            Authentication authentication) {

        Long userId = extractUserId(authentication);
        log.info("User {} fetching refund history", userId);

        Page<RefundResponseDto> refunds = refundService.getMyRefunds(userId, pageable);

        return ResponseEntity.ok(ApiResponse.success(refunds));
    }

    /**
     * Get refund by ID
     * GET /api/payments/refunds/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RefundResponseDto>> getRefundById(
            @PathVariable Long id,
            Authentication authentication) {

        Long userId = extractUserId(authentication);
        log.info("User {} fetching refund {}", userId, id);

        RefundResponseDto refund = refundService.getRefundById(userId, id);

        return ResponseEntity.ok(ApiResponse.success(refund));
    }

    // ==================== Admin Endpoints ====================

    /**
     * Admin: Get pending refunds
     * GET /api/payments/refunds/admin/pending
     */
    @GetMapping("/admin/pending")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<RefundResponseDto>>> getPendingRefundsAdmin(
            @PageableDefault(size = 20) Pageable pageable) {

        log.info("Admin fetching pending refunds");

        Page<RefundResponseDto> refunds = refundService.getPendingRefunds(pageable);

        return ResponseEntity.ok(ApiResponse.success(refunds));
    }

    /**
     * Admin: Approve refund request
     * POST /api/payments/refunds/admin/{id}/approve
     */
    @PostMapping("/admin/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<RefundResponseDto>> approveRefundAdmin(
            @PathVariable Long id,
            @RequestBody(required = false) ApproveRefundRequestDto request,
            Authentication authentication) {

        Long adminId = extractUserId(authentication);
        log.info("Admin {} approving refund {}", adminId, id);

        RefundResponseDto refund = refundService.approveRefund(id, adminId);

        return ResponseEntity.ok(ApiResponse.success("Refund approved and processed", refund));
    }

    /**
     * Admin: Reject refund request
     * POST /api/payments/refunds/admin/{id}/reject
     */
    @PostMapping("/admin/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<RefundResponseDto>> rejectRefundAdmin(
            @PathVariable Long id,
            @Valid @RequestBody RejectRefundRequestDto request,
            Authentication authentication) {

        Long adminId = extractUserId(authentication);
        log.info("Admin {} rejecting refund {}", adminId, id);

        RefundResponseDto refund = refundService.rejectRefund(id, adminId, request.getReason());

        return ResponseEntity.ok(ApiResponse.success("Refund request rejected", refund));
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
