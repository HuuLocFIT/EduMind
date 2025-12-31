package com.edumind.lms.modules.payment.repository;

import com.edumind.lms.modules.payment.entity.OrderSequence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OrderSequenceRepository extends JpaRepository<OrderSequence, Long> {

    Optional<OrderSequence> findByDateKey(String dateKey);

    /**
     * Get next order number using native query to call PostgreSQL function
     */
    @Query(value = "SELECT payment.get_next_order_number()", nativeQuery = true)
    String getNextOrderNumber();

    @Modifying
    @Query("UPDATE OrderSequence s SET s.currentSequence = s.currentSequence + 1 " +
            "WHERE s.dateKey = :dateKey")
    int incrementSequence(@Param("dateKey") String dateKey);
}
