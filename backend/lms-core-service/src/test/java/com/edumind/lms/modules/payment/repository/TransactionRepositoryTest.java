package com.edumind.lms.modules.payment.repository;

import com.edumind.lms.config.BaseRepositoryTest;
import com.edumind.lms.modules.payment.PaymentTestHelper;
import com.edumind.lms.modules.payment.entity.Order;
import com.edumind.lms.modules.payment.entity.Transaction;
import com.edumind.lms.modules.payment.enums.PaymentMethod;
import com.edumind.lms.modules.payment.enums.TransactionStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Repository tests for TransactionRepository.
 * Uses Testcontainers with real PostgreSQL.
 */
@DisplayName("TransactionRepository Tests")
class TransactionRepositoryTest extends BaseRepositoryTest {

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private TestEntityManager entityManager;

    private Long userId = 101L;

    @BeforeEach
    void setUp() {
        PaymentTestHelper.resetCounters();
        entityManager.clear();
    }

    @Test
    @DisplayName("Should save and find transaction")
    void saveAndFind_ShouldPersistCorrectly() {
        // Given
        Order order = PaymentTestHelper.createOrder(userId, PaymentTestHelper.generateOrderNumber(), new BigDecimal("100.00"));
        entityManager.persist(order);

        Transaction txn = PaymentTestHelper.createTransaction(order, PaymentTestHelper.generateTransactionNumber(), new BigDecimal("100.00"));
        entityManager.persist(txn);
        entityManager.flush();

        // When
        List<Transaction> found = transactionRepository.findByOrderId(order.getId());

        // Then
        assertThat(found).hasSize(1);
        assertThat(found.get(0).getTransactionNumber()).isEqualTo(txn.getTransactionNumber());
    }

    @Test
    @DisplayName("Should count transactions by status and date range")
    void countByStatusAndDateRange_ShouldReturnCorrectCount() {
        // Given
        LocalDateTime now = LocalDateTime.now();
        Order order = PaymentTestHelper.createOrder(userId, PaymentTestHelper.generateOrderNumber(), new BigDecimal("100.00"));
        entityManager.persist(order);

        // Old transaction
        Transaction oldTxn = PaymentTestHelper.createSuccessfulTransaction(order, PaymentTestHelper.generateTransactionNumber(), new BigDecimal("50.00"));
        entityManager.persist(oldTxn);
        // Force update created_at for old transaction
        entityManager.getEntityManager()
                .createNativeQuery("UPDATE payment.transactions SET created_at = ? WHERE id = ?")
                .setParameter(1, now.minusDays(5))
                .setParameter(2, oldTxn.getId())
                .executeUpdate();

        // New transaction (Success)
        Transaction newTxn = PaymentTestHelper.createSuccessfulTransaction(order, PaymentTestHelper.generateTransactionNumber(), new BigDecimal("50.00"));
        entityManager.persist(newTxn);

        // New transaction (Failed)
        Transaction failedTxn = PaymentTestHelper.createFailedTransaction(order, PaymentTestHelper.generateTransactionNumber(), new BigDecimal("50.00"), "Failed");
        entityManager.persist(failedTxn);

        entityManager.flush();
        entityManager.clear();

        // When
        long count = transactionRepository.countByStatusAndDateRange(
                TransactionStatus.SUCCESS,
                now.minusDays(1),
                now.plusDays(1)
        );

        // Then
        // Expecting only newTxn (1)
        assertThat(count).isEqualTo(1);
    }

