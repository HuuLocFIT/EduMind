package com.edumind.lms.modules.payment.repository;

import com.edumind.lms.modules.payment.entity.Payout;
import com.edumind.lms.modules.payment.enums.PayoutStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PayoutRepository extends JpaRepository<Payout, Long> {

    // Find by payout number
    Optional<Payout> findByPayoutNumber(String payoutNumber);

    // Find by instructor ID
    Page<Payout> findByInstructorIdOrderByCreatedAtDesc(Long instructorId, Pageable pageable);

    // Find by status
    Page<Payout> findByStatusOrderByScheduledAtDesc(PayoutStatus status, Pageable pageable);

    // Find pending payouts
    List<Payout> findByStatusOrderByScheduledAtAsc(PayoutStatus status);

    // Find by instructor and status
    Page<Payout> findByInstructorIdAndStatusOrderByCreatedAtDesc(
            Long instructorId, PayoutStatus status, Pageable pageable);

    // Find payouts for a date range
    @Query("SELECT p FROM Payout p WHERE p.instructorId = :instructorId " +
           "AND p.createdAt BETWEEN :startDate AND :endDate " +
           "ORDER BY p.createdAt DESC")
    Page<Payout> findByInstructorIdAndDateRange(
            @Param("instructorId") Long instructorId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable);

    // Find by multiple statuses (for pending payouts page)
    Page<Payout> findByStatusInOrderByScheduledAtDesc(List<PayoutStatus> statuses, Pageable pageable);

    // Count by status
    long countByStatus(PayoutStatus status);

    // Find failed payouts that can be retried
    List<Payout> findByStatusAndRetryCountLessThan(PayoutStatus status, Integer maxRetries);

    // Find payout by gateway batch/transaction ID (for webhook lookup)
    Optional<Payout> findByGatewayTransactionId(String gatewayTransactionId);
}
