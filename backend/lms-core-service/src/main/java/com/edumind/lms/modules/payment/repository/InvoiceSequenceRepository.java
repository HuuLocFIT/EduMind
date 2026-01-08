package com.edumind.lms.modules.payment.repository;

import com.edumind.lms.modules.payment.entity.InvoiceSequence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface InvoiceSequenceRepository extends JpaRepository<InvoiceSequence, Long> {

    Optional<InvoiceSequence> findByYearMonth(String yearMonth);

    /**
     * Get next sequence using native query to call PostgreSQL function
     * This ensures atomic increment
     */
    @Query(value = "SELECT payment.get_next_invoice_number()", nativeQuery = true)
    String getNextInvoiceNumber();

    /**
     * Alternative: Manual increment with locking
     */
    @Modifying
    @Query("UPDATE InvoiceSequence s SET s.currentSequence = s.currentSequence + 1 " +
            "WHERE s.yearMonth = :yearMonth")
    int incrementSequence(@Param("yearMonth") String yearMonth);
}
