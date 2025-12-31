package com.edumind.lms.modules.payment.repository;

import com.edumind.lms.modules.payment.entity.Cart;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CartRepository extends JpaRepository<Cart, Long> {
    Optional<Cart> findByUserId(Long userId);

    boolean existsByUserId(Long userId);

    @Query("SELECT c FROM Cart c LEFT JOIN FETCH c.items WHERE c.userId = :userId")
    Optional<Cart> findByUserIdWithItems(@Param("userId") Long userId);

    @Query("SELECT COUNT(ci) FROM CartItem ci WHERE ci.cart.userId = :userId")
    int countItemsByUserId(@Param("userId") Long userId);

    @Query("SELECT c FROM Cart c LEFT JOIN FETCH c.items WHERE c.id = :id")
    Optional<Cart> findByIdWithItems(@Param("id") Long id);
}
