package com.edumind.lms.modules.payment.repository;

import com.edumind.lms.modules.payment.PaymentTestHelper;
import com.edumind.lms.modules.payment.entity.Order;
import com.edumind.lms.modules.payment.entity.OrderItem;
import com.edumind.lms.modules.payment.entity.Transaction;
import com.edumind.lms.modules.payment.enums.OrderStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import com.edumind.lms.config.JpaAuditingConfig;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@Import(JpaAuditingConfig.class)
@DisplayName("OrderRepository Tests")
class OrderRepositoryTest {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private TestEntityManager entityManager;

    private Long userId = 101L;

    @BeforeEach
    void setUp() {
        PaymentTestHelper.resetCounters();
        entityManager.clear();
    }

    @Test
    @DisplayName("Should find order by order number")
    void findByOrderNumber_WhenExists_ShouldReturnOrder() {
        // Given
        String orderNum = PaymentTestHelper.generateOrderNumber();
        Order order = PaymentTestHelper.createOrder(userId, orderNum, new BigDecimal("100.00"));
        entityManager.persist(order);
        entityManager.flush();

        // When
        Optional<Order> found = orderRepository.findByOrderNumber(orderNum);

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getOrderNumber()).isEqualTo(orderNum);
    }

    @Test
    @DisplayName("Should find order with items by ID using EntityGraph")
    void findWithItemsById_ShouldFetchItemsEagerly() {
        // Given
        Order order = PaymentTestHelper.createOrder(userId, PaymentTestHelper.generateOrderNumber(), new BigDecimal("100.00"));
        OrderItem item = PaymentTestHelper.createOrderItem(PaymentTestHelper.NON_EXISTENT_COURSE_ID, 1L, new BigDecimal("100.00"), new BigDecimal("100.00"));
        order.addItem(item);
        
        entityManager.persist(order);
        entityManager.flush();
        entityManager.clear();

        // When
        Optional<Order> result = orderRepository.findWithItemsById(order.getId());

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getItems()).hasSize(1);
        assertThat(result.get().getItems().iterator().next().getCourseId()).isEqualTo(PaymentTestHelper.NON_EXISTENT_COURSE_ID);
    }

    @Test
    @DisplayName("Should find order with items and transactions by ID")
    void findWithItemsAndTransactionsById_ShouldFetchEverything() {
        // Given
        Order order = PaymentTestHelper.createOrder(userId, PaymentTestHelper.generateOrderNumber(), new BigDecimal("100.00"));
        OrderItem item = PaymentTestHelper.createOrderItem(PaymentTestHelper.NON_EXISTENT_COURSE_ID, 1L, new BigDecimal("100.00"), new BigDecimal("100.00"));
        order.addItem(item);

        Transaction txn = PaymentTestHelper.createTransaction(order, PaymentTestHelper.generateTransactionNumber(), new BigDecimal("100.00"));
        order.addTransaction(txn);

        entityManager.persist(order);
        entityManager.flush();
        entityManager.clear();

        // When
        Optional<Order> result = orderRepository.findWithItemsAndTransactionsById(order.getId());

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getItems()).hasSize(1);
        assertThat(result.get().getTransactions()).hasSize(1);
    }

    @Test
    @DisplayName("Should check if user has purchased a course")
    void hasUserPurchasedCourse_ShouldReturnTrueWrappedInBoolean() {
        // Given
        Long courseId = PaymentTestHelper.NON_EXISTENT_COURSE_ID;
        Order order = PaymentTestHelper.createCompletedOrder(userId, PaymentTestHelper.generateOrderNumber(), new BigDecimal("50.00"));
        OrderItem item = PaymentTestHelper.createOrderItem(courseId, 1L, new BigDecimal("50.00"), new BigDecimal("50.00"));
        order.addItem(item);
        
        entityManager.persist(order);
        entityManager.flush();

        // When/Then
        assertThat(orderRepository.hasUserPurchasedCourse(userId, courseId)).isTrue();
        assertThat(orderRepository.hasUserPurchasedCourse(userId, 999111L)).isFalse();
        assertThat(orderRepository.hasUserPurchasedCourse(PaymentTestHelper.NON_EXISTENT_USER_ID, courseId)).isFalse();
    }

    @Test
    @DisplayName("Should return false if order is not COMPLETED")
    void hasUserPurchasedCourse_WhenPending_ShouldReturnFalse() {
        // Given
        Long courseId = PaymentTestHelper.NON_EXISTENT_COURSE_ID;
        // Create PENDING order
        Order order = PaymentTestHelper.createOrder(userId, PaymentTestHelper.generateOrderNumber(), new BigDecimal("50.00")); 
        OrderItem item = PaymentTestHelper.createOrderItem(courseId, 1L, new BigDecimal("50.00"), new BigDecimal("50.00"));
        order.addItem(item);
        
        entityManager.persist(order);
        entityManager.flush();

        // When/Then
        assertThat(orderRepository.hasUserPurchasedCourse(userId, courseId)).isFalse();
    }

    @Test
    @DisplayName("Should count orders by status and userId")
    void countByUserIdAndStatus_ShouldReturnCorrectCount() {
        // Given
        Order order1 = PaymentTestHelper.createCompletedOrder(userId, PaymentTestHelper.generateOrderNumber(), new BigDecimal("10.00"));
        Order order2 = PaymentTestHelper.createOrder(userId, PaymentTestHelper.generateOrderNumber(), new BigDecimal("20.00")); // PENDING
        
        entityManager.persist(order1);
        entityManager.persist(order2);
        entityManager.flush();

        // When
        long completed = orderRepository.countByUserIdAndStatus(userId, OrderStatus.COMPLETED);
        long pending = orderRepository.countByUserIdAndStatus(userId, OrderStatus.PENDING);

        // Then
        assertThat(completed).isEqualTo(1);
        assertThat(pending).isEqualTo(1);
    }

    @Test
    @DisplayName("Should aggregate status counts by user")
    void countStatusByUserId_ShouldReturnGroupedCounts() {
        // Given
        entityManager.persist(PaymentTestHelper.createCompletedOrder(userId, PaymentTestHelper.generateOrderNumber(), BigDecimal.TEN));
        entityManager.persist(PaymentTestHelper.createCompletedOrder(userId, PaymentTestHelper.generateOrderNumber(), BigDecimal.TEN));
        entityManager.persist(PaymentTestHelper.createOrder(userId, PaymentTestHelper.generateOrderNumber(), BigDecimal.TEN)); // PENDING
        entityManager.flush();

        // When
        List<Object[]> stats = orderRepository.countStatusByUserId(userId);

        // Then
        // Expecting [[COMPLETED, 2], [PENDING, 1]]
        assertThat(stats).hasSize(2);
        
        // Use flexible matching as order isn't guaranteed
        boolean foundCompleted = false;
        boolean foundPending = false;

        for (Object[] row : stats) {
            OrderStatus status = (OrderStatus) row[0];
            Long count = (Long) row[1];
            if (status == OrderStatus.COMPLETED) {
                assertThat(count).isEqualTo(2L);
                foundCompleted = true;
            } else if (status == OrderStatus.PENDING) {
                assertThat(count).isEqualTo(1L);
                foundPending = true;
            }
        }
        assertThat(foundCompleted).isTrue();
        assertThat(foundPending).isTrue();
    }

    @Test
    @DisplayName("Should find orders by date range")
    void findByDateRange_ShouldFilterByCreatedAt() {
        // Given
        LocalDateTime now = LocalDateTime.now();
        
        Order oldOrder = PaymentTestHelper.createOrder(userId, PaymentTestHelper.generateOrderNumber(), BigDecimal.TEN);
        entityManager.persist(oldOrder);
        
        // Force update created_at using native query to bypass auditing
        entityManager.getEntityManager()
                .createNativeQuery("UPDATE payment.orders SET created_at = ? WHERE id = ?")
                .setParameter(1, now.minusDays(5))
                .setParameter(2, oldOrder.getId())
                .executeUpdate();
        
        Order newOrder = PaymentTestHelper.createOrder(userId, PaymentTestHelper.generateOrderNumber(), BigDecimal.TEN);
        entityManager.persist(newOrder); // created_at = now
        
        entityManager.flush();
        entityManager.clear();

        // When (Query last 2 days)
        // Ensure strictly within range
        Page<Order> result = orderRepository.findByDateRange(now.minusDays(2), now.plusDays(1), PageRequest.of(0, 10));

        // Then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getOrderNumber()).isEqualTo(newOrder.getOrderNumber());
    }

    @Test
    @DisplayName("Should calculate total revenue by date range")
    void getTotalRevenueByDateRange_ShouldSumCompletedOrdersOnly() {
        // Given
        LocalDateTime now = LocalDateTime.now();
        
        // Order 1: Completed, in range ($100)
        Order o1 = PaymentTestHelper.createCompletedOrder(userId, PaymentTestHelper.generateOrderNumber(), new BigDecimal("100.00"));
        o1.setCompletedAt(now.minusDays(1));
        entityManager.persist(o1);

        // Order 2: Completed, in range ($50)
        Order o2 = PaymentTestHelper.createCompletedOrder(userId, PaymentTestHelper.generateOrderNumber(), new BigDecimal("50.00"));
        o2.setCompletedAt(now.minusDays(2));
        entityManager.persist(o2);

        // Order 3: Pending, in range (Should be ignored)
        Order o3 = PaymentTestHelper.createOrder(userId, PaymentTestHelper.generateOrderNumber(), new BigDecimal("200.00"));
        // Force create date but status is PENDING
        entityManager.persist(o3);

        // Order 4: Completed, OUT of range (Old)
        Order o4 = PaymentTestHelper.createCompletedOrder(userId, PaymentTestHelper.generateOrderNumber(), new BigDecimal("100.00"));
        o4.setCompletedAt(now.minusDays(10));
        entityManager.persist(o4);

        entityManager.flush();

        // When
        BigDecimal revenue = orderRepository.getTotalRevenueByDateRange(now.minusDays(5), now);

        // Then
        assertThat(revenue).isNotNull();
        assertThat(revenue).isEqualByComparingTo(new BigDecimal("150.00"));
    }

    @Test
    @DisplayName("Should return zero revenue when no completed orders in range")
    void getTotalRevenueByDateRange_NoOrders_ShouldReturnZero() {
        // When
        BigDecimal revenue = orderRepository.getTotalRevenueByDateRange(LocalDateTime.now().minusDays(1), LocalDateTime.now());

        // Then
        assertThat(revenue).isNotNull();
        assertThat(revenue).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("Should find order with items by order number")
    void findWithItemsByOrderNumber_ShouldFetchItemsEagerly() {
        // Given
        String orderNum = PaymentTestHelper.generateOrderNumber();
        Order order = PaymentTestHelper.createOrder(userId, orderNum, new BigDecimal("100.00"));
        OrderItem item = PaymentTestHelper.createOrderItem(PaymentTestHelper.NON_EXISTENT_COURSE_ID, 1L, new BigDecimal("100.00"), new BigDecimal("100.00"));
        order.addItem(item);
        
        entityManager.persist(order);
        entityManager.flush();
        entityManager.clear();

        // When
        Optional<Order> result = orderRepository.findWithItemsByOrderNumber(orderNum);

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getItems()).hasSize(1);
    }

    @Test
    @DisplayName("Should find orders by user ID ordered by created at desc")
    void findByUserIdOrderByCreatedAtDesc_ShouldReturnOrderedPage() throws InterruptedException {
        // Given
        Order o1 = PaymentTestHelper.createOrder(userId, PaymentTestHelper.generateOrderNumber(), BigDecimal.TEN);
        entityManager.persist(o1);
        
        // Ensure time gap
        Thread.sleep(10);
        
        Order o2 = PaymentTestHelper.createOrder(userId, PaymentTestHelper.generateOrderNumber(), BigDecimal.TEN);
        entityManager.persist(o2);
        
        entityManager.flush();

        // When
        Page<Order> page = orderRepository.findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(0, 10));

        // Then
        assertThat(page.getContent()).hasSize(2);
        assertThat(page.getContent().get(0).getId()).isEqualTo(o2.getId()); // Newer first
        assertThat(page.getContent().get(1).getId()).isEqualTo(o1.getId());
    }

    @Test
    @DisplayName("Should count user orders by user ID")
    void countByUserId_ShouldReturnCorrectCount() {
        // Given
        entityManager.persist(PaymentTestHelper.createOrder(userId, PaymentTestHelper.generateOrderNumber(), BigDecimal.TEN));
        entityManager.persist(PaymentTestHelper.createOrder(userId, PaymentTestHelper.generateOrderNumber(), BigDecimal.TEN));
        entityManager.persist(PaymentTestHelper.createOrder(2L, PaymentTestHelper.generateOrderNumber(), BigDecimal.TEN)); // Other user
        entityManager.flush();

        // When
        long count = orderRepository.countByUserId(userId);

        // Then
        assertThat(count).isEqualTo(2);
    }
}