    @Test
    @DisplayName("Should count successful transactions grouped by gateway")
    void countSuccessfulByGateway_ShouldReturnGroupedStats() {
        // Given
        Order order = PaymentTestHelper.createOrder(userId, PaymentTestHelper.generateOrderNumber(), new BigDecimal("200.00"));
        entityManager.persist(order);

        // 2 MOCK Success
        entityManager.persist(PaymentTestHelper.createSuccessfulTransaction(order, PaymentTestHelper.generateTransactionNumber(), new BigDecimal("50.00")));
        entityManager.persist(PaymentTestHelper.createSuccessfulTransaction(order, PaymentTestHelper.generateTransactionNumber(), new BigDecimal("50.00")));
        
        // 1 PAYPAL Success (Manually set gateway)
        Transaction paypalTxn = PaymentTestHelper.createSuccessfulTransaction(order, PaymentTestHelper.generateTransactionNumber(), new BigDecimal("50.00"));
        paypalTxn.setGateway(PaymentMethod.PAYPAL);
        entityManager.persist(paypalTxn);

        // 1 MOCK Failed (Should be ignored)
        entityManager.persist(PaymentTestHelper.createFailedTransaction(order, PaymentTestHelper.generateTransactionNumber(), new BigDecimal("50.00"), "Error"));

        entityManager.flush();

        // When
        List<Object[]> stats = transactionRepository.countSuccessfulByGateway();

        // Then
        // Expecting [[MOCK, 2], [PAYPAL, 1]]
        assertThat(stats).hasSize(2);
        
        boolean foundMock = false;
        boolean foundPaypal = false;

        for (Object[] row : stats) {
            PaymentMethod gateway = (PaymentMethod) row[0];
            Long count = (Long) row[1];
            if (gateway == PaymentMethod.MOCK) {
                assertThat(count).isEqualTo(2L);
                foundMock = true;
            } else if (gateway == PaymentMethod.PAYPAL) {
                assertThat(count).isEqualTo(1L);
                foundPaypal = true;
            }
        }
        assertThat(foundMock).isTrue();
        assertThat(foundPaypal).isTrue();
    }

    // ===== Missing Tests for Lookups & Sorting =====

