package com.edumind.lms.modules.payment.repository;

import com.edumind.lms.config.JpaAuditingConfig;
import com.edumind.lms.modules.payment.PaymentTestHelper;
import com.edumind.lms.modules.payment.entity.Order;
import com.edumind.lms.modules.payment.entity.Transaction;
import com.edumind.lms.modules.payment.enums.PaymentMethod;
import com.edumind.lms.modules.payment.enums.TransactionStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@Import(JpaAuditingConfig.class)
@DisplayName("TransactionRepository Tests")
class TransactionRepositoryTest {

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
}
