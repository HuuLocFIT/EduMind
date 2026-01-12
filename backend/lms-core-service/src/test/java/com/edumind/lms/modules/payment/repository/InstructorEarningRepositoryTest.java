package com.edumind.lms.modules.payment.repository;

import com.edumind.lms.config.JpaAuditingConfig;
import com.edumind.lms.modules.payment.PaymentTestHelper;
import com.edumind.lms.modules.payment.entity.InstructorEarning;
import com.edumind.lms.modules.payment.entity.Order;
import com.edumind.lms.modules.payment.entity.OrderItem;
import com.edumind.lms.modules.payment.enums.EarningStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@Import(JpaAuditingConfig.class)
@DisplayName("InstructorEarningRepository Tests")
class InstructorEarningRepositoryTest {

    @Autowired
    private InstructorEarningRepository earningRepository;

    @Autowired
    private TestEntityManager entityManager;

    private Long instructorId = 200L;
    private Long courseId = 300L;

    @BeforeEach
    void setUp() {
        entityManager.clear();
    }

    @Test
    @DisplayName("Should sum net amount by instructor and status")
    void sumNetAmountByInstructorIdAndStatus_ShouldReturnCorrectSum() {
        // Given
        Order order = PaymentTestHelper.createOrder(101L, "ORD-1", BigDecimal.ZERO);
        entityManager.persist(order);

        // Earning 1: AVAILABLE, Gross 100.00, Net 70.00 (after 30% platform fee)
        OrderItem item1 = PaymentTestHelper.createOrderItem(courseId, instructorId, new BigDecimal("100.00"), new BigDecimal("100.00"));
        order.addItem(item1);
        entityManager.persist(item1);
        InstructorEarning earning1 = PaymentTestHelper.createInstructorEarning(item1, order, instructorId, new BigDecimal("100.00"));
        earning1.setStatus(EarningStatus.AVAILABLE);
        entityManager.persist(earning1);

        // Earning 2: AVAILABLE, Gross 100.00, Net 70.00 (after 30% platform fee)
        OrderItem item2 = PaymentTestHelper.createOrderItem(courseId, instructorId, new BigDecimal("100.00"), new BigDecimal("100.00"));
        order.addItem(item2);
        entityManager.persist(item2);
        InstructorEarning earning2 = PaymentTestHelper.createInstructorEarning(item2, order, instructorId, new BigDecimal("100.00"));
        earning2.setStatus(EarningStatus.AVAILABLE);
        entityManager.persist(earning2);

        // Earning 3: PENDING, Gross 100.00, Net 70.00 (Should NOT be included in sum)
        OrderItem item3 = PaymentTestHelper.createOrderItem(courseId, instructorId, new BigDecimal("100.00"), new BigDecimal("100.00"));
        order.addItem(item3);
        entityManager.persist(item3);
        InstructorEarning earning3 = PaymentTestHelper.createInstructorEarning(item3, order, instructorId, new BigDecimal("100.00"));
        earning3.setStatus(EarningStatus.PENDING);
        entityManager.persist(earning3);

        entityManager.flush();

        // When
        BigDecimal sum = earningRepository.sumNetAmountByInstructorIdAndStatus(instructorId, EarningStatus.AVAILABLE);

        // Then: 70.00 + 70.00 = 140.00
        assertThat(sum).isEqualByComparingTo(new BigDecimal("140.00"));
    }

    @Test
    @DisplayName("Should sum total net amount by instructor (all statuses)")
    void sumTotalNetAmountByInstructorId_ShouldIncludeAll() {
        // Given
        Order order = PaymentTestHelper.createOrder(101L, "ORD-1", BigDecimal.ZERO);
        entityManager.persist(order);
        
        OrderItem item1 = PaymentTestHelper.createOrderItem(courseId, instructorId, new BigDecimal("100.00"), new BigDecimal("100.00"));
        order.addItem(item1);
        entityManager.persist(item1);
        InstructorEarning e1 = PaymentTestHelper.createInstructorEarning(item1, order, instructorId, new BigDecimal("50.00"));
        e1.setNetAmount(new BigDecimal("40.00"));
        entityManager.persist(e1);

        OrderItem item2 = PaymentTestHelper.createOrderItem(courseId, instructorId, new BigDecimal("100.00"), new BigDecimal("100.00"));
        order.addItem(item2);
        entityManager.persist(item2);
        InstructorEarning e2 = PaymentTestHelper.createInstructorEarning(item2, order, instructorId, new BigDecimal("50.00"));
        e2.setNetAmount(new BigDecimal("40.00"));
        entityManager.persist(e2);

        entityManager.flush();

        // When
        BigDecimal total = earningRepository.sumTotalNetAmountByInstructorId(instructorId);

        // Then
        assertThat(total).isEqualByComparingTo(new BigDecimal("80.00"));
    }

