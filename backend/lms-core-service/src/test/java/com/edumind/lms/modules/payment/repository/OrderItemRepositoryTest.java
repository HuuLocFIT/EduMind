package com.edumind.lms.modules.payment.repository;

import com.edumind.lms.config.JpaAuditingConfig;
import com.edumind.lms.modules.payment.PaymentTestHelper;
import com.edumind.lms.modules.payment.entity.Order;
import com.edumind.lms.modules.payment.entity.OrderItem;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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
        
        // Verify actual counts per order
        Map<Long, Long> countMap = counts.stream()
                .collect(Collectors.toMap(
                        arr -> (Long) arr[0],
                        arr -> (Long) arr[1]
                ));
        assertThat(countMap.get(order1.getId())).isEqualTo(2L);
        assertThat(countMap.get(order2.getId())).isEqualTo(1L);
    }

    // ===== Missing Tests for Derived Query Methods =====

    @Test
    @DisplayName("Should find items by order ID")
    void findByOrderId_ShouldReturnItems() {
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
        List<OrderItem> found = orderItemRepository.findByOrderId(order.getId());

        // Then
        assertThat(found).hasSize(2);
        assertThat(found).extracting(OrderItem::getCourseId)
                .containsExactlyInAnyOrder(courseId1, courseId2);
    }

    @Test
    @DisplayName("Should find items by course ID")
    void findByCourseId_ShouldReturnItems() {
        // Given
        Order order1 = PaymentTestHelper.createOrder(userId, "ORD-001", new BigDecimal("100.00"));
        entityManager.persist(order1);
        OrderItem item1 = PaymentTestHelper.createOrderItem(courseId1, instructorId, new BigDecimal("100.00"), new BigDecimal("100.00"));
        order1.addItem(item1);
        entityManager.persist(item1);

        Order order2 = PaymentTestHelper.createOrder(2L, "ORD-002", new BigDecimal("100.00"));
        entityManager.persist(order2);
        OrderItem item2 = PaymentTestHelper.createOrderItem(courseId1, instructorId, new BigDecimal("100.00"), new BigDecimal("100.00"));
        order2.addItem(item2);
        entityManager.persist(item2);

        entityManager.flush();

        // When
        List<OrderItem> found = orderItemRepository.findByCourseId(courseId1);

        // Then
        assertThat(found).hasSize(2);
    }

    @Test
    @DisplayName("Should find items by instructor ID")
    void findByInstructorId_ShouldReturnItems() {
        // Given
        Order order = PaymentTestHelper.createOrder(userId, "ORD-001", new BigDecimal("200.00"));
        entityManager.persist(order);

        Long anotherInstructor = 999L;
        OrderItem item1 = PaymentTestHelper.createOrderItem(courseId1, instructorId, new BigDecimal("100.00"), new BigDecimal("100.00"));
        OrderItem item2 = PaymentTestHelper.createOrderItem(courseId2, anotherInstructor, new BigDecimal("100.00"), new BigDecimal("100.00"));
        order.addItem(item1);
        order.addItem(item2);
        entityManager.persist(item1);
        entityManager.persist(item2);
        entityManager.flush();

        // When
        List<OrderItem> found = orderItemRepository.findByInstructorId(instructorId);

        // Then
        assertThat(found).hasSize(1);
        assertThat(found.get(0).getCourseId()).isEqualTo(courseId1);
    }

    // ===== Edge Case Tests =====

    @Test
    @DisplayName("Should return empty list for non-existent order ID")
    void findByOrderId_NonExistent_ShouldReturnEmpty() {
        // When
        List<OrderItem> found = orderItemRepository.findByOrderId(PaymentTestHelper.NON_EXISTENT_ORDER_ID);

        // Then
        assertThat(found).isEmpty();
    }

    @Test
    @DisplayName("Should return zero count for non-existent course ID")
    void countSalesByCourseId_NonExistent_ShouldReturnZero() {
        // When
        long count = orderItemRepository.countSalesByCourseId(PaymentTestHelper.NON_EXISTENT_COURSE_ID);

        // Then
        assertThat(count).isZero();
    }

    @Test
    @DisplayName("Should return zero count for non-existent instructor ID")
    void countSalesByInstructorId_NonExistent_ShouldReturnZero() {
        // When
        long count = orderItemRepository.countSalesByInstructorId(PaymentTestHelper.NON_EXISTENT_USER_ID);

        // Then
        assertThat(count).isZero();
    }

    @Test
    @DisplayName("Should return empty list when counting items with empty order IDs list")
    void countItemsByOrderIds_EmptyList_ShouldReturnEmpty() {
        // When
        List<Object[]> counts = orderItemRepository.countItemsByOrderIds(Collections.emptyList());

        // Then
        assertThat(counts).isEmpty();
    }
}
