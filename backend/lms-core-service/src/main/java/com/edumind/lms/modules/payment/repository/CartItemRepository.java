package com.edumind.lms.modules.payment.repository;

import com.edumind.lms.modules.payment.entity.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CartItemRepository extends JpaRepository<CartItem, Long> {
    List<CartItem> findByCartId(Long cartId);

    Optional<CartItem> findByCartIdAndCourseId(Long cartId, Long courseId);

    boolean existsByCartIdAndCourseId(Long cartId, Long courseId);

    @Modifying
    @Query("DELETE FROM CartItem ci WHERE ci.cart.id = :cartId AND ci.courseId = :courseId")
    void deleteByCartIdAndCourseId(@Param("cartId") Long cartId, @Param("courseId") Long courseId);

    @Modifying
    @Query("DELETE FROM CartItem ci WHERE ci.cart.id = :cartId")
    void deleteAllByCartId(@Param("cartId") Long cartId);

    @Query("SELECT ci.courseId FROM CartItem ci WHERE ci.cart.userId = :userId")
    List<Long> findCourseIdsByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("DELETE FROM CartItem ci WHERE ci.cart.id = :cartId")
    void deleteByCartId(@Param("cartId") Long cartId);

    @Query("SELECT COUNT(ci) FROM CartItem ci WHERE ci.cart.id = :cartId")
    int countByCartId(@Param("cartId") Long cartId);

    @Query("SELECT ci FROM CartItem ci WHERE ci.cart.id = :cartId")
    List<CartItem> findByCartIdWithCourse(@Param("cartId") Long cartId);
}