    @Test
    @DisplayName("Should count sales by instructor")
    void countSalesByInstructorId_ShouldCountNonRefunded() {
        // Given
        Order order = PaymentTestHelper.createOrder(101L, "ORD-1", BigDecimal.ZERO);
        entityManager.persist(order);

        OrderItem item1 = PaymentTestHelper.createOrderItem(courseId, instructorId, BigDecimal.TEN, BigDecimal.TEN);
        order.addItem(item1);
        entityManager.persist(item1);
        InstructorEarning e1 = PaymentTestHelper.createInstructorEarning(item1, order, instructorId, BigDecimal.TEN);
        e1.setStatus(EarningStatus.AVAILABLE);
        entityManager.persist(e1);

        OrderItem item2 = PaymentTestHelper.createOrderItem(courseId, instructorId, BigDecimal.TEN, BigDecimal.TEN);
        order.addItem(item2);
        entityManager.persist(item2);
        InstructorEarning e2 = PaymentTestHelper.createInstructorEarning(item2, order, instructorId, BigDecimal.TEN);
        e2.setStatus(EarningStatus.REFUNDED); // Should be ignored
        entityManager.persist(e2);

        entityManager.flush();

        // When
        long count = earningRepository.countSalesByInstructorId(instructorId);

        // Then
        assertThat(count).isEqualTo(1L);
    }

    @Test
    @DisplayName("Should sum platform fee by date range")
    void sumPlatformFeeByDateRange_ShouldSumCorrectly() {
        // Given
        LocalDateTime now = LocalDateTime.now();
        Order order = PaymentTestHelper.createOrder(101L, "ORD-1", BigDecimal.ZERO);
        entityManager.persist(order);
        // Earning 1: Fee 20.00, Today
        OrderItem item1 = PaymentTestHelper.createOrderItem(courseId, instructorId, new BigDecimal("100.00"), new BigDecimal("100.00"));
        order.addItem(item1);
        entityManager.persist(item1);
        InstructorEarning e1 = PaymentTestHelper.createInstructorEarning(item1, order, instructorId, new BigDecimal("80.00"));
        e1.setPlatformFeeAmount(new BigDecimal("20.00")); 
        entityManager.persist(e1);
        
        // Earning 2: Fee 10.00, 5 days ago (via native query)
        OrderItem item2 = PaymentTestHelper.createOrderItem(courseId, instructorId, new BigDecimal("100.00"), new BigDecimal("100.00"));
        order.addItem(item2);
        entityManager.persist(item2);
        InstructorEarning e2 = PaymentTestHelper.createInstructorEarning(item2, order, instructorId, new BigDecimal("90.00"));
        e2.setPlatformFeeAmount(new BigDecimal("10.00"));
        entityManager.persist(e2);
        
        entityManager.getEntityManager()
                .createNativeQuery("UPDATE payment.instructor_earnings SET created_at = ? WHERE id = ?")
                .setParameter(1, now.minusDays(5))
                .setParameter(2, e2.getId())
                .executeUpdate();

        entityManager.flush();

        // When (Query last 1 day)
        BigDecimal sum = earningRepository.sumPlatformFeeByDateRange(now.minusDays(1), now.plusDays(1));

        // Then
        assertThat(sum).isEqualByComparingTo(new BigDecimal("20.00"));
    }

    @Test
    @DisplayName("Should find top courses by earnings")
    void findTopCoursesByEarnings_ShouldRankCorrectly() {
        // Given
        Long courseA = 301L;
        Long courseB = 302L;
        Order order = PaymentTestHelper.createOrder(101L, "ORD-1", BigDecimal.ZERO);
        entityManager.persist(order);

        // Course A: 2 sales of 100.00 = 200.00 Gross
        // Course A: 2 sales of 100.00 = 200.00 Gross
        OrderItem itemA1 = PaymentTestHelper.createOrderItem(courseA, instructorId, new BigDecimal("100.00"), new BigDecimal("100.00"));
        order.addItem(itemA1);
        entityManager.persist(itemA1);
        entityManager.persist(PaymentTestHelper.createInstructorEarning(itemA1, order, instructorId, new BigDecimal("100.00")));

        OrderItem itemA2 = PaymentTestHelper.createOrderItem(courseA, instructorId, new BigDecimal("100.00"), new BigDecimal("100.00"));
        order.addItem(itemA2);
        entityManager.persist(itemA2);
        entityManager.persist(PaymentTestHelper.createInstructorEarning(itemA2, order, instructorId, new BigDecimal("100.00")));

        // Course B: 1 sale of 300.00 = 300.00 Gross (Top 1)
        OrderItem itemB = PaymentTestHelper.createOrderItem(courseB, instructorId, new BigDecimal("300.00"), new BigDecimal("300.00"));
        order.addItem(itemB);
        entityManager.persist(itemB);
        
        entityManager.persist(PaymentTestHelper.createInstructorEarning(itemB, order, instructorId, new BigDecimal("300.00")));

        entityManager.flush();

        // When
        List<Object[]> topCourses = earningRepository.findTopCoursesByEarnings(instructorId, Pageable.ofSize(10));

        // Then
        assertThat(topCourses).hasSize(2);
        // Rank 1: Course B (300.00)
        assertThat(topCourses.get(0)[0]).isEqualTo(courseB);
        assertThat((BigDecimal) topCourses.get(0)[1]).isEqualByComparingTo(new BigDecimal("300.00"));
        
        // Rank 2: Course A (200.00)
        assertThat(topCourses.get(1)[0]).isEqualTo(courseA);
        assertThat((BigDecimal) topCourses.get(1)[1]).isEqualByComparingTo(new BigDecimal("200.00"));
    }
}
