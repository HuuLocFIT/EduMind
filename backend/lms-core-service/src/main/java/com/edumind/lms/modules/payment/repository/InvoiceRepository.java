package com.edumind.lms.modules.payment.repository;

import com.edumind.lms.modules.payment.entity.Invoice;
import com.edumind.lms.modules.payment.enums.InvoiceStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Long> {
    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);

    Optional<Invoice> findByOrderId(Long orderId);

    Page<Invoice> findByUserIdOrderByIssuedAtDesc(Long userId, Pageable pageable);

    Page<Invoice> findByStatus(InvoiceStatus status, Pageable pageable);

    @Query("SELECT i FROM Invoice i JOIN FETCH i.order WHERE i.id = :id")
    Optional<Invoice> findByIdWithOrder(@Param("id") Long id);

    @Query("SELECT i FROM Invoice i JOIN FETCH i.order o JOIN FETCH o.items WHERE i.invoiceNumber = :invoiceNumber")
    Optional<Invoice> findByInvoiceNumberWithOrderAndItems(@Param("invoiceNumber") String invoiceNumber);

    boolean existsByOrderId(Long orderId);
}