    @Test
    @DisplayName("Should find transaction by transaction number")
    void findByTransactionNumber_WhenExists_ShouldReturnTransaction() {
        // Given
        Order order = PaymentTestHelper.createOrder(userId, PaymentTestHelper.generateOrderNumber(), new BigDecimal("100.00"));
        entityManager.persist(order);
        String txnNum = PaymentTestHelper.generateTransactionNumber();
        Transaction txn = PaymentTestHelper.createTransaction(order, txnNum, new BigDecimal("100.00"));
        entityManager.persist(txn);
        entityManager.flush();

        // When
        Optional<Transaction> found = transactionRepository.findByTransactionNumber(txnNum);

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getTransactionNumber()).isEqualTo(txnNum);
    }

    @Test
    @DisplayName("Should return empty for non-existent transaction number")
    void findByTransactionNumber_WhenNotExists_ShouldReturnEmpty() {
        // When
        Optional<Transaction> found = transactionRepository.findByTransactionNumber("NON-EXISTENT-TXN");

        // Then
        assertThat(found).isEmpty();
    }

    @Test
    @DisplayName("Should find transaction by gateway transaction id")
    void findByGatewayTransactionId_WhenExists_ShouldReturnTransaction() {
        // Given
        Order order = PaymentTestHelper.createOrder(userId, PaymentTestHelper.generateOrderNumber(), new BigDecimal("100.00"));
        entityManager.persist(order);
        Transaction txn = PaymentTestHelper.createTransaction(order, PaymentTestHelper.generateTransactionNumber(), new BigDecimal("100.00"));
        String gatewayId = "gateway_12345";
        txn.setGatewayTransactionId(gatewayId);
        entityManager.persist(txn);
        entityManager.flush();

        // When
        Optional<Transaction> found = transactionRepository.findByGatewayTransactionId(gatewayId);

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getGatewayTransactionId()).isEqualTo(gatewayId);
    }

    @Test
    @DisplayName("Should find transactions by order ID descending by creation")
    void findByOrderIdOrderByCreatedAtDesc_ShouldReturnSortedList() throws InterruptedException {
        // Given
        Order order = PaymentTestHelper.createOrder(userId, PaymentTestHelper.generateOrderNumber(), new BigDecimal("100.00"));
        entityManager.persist(order);

        // Txn 1 (Older)
        Transaction txn1 = PaymentTestHelper.createTransaction(order, PaymentTestHelper.generateTransactionNumber(), new BigDecimal("50.00"));
        entityManager.persist(txn1);
        
        Thread.sleep(10); // Check timestamp gap

        // Txn 2 (Newer)
        Transaction txn2 = PaymentTestHelper.createTransaction(order, PaymentTestHelper.generateTransactionNumber(), new BigDecimal("50.00"));
        entityManager.persist(txn2);
        
        entityManager.flush();

        // When
        List<Transaction> found = transactionRepository.findByOrderIdOrderByCreatedAtDesc(order.getId());

        // Then
        assertThat(found).hasSize(2);
        assertThat(found.get(0).getId()).isEqualTo(txn2.getId()); // Newer first
        assertThat(found.get(1).getId()).isEqualTo(txn1.getId());
    }

    @Test
    @DisplayName("Should find first (latest) transaction by order ID")
    void findFirstByOrderIdOrderByCreatedAtDesc_ShouldReturnLatest() throws InterruptedException {
        // Given
        Order order = PaymentTestHelper.createOrder(userId, PaymentTestHelper.generateOrderNumber(), new BigDecimal("100.00"));
        entityManager.persist(order);

        // Txn 1 (Older)
        Transaction txn1 = PaymentTestHelper.createTransaction(order, PaymentTestHelper.generateTransactionNumber(), new BigDecimal("50.00"));
        entityManager.persist(txn1);
        
        Thread.sleep(10);

        // Txn 2 (Newer)
        Transaction txn2 = PaymentTestHelper.createTransaction(order, PaymentTestHelper.generateTransactionNumber(), new BigDecimal("50.00"));
        entityManager.persist(txn2);

        entityManager.flush();

        // When
        Optional<Transaction> latest = transactionRepository.findFirstByOrderIdOrderByCreatedAtDesc(order.getId());

        // Then
        assertThat(latest).isPresent();
        assertThat(latest.get().getId()).isEqualTo(txn2.getId());
    }

    // ===== Missing Tests for Pagination =====

    @Test
    @DisplayName("Should find transactions by status with pagination")
    void findByStatus_ShouldReturnPagedResults() {
        // Given
        Order order = PaymentTestHelper.createOrder(userId, PaymentTestHelper.generateOrderNumber(), new BigDecimal("100.00"));
        entityManager.persist(order);

        entityManager.persist(PaymentTestHelper.createSuccessfulTransaction(order, PaymentTestHelper.generateTransactionNumber(), BigDecimal.TEN));
        entityManager.persist(PaymentTestHelper.createSuccessfulTransaction(order, PaymentTestHelper.generateTransactionNumber(), BigDecimal.TEN));
        entityManager.persist(PaymentTestHelper.createFailedTransaction(order, PaymentTestHelper.generateTransactionNumber(), BigDecimal.TEN, "Err"));
        entityManager.flush();

        // When
        Page<Transaction> page = transactionRepository.findByStatus(TransactionStatus.SUCCESS, PageRequest.of(0, 10));

        // Then
        assertThat(page.getTotalElements()).isEqualTo(2);
        assertThat(page.getContent()).allMatch(t -> t.getStatus() == TransactionStatus.SUCCESS);
    }

    @Test
    @DisplayName("Should find transactions by gateway with pagination")
    void findByGateway_ShouldReturnPagedResults() {
        // Given
        Order order = PaymentTestHelper.createOrder(userId, PaymentTestHelper.generateOrderNumber(), new BigDecimal("100.00"));
        entityManager.persist(order);

        Transaction t1 = PaymentTestHelper.createSuccessfulTransaction(order, PaymentTestHelper.generateTransactionNumber(), BigDecimal.TEN);
        t1.setGateway(PaymentMethod.MOCK);
        entityManager.persist(t1);

        Transaction t2 = PaymentTestHelper.createSuccessfulTransaction(order, PaymentTestHelper.generateTransactionNumber(), BigDecimal.TEN);
        t2.setGateway(PaymentMethod.PAYPAL);
        entityManager.persist(t2);
        entityManager.flush();

        // When
        Page<Transaction> page = transactionRepository.findByGateway(PaymentMethod.MOCK, PageRequest.of(0, 10));

        // Then
        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent().get(0).getGateway()).isEqualTo(PaymentMethod.MOCK);
    }

    @Test
    @DisplayName("Should find first PENDING transaction by order ID and status")
    void findFirstByOrderIdAndStatusOrderByCreatedAtDesc_WithPendingStatus_ShouldReturnLatestPending() throws InterruptedException {
        // Given
        Order order = PaymentTestHelper.createOrder(userId, PaymentTestHelper.generateOrderNumber(), new BigDecimal("100.00"));
        entityManager.persist(order);

        // Older PENDING transaction
        Transaction pending1 = PaymentTestHelper.createTransaction(order, PaymentTestHelper.generateTransactionNumber(), new BigDecimal("50.00"));
        pending1.setStatus(TransactionStatus.PENDING);
        entityManager.persist(pending1);
        
        Thread.sleep(10);

        // Newer SUCCESS transaction (should be ignored)
        Transaction success = PaymentTestHelper.createSuccessfulTransaction(order, PaymentTestHelper.generateTransactionNumber(), new BigDecimal("50.00"));
        entityManager.persist(success);
        
        Thread.sleep(10);

        // Newest PENDING transaction (should be returned)
        Transaction pending2 = PaymentTestHelper.createTransaction(order, PaymentTestHelper.generateTransactionNumber(), new BigDecimal("50.00"));
        pending2.setStatus(TransactionStatus.PENDING);
        entityManager.persist(pending2);
        
        entityManager.flush();

        // When
        Optional<Transaction> found = transactionRepository.findFirstByOrderIdAndStatusOrderByCreatedAtDesc(
                order.getId(), TransactionStatus.PENDING);

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getId()).isEqualTo(pending2.getId());
        assertThat(found.get().getStatus()).isEqualTo(TransactionStatus.PENDING);
    }

    @Test
    @DisplayName("Should return empty when no PENDING transaction exists")
    void findFirstByOrderIdAndStatusOrderByCreatedAtDesc_NoPending_ShouldReturnEmpty() {
        // Given
        Order order = PaymentTestHelper.createOrder(userId, PaymentTestHelper.generateOrderNumber(), new BigDecimal("100.00"));
        entityManager.persist(order);

        // Only SUCCESS transaction
        Transaction success = PaymentTestHelper.createSuccessfulTransaction(order, PaymentTestHelper.generateTransactionNumber(), new BigDecimal("100.00"));
        entityManager.persist(success);
        entityManager.flush();

        // When
        Optional<Transaction> found = transactionRepository.findFirstByOrderIdAndStatusOrderByCreatedAtDesc(
                order.getId(), TransactionStatus.PENDING);

        // Then
        assertThat(found).isEmpty();
    }

    @Test
    @DisplayName("Should find first FAILED transaction by order ID and status")
    void findFirstByOrderIdAndStatusOrderByCreatedAtDesc_WithFailedStatus_ShouldReturnLatestFailed() throws InterruptedException {
        // Given
        Order order = PaymentTestHelper.createOrder(userId, PaymentTestHelper.generateOrderNumber(), new BigDecimal("100.00"));
        entityManager.persist(order);

        // Older FAILED transaction
        Transaction failed1 = PaymentTestHelper.createFailedTransaction(order, PaymentTestHelper.generateTransactionNumber(), new BigDecimal("50.00"), "Error 1");
        entityManager.persist(failed1);
        
        Thread.sleep(10);

        // Newer FAILED transaction (should be returned)
        Transaction failed2 = PaymentTestHelper.createFailedTransaction(order, PaymentTestHelper.generateTransactionNumber(), new BigDecimal("50.00"), "Error 2");
        entityManager.persist(failed2);
        
        entityManager.flush();

        // When
        Optional<Transaction> found = transactionRepository.findFirstByOrderIdAndStatusOrderByCreatedAtDesc(
                order.getId(), TransactionStatus.FAILED);

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getId()).isEqualTo(failed2.getId());
        assertThat(found.get().getStatus()).isEqualTo(TransactionStatus.FAILED);
        assertThat(found.get().getFailureReason()).isEqualTo("Error 2");
    }
}
