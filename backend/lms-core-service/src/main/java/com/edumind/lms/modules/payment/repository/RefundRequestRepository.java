package com.edumind.lms.modules.payment.repository;

import com.edumind.lms.modules.payment.entity.RefundRequest;
import com.edumind.lms.modules.payment.enums.RefundStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RefundRequestRepository extends JpaRepository<RefundRequest, Long> {

    // Find by order ID
    Optional<RefundRequest> findByOrderId(Long orderId);

    // Find by user ID
    Page<RefundRequest> findByUserIdOrderByRequestedAtDesc(Long userId, Pageable pageable);

    // Find by status
    Page<RefundRequest> findByStatusOrderByRequestedAtDesc(RefundStatus status, Pageable pageable);

    // Find by multiple statuses (for admin: PENDING and FAILED refunds that need attention)
    Page<RefundRequest> findByStatusInOrderByRequestedAtDesc(List<RefundStatus> statuses, Pageable pageable);

    // Find pending refunds
    List<RefundRequest> findByStatusOrderByRequestedAtAsc(RefundStatus status);

    // Find by order ID and status
    Optional<RefundRequest> findByOrderIdAndStatus(Long orderId, RefundStatus status);

    // Check if order has any refund request
    boolean existsByOrderId(Long orderId);

    // Find by gateway refund ID (e.g., PayPal refund ID from webhook)
    Optional<RefundRequest> findByGatewayRefundId(String gatewayRefundId);

    // Count by status
    long countByStatus(RefundStatus status);
}
