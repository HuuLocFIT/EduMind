package com.edumind.lms.modules.payment.repository;

import com.edumind.lms.modules.payment.entity.TransactionSequence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TransactionSequenceRepository extends JpaRepository<TransactionSequence, Long> {

    Optional<TransactionSequence> findByDateKey(String dateKey);

    /**
     * Get next transaction number using native query to call PostgreSQL function
     */
    @Query(value = "SELECT payment.get_next_transaction_number()", nativeQuery = true)
    String getNextTransactionNumber();

    @Modifying
    @Query("UPDATE TransactionSequence s SET s.currentSequence = s.currentSequence + 1 " +
            "WHERE s.dateKey = :dateKey")
    int incrementSequence(@Param("dateKey") String dateKey);

    /**
     * Find by yearMonth (YYYYMM) - extracts first 6 characters from dateKey (YYYYMMDD)
     */
    @Query("SELECT s FROM TransactionSequence s WHERE SUBSTRING(s.dateKey, 1, 6) = :yearMonth")
    Optional<TransactionSequence> findByYearMonth(@Param("yearMonth") String yearMonth);
}
