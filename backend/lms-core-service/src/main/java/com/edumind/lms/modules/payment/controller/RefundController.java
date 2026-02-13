package com.edumind.lms.modules.payment.controller;

import com.edumind.common.response.ApiResponse;
import com.edumind.common.response.PagedResponse;
import com.edumind.lms.modules.payment.dto.request.ApproveRefundRequestDto;
import com.edumind.lms.modules.payment.dto.request.ConfirmManualRefundRequestDto;
import com.edumind.lms.modules.payment.dto.request.RefundRequest;
import com.edumind.lms.modules.payment.dto.request.RejectRefundRequestDto;
import com.edumind.lms.modules.payment.dto.response.RefundPolicyResponseDto;
import com.edumind.lms.modules.payment.dto.response.RefundResponseDto;
import com.edumind.lms.modules.payment.enums.RefundStatus;
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
    public ResponseEntity<PagedResponse<RefundResponseDto>> getMyRefunds(
            @PageableDefault(size = 20) Pageable pageable,
            Authentication authentication) {

        Long userId = extractUserId(authentication);
        log.info("User {} fetching refund history", userId);

        Page<RefundResponseDto> refunds = refundService.getMyRefunds(userId, pageable);

        return ResponseEntity.ok(PagedResponse.of(
                refunds.getContent(),
                refunds.getNumber(),
                refunds.getSize(),
                refunds.getTotalElements(),
                refunds.getTotalPages()));
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

    /**
     * Get refund by order ID
     * GET /api/payments/refunds/by-order/{orderId}
     */
    @GetMapping("/by-order/{orderId}")
    public ResponseEntity<ApiResponse<RefundResponseDto>> getRefundByOrderId(
            @PathVariable Long orderId,
            Authentication authentication) {

        Long userId = extractUserId(authentication);
        log.info("User {} fetching refund for order {}", userId, orderId);

        RefundResponseDto refund = refundService.getRefundByOrderId(userId, orderId);

        return ResponseEntity.ok(ApiResponse.success(refund));
    }

    // ==================== Admin Endpoints ====================

    /**
     * Admin: Get pending refunds
     * GET /api/payments/refunds/admin/pending
     */
    @GetMapping("/admin/pending")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PagedResponse<RefundResponseDto>> getPendingRefundsAdmin(
            @PageableDefault(size = 20) Pageable pageable) {

        log.info("Admin fetching pending refunds");

        Page<RefundResponseDto> refunds = refundService.getPendingRefunds(pageable);

        return ResponseEntity.ok(PagedResponse.of(
                refunds.getContent(),
                refunds.getNumber(),
                refunds.getSize(),
                refunds.getTotalElements(),
                refunds.getTotalPages()));
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

        // Differentiate message based on refund status
        String message = refund.getStatus() == RefundStatus.AWAITING_MANUAL_REFUND
                ? "Refund approved. Manual bank transfer required."
                : "Refund approved and processed";

        return ResponseEntity.ok(ApiResponse.success(message, refund));
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
     * Admin: Confirm manual refund has been completed
     * POST /api/payments/refunds/admin/{id}/confirm-manual-refund
     * 
     * This endpoint is used for manual gateways (like SePay) where admin must
     * manually transfer money to the customer. After the transfer is done,
     * admin calls this endpoint to mark the refund as completed.
     */
    @PostMapping("/admin/{id}/confirm-manual-refund")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<RefundResponseDto>> confirmManualRefundAdmin(
            @PathVariable Long id,
            @Valid @RequestBody ConfirmManualRefundRequestDto request,
            Authentication authentication) {

        Long adminId = extractUserId(authentication);
        log.info("Admin {} confirming manual refund completion for refund {}", adminId, id);

        RefundResponseDto refund = refundService.confirmManualRefund(id, adminId, request.getBankTransferReference());

        return ResponseEntity.ok(ApiResponse.success("Manual refund confirmed and completed", refund));
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
