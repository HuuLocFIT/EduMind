package com.edumind.lms.modules.payment.repository;

import com.edumind.lms.config.JpaAuditingConfig;
import com.edumind.lms.modules.payment.PaymentTestHelper;
import com.edumind.lms.modules.payment.entity.Order;
import com.edumind.lms.modules.payment.entity.OrderItem;
import com.edumind.lms.modules.payment.enums.OrderStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@Import(JpaAuditingConfig.class)
@DisplayName("OrderItemRepository Tests")
class OrderItemRepositoryTest {

    @Autowired
    private OrderItemRepository orderItemRepository;

    @Autowired
    private TestEntityManager entityManager;

    private Long userId = 1L;
    private Long instructorId = 100L;
    private Long courseId1 = 200L;
    private Long courseId2 = 201L;

    @BeforeEach
    void setUp() {
        entityManager.clear();
    }

    @Test
    @DisplayName("Should find purchased items by user and course")
    void findPurchasedByUserAndCourse_ShouldReturnItems() {
        // Given
        Order completedOrder = PaymentTestHelper.createCompletedOrder(userId, "ORD-001", new BigDecimal("100.00"));
        entityManager.persist(completedOrder);

        OrderItem item = PaymentTestHelper.createOrderItem(courseId1, instructorId, new BigDecimal("100.00"), new BigDecimal("100.00"));
        completedOrder.addItem(item);
        entityManager.persist(item);
        entityManager.flush();

        // When
        List<OrderItem> found = orderItemRepository.findPurchasedByUserAndCourse(userId, courseId1);

        // Then
        assertThat(found).hasSize(1);
        assertThat(found.get(0).getCourseId()).isEqualTo(courseId1);
    }

    @Test
    @DisplayName("Should not find items from pending orders")
    void findPurchasedByUserAndCourse_ShouldNotReturnPendingOrders() {
        // Given
        Order pendingOrder = PaymentTestHelper.createOrder(userId, "ORD-002", new BigDecimal("100.00"));
        entityManager.persist(pendingOrder);

        OrderItem item = PaymentTestHelper.createOrderItem(courseId1, instructorId, new BigDecimal("100.00"), new BigDecimal("100.00"));
        pendingOrder.addItem(item);
        entityManager.persist(item);
        entityManager.flush();

        // When
        List<OrderItem> found = orderItemRepository.findPurchasedByUserAndCourse(userId, courseId1);

        // Then
        assertThat(found).isEmpty();
    }

    @Test
    @DisplayName("Should count sales by course ID")
    void countSalesByCourseId_ShouldReturnCorrectCount() {
        // Given
        Order order1 = PaymentTestHelper.createCompletedOrder(userId, "ORD-001", new BigDecimal("100.00"));
        entityManager.persist(order1);
        OrderItem item1 = PaymentTestHelper.createOrderItem(courseId1, instructorId, new BigDecimal("100.00"), new BigDecimal("100.00"));
        order1.addItem(item1);
        entityManager.persist(item1);

        Order order2 = PaymentTestHelper.createCompletedOrder(2L, "ORD-002", new BigDecimal("100.00"));
        entityManager.persist(order2);
        OrderItem item2 = PaymentTestHelper.createOrderItem(courseId1, instructorId, new BigDecimal("100.00"), new BigDecimal("100.00"));
        order2.addItem(item2);
        entityManager.persist(item2);

        // Pending order should not count
        Order pendingOrder = PaymentTestHelper.createOrder(3L, "ORD-003", new BigDecimal("100.00"));
        entityManager.persist(pendingOrder);
        OrderItem item3 = PaymentTestHelper.createOrderItem(courseId1, instructorId, new BigDecimal("100.00"), new BigDecimal("100.00"));
        pendingOrder.addItem(item3);
        entityManager.persist(item3);

        entityManager.flush();

        // When
        long count = orderItemRepository.countSalesByCourseId(courseId1);

        // Then
        assertThat(count).isEqualTo(2L);
    }

    @Test
    @DisplayName("Should count sales by instructor ID")
    void countSalesByInstructorId_ShouldReturnCorrectCount() {
        // Given
        Order order1 = PaymentTestHelper.createCompletedOrder(userId, "ORD-001", new BigDecimal("100.00"));
        entityManager.persist(order1);
        OrderItem item1 = PaymentTestHelper.createOrderItem(courseId1, instructorId, new BigDecimal("100.00"), new BigDecimal("100.00"));
        order1.addItem(item1);
        entityManager.persist(item1);

        Order order2 = PaymentTestHelper.createCompletedOrder(2L, "ORD-002", new BigDecimal("100.00"));
        entityManager.persist(order2);
        OrderItem item2 = PaymentTestHelper.createOrderItem(courseId2, instructorId, new BigDecimal("100.00"), new BigDecimal("100.00"));
        order2.addItem(item2);
        entityManager.persist(item2);

        entityManager.flush();

        // When
        long count = orderItemRepository.countSalesByInstructorId(instructorId);

        // Then
        assertThat(count).isEqualTo(2L);
    }

    @Test
    @DisplayName("Should count items by order ID")
    void countByOrderId_ShouldReturnCorrectCount() {
        // Given
        Order order = PaymentTestHelper.createOrder(userId, "ORD-001", new BigDecimal("200.00"));
        entityManager.persist(order);

        OrderItem item1 = PaymentTestHelper.createOrderItem(courseId1, instructorId, new BigDecimal("100.00"), new BigDecimal("100.00"));
        OrderItem item2 = PaymentTestHelper.createOrderItem(courseId2, instructorId, new BigDecimal("100.00"), new BigDecimal("100.00"));
        order.addItem(item1);
        order.addItem(item2);
        entityManager.persist(item1);
        entityManager.persist(item2);
        entityManager.flush();

        // When
        int count = orderItemRepository.countByOrderId(order.getId());

        // Then
        assertThat(count).isEqualTo(2);
    }

    @Test
    @DisplayName("Should count items by multiple order IDs")
    void countItemsByOrderIds_ShouldReturnGroupedCounts() {
        // Given
        Order order1 = PaymentTestHelper.createOrder(userId, "ORD-001", new BigDecimal("200.00"));
        entityManager.persist(order1);
        OrderItem item1a = PaymentTestHelper.createOrderItem(courseId1, instructorId, new BigDecimal("100.00"), new BigDecimal("100.00"));
        OrderItem item1b = PaymentTestHelper.createOrderItem(courseId2, instructorId, new BigDecimal("100.00"), new BigDecimal("100.00"));
        order1.addItem(item1a);
        order1.addItem(item1b);
        entityManager.persist(item1a);
        entityManager.persist(item1b);

        Order order2 = PaymentTestHelper.createOrder(userId, "ORD-002", new BigDecimal("100.00"));
        entityManager.persist(order2);
        OrderItem item2 = PaymentTestHelper.createOrderItem(courseId1, instructorId, new BigDecimal("100.00"), new BigDecimal("100.00"));
        order2.addItem(item2);
        entityManager.persist(item2);

        entityManager.flush();

        // When
        List<Object[]> counts = orderItemRepository.countItemsByOrderIds(List.of(order1.getId(), order2.getId()));

        // Then
        assertThat(counts).hasSize(2);
    }
}
