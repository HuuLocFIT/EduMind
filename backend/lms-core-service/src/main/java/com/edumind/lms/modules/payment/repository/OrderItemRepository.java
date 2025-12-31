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
}
