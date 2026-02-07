package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.payment.dto.request.RefundRequest;
import com.edumind.lms.modules.payment.dto.response.RefundPolicyResponseDto;
import com.edumind.lms.modules.payment.dto.response.RefundResponseDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface RefundService {

    /**
     * Request a refund for an order
     */
    RefundResponseDto requestRefund(Long userId, Long orderId, RefundRequest request);

    /**
     * Get refund policy information for an order
     */
    RefundPolicyResponseDto getRefundPolicy(Long userId, Long orderId);

    /**
     * Get user's refund history
     */
    Page<RefundResponseDto> getMyRefunds(Long userId, Pageable pageable);

    /**
     * Get refund by ID (for user)
     */
    RefundResponseDto getRefundById(Long userId, Long refundId);

    /**
     * Admin: Get pending refunds
     */
    Page<RefundResponseDto> getPendingRefunds(Pageable pageable);

    /**
     * Admin: Approve refund request
     */
    RefundResponseDto approveRefund(Long refundId, Long adminId);

    /**
     * Admin: Reject refund request
     */
    RefundResponseDto rejectRefund(Long refundId, Long adminId, String reason);

    /**
     * Process approved refund (called automatically or by admin)
     */
    RefundResponseDto processRefund(Long refundId);
}
