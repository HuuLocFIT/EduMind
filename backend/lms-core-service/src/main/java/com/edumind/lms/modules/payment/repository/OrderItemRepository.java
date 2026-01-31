package com.edumind.lms.modules.payment.repository;

import com.edumind.lms.modules.payment.entity.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
    List<OrderItem> findByOrderId(Long orderId);

    List<OrderItem> findByCourseId(Long courseId);

    List<OrderItem> findByInstructorId(Long instructorId);

    @Query("SELECT oi FROM OrderItem oi WHERE oi.order.userId = :userId AND oi.courseId = :courseId " +
            "AND oi.order.status = 'COMPLETED'")
    List<OrderItem> findPurchasedByUserAndCourse(@Param("userId") Long userId, @Param("courseId") Long courseId);

    @Query("SELECT COUNT(oi) FROM OrderItem oi WHERE oi.courseId = :courseId " +
            "AND oi.order.status = 'COMPLETED'")
    long countSalesByCourseId(@Param("courseId") Long courseId);

    @Query("SELECT COUNT(oi) FROM OrderItem oi WHERE oi.instructorId = :instructorId " +
            "AND oi.order.status = 'COMPLETED'")
    long countSalesByInstructorId(@Param("instructorId") Long instructorId);

    @Query("SELECT COUNT(oi) FROM OrderItem oi WHERE oi.order.id = :orderId")
    int countByOrderId(@Param("orderId") Long orderId);

    @Query("SELECT oi.order.id, COUNT(oi) FROM OrderItem oi WHERE oi.order.id IN :orderIds GROUP BY oi.order.id")
    List<Object[]> countItemsByOrderIds(@Param("orderIds") List<Long> orderIds);

    /**
     * Get first item for each order (for summary display).
     * Uses a subquery to get the minimum id per order, avoiding N+1 queries.
     */
    @Query("SELECT oi FROM OrderItem oi WHERE oi.id IN " +
            "(SELECT MIN(oi2.id) FROM OrderItem oi2 WHERE oi2.order.id IN :orderIds GROUP BY oi2.order.id)")
    List<OrderItem> findFirstItemsByOrderIds(@Param("orderIds") List<Long> orderIds);
}
