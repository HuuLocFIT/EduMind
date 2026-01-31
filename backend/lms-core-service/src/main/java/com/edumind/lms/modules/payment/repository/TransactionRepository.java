package com.edumind.lms.modules.payment.repository;

import com.edumind.lms.modules.payment.entity.Transaction;
import com.edumind.lms.modules.payment.enums.PaymentMethod;
import com.edumind.lms.modules.payment.enums.TransactionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    Optional<Transaction> findByTransactionNumber(String transactionNumber);

    Optional<Transaction> findByGatewayTransactionId(String gatewayTransactionId);

    /**
     * Find transaction by gateway transaction ID with pessimistic write lock.
     * Use this for capture operations to prevent race conditions between
     * capture endpoint and webhook callbacks.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM Transaction t WHERE t.gatewayTransactionId = :gatewayTransactionId")
    Optional<Transaction> findByGatewayTransactionIdForUpdate(@Param("gatewayTransactionId") String gatewayTransactionId);

    /**
     * Find transaction by gateway order ID (original PayPal Order ID) with pessimistic write lock.
     * This is used for capture operations when the gatewayTransactionId has been updated to Capture ID.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM Transaction t WHERE t.gatewayOrderId = :gatewayOrderId")
    Optional<Transaction> findByGatewayOrderIdForUpdate(@Param("gatewayOrderId") String gatewayOrderId);

    /**
     * Find transaction by either gateway transaction ID or gateway order ID with pessimistic write lock.
     * Handles both initial lookup (by Order ID) and retry lookup (after Capture ID overwrite).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM Transaction t WHERE t.gatewayTransactionId = :id OR t.gatewayOrderId = :id")
    Optional<Transaction> findByGatewayIdForUpdate(@Param("id") String id);

    List<Transaction> findByOrderId(Long orderId);

    List<Transaction> findByOrderIdOrderByCreatedAtDesc(Long orderId);

    Optional<Transaction> findFirstByOrderIdOrderByCreatedAtDesc(Long orderId);

    Optional<Transaction> findFirstByOrderIdAndStatusOrderByCreatedAtDesc(Long orderId, TransactionStatus status);

    List<Transaction> findByOrderIdAndStatus(Long orderId, TransactionStatus status);

    // By status
    Page<Transaction> findByStatus(TransactionStatus status, Pageable pageable);

    Page<Transaction> findByGateway(PaymentMethod gateway, Pageable pageable);

    // Statistics
    @Query("SELECT COUNT(t) FROM Transaction t WHERE t.status = :status " +
            "AND t.createdAt BETWEEN :startDate AND :endDate")
    long countByStatusAndDateRange(
            @Param("status") TransactionStatus status,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    @Query("SELECT t.gateway, COUNT(t) FROM Transaction t " +
            "WHERE t.status = 'SUCCESS' GROUP BY t.gateway")
    List<Object[]> countSuccessfulByGateway();
}
