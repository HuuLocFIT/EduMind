package com.edumind.lms.modules.payment.repository;

import com.edumind.lms.config.JpaAuditingConfig;
import com.edumind.lms.modules.payment.PaymentTestHelper;
import com.edumind.lms.modules.payment.entity.Invoice;
import com.edumind.lms.modules.payment.entity.Order;
import com.edumind.lms.modules.payment.entity.OrderItem;
import com.edumind.lms.modules.payment.enums.InvoiceStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@Import(JpaAuditingConfig.class)
@DisplayName("InvoiceRepository Tests")
class InvoiceRepositoryTest {

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private TestEntityManager entityManager;

    private Long userId = 1L;
    private Long instructorId = 100L;

    @BeforeEach
    void setUp() {
        entityManager.clear();
    }

    @Test
    @DisplayName("Should find invoice by invoice number")
    void findByInvoiceNumber_ShouldReturnInvoice() {
        // Given
        Order order = PaymentTestHelper.createCompletedOrder(userId, "ORD-001", new BigDecimal("100.00"));
        entityManager.persist(order);
        Invoice invoice = PaymentTestHelper.createInvoice(order, "INV-2026-001");
        entityManager.persist(invoice);
        entityManager.flush();

        // When
        Optional<Invoice> found = invoiceRepository.findByInvoiceNumber("INV-2026-001");

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getInvoiceNumber()).isEqualTo("INV-2026-001");
    }

    @Test
    @DisplayName("Should find invoice by order ID")
    void findByOrderId_ShouldReturnInvoice() {
        // Given
        Order order = PaymentTestHelper.createCompletedOrder(userId, "ORD-001", new BigDecimal("100.00"));
        entityManager.persist(order);
        Invoice invoice = PaymentTestHelper.createInvoice(order, "INV-2026-001");
        entityManager.persist(invoice);
        entityManager.flush();

        // When
        Optional<Invoice> found = invoiceRepository.findByOrderId(order.getId());

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getOrder().getId()).isEqualTo(order.getId());
    }

    @Test
    @DisplayName("Should find invoices by user ID ordered by issued date")
    void findByUserIdOrderByIssuedAtDesc_ShouldReturnPagedResults() {
        // Given
        Order order1 = PaymentTestHelper.createCompletedOrder(userId, "ORD-001", new BigDecimal("100.00"));
        entityManager.persist(order1);
        Invoice invoice1 = PaymentTestHelper.createInvoice(order1, "INV-2026-001");
        entityManager.persist(invoice1);

        Order order2 = PaymentTestHelper.createCompletedOrder(userId, "ORD-002", new BigDecimal("200.00"));
        entityManager.persist(order2);
        Invoice invoice2 = PaymentTestHelper.createInvoice(order2, "INV-2026-002");
        entityManager.persist(invoice2);

        entityManager.flush();

        // When
        Page<Invoice> page = invoiceRepository.findByUserIdOrderByIssuedAtDesc(userId, PageRequest.of(0, 10));

        // Then
        assertThat(page.getContent()).hasSize(2);
        assertThat(page.getTotalElements()).isEqualTo(2);
        assertThat(page.getContent().get(0).getId()).isEqualTo(invoice2.getId()); // Newer first
        assertThat(page.getContent().get(1).getId()).isEqualTo(invoice1.getId());
    }

    @Test
    @DisplayName("Should return empty page when user has no invoices")
    void findByUserIdOrderByIssuedAtDesc_NoInvoices_ShouldReturnEmptyPage() {
        // When
        Page<Invoice> page = invoiceRepository.findByUserIdOrderByIssuedAtDesc(userId, PageRequest.of(0, 10));

        // Then
        assertThat(page.getContent()).isEmpty();
        assertThat(page.getTotalElements()).isZero();
    }

    @Test
    @DisplayName("Should find invoices by status")
    void findByStatus_ShouldReturnMatchingInvoices() {
        // Given
        Order order1 = PaymentTestHelper.createCompletedOrder(userId, "ORD-001", new BigDecimal("100.00"));
        entityManager.persist(order1);
        Invoice invoice1 = PaymentTestHelper.createInvoice(order1, "INV-2026-001");
        invoice1.setStatus(InvoiceStatus.GENERATED);
        entityManager.persist(invoice1);

        Order order2 = PaymentTestHelper.createCompletedOrder(userId, "ORD-002", new BigDecimal("200.00"));
        entityManager.persist(order2);
        Invoice invoice2 = PaymentTestHelper.createInvoice(order2, "INV-2026-002");
        invoice2.setStatus(InvoiceStatus.SENT);
        entityManager.persist(invoice2);

        entityManager.flush();

        // When
        Page<Invoice> generatedInvoices = invoiceRepository.findByStatus(InvoiceStatus.GENERATED, PageRequest.of(0, 10));

        // Then
        assertThat(generatedInvoices.getContent()).hasSize(1);
        assertThat(generatedInvoices.getContent().get(0).getInvoiceNumber()).isEqualTo("INV-2026-001");
    }

    @Test
    @DisplayName("Should find invoice by ID with order eagerly fetched")
    void findByIdWithOrder_ShouldFetchOrderEagerly() {
        // Given
        Order order = PaymentTestHelper.createCompletedOrder(userId, "ORD-001", new BigDecimal("100.00"));
        entityManager.persist(order);
        Invoice invoice = PaymentTestHelper.createInvoice(order, "INV-2026-001");
        entityManager.persist(invoice);
        entityManager.flush();
        entityManager.clear();

        // When
        Optional<Invoice> found = invoiceRepository.findByIdWithOrder(invoice.getId());

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getOrder()).isNotNull();
        assertThat(found.get().getOrder().getOrderNumber()).isEqualTo("ORD-001");
    }

    @Test
    @DisplayName("Should return empty when finding by non-existent ID with order")
    void findByIdWithOrder_NonExistent_ShouldReturnEmpty() {
        // When
        Optional<Invoice> found = invoiceRepository.findByIdWithOrder(PaymentTestHelper.NON_EXISTENT_ORDER_ID);

        // Then
        assertThat(found).isEmpty();
    }

    @Test
    @DisplayName("Should find invoice by number with order and items")
    void findByInvoiceNumberWithOrderAndItems_ShouldFetchAll() {
        // Given
        Order order = PaymentTestHelper.createCompletedOrder(userId, "ORD-001", new BigDecimal("100.00"));
        entityManager.persist(order);

        OrderItem item = PaymentTestHelper.createOrderItem(200L, instructorId, new BigDecimal("100.00"), new BigDecimal("100.00"));
        order.addItem(item);
        entityManager.persist(item);

        Invoice invoice = PaymentTestHelper.createInvoice(order, "INV-2026-001");
        entityManager.persist(invoice);
        entityManager.flush();
        entityManager.clear();

        // When
        Optional<Invoice> found = invoiceRepository.findByInvoiceNumberWithOrderAndItems("INV-2026-001");

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getOrder()).isNotNull();
        assertThat(found.get().getOrder().getItems()).hasSize(1);
    }

    @Test
    @DisplayName("Should return empty when finding by non-existent invoice number with items")
    void findByInvoiceNumberWithOrderAndItems_NonExistent_ShouldReturnEmpty() {
        // When
        Optional<Invoice> found = invoiceRepository.findByInvoiceNumberWithOrderAndItems("NON-EXISTENT-INV");

        // Then
        assertThat(found).isEmpty();
    }

    @Test
    @DisplayName("Should check if invoice exists by order ID")
    void existsByOrderId_ShouldReturnCorrectResult() {
        // Given
        Order order = PaymentTestHelper.createCompletedOrder(userId, "ORD-001", new BigDecimal("100.00"));
        entityManager.persist(order);
        Invoice invoice = PaymentTestHelper.createInvoice(order, "INV-2026-001");
        entityManager.persist(invoice);
        entityManager.flush();

        // When & Then
        assertThat(invoiceRepository.existsByOrderId(order.getId())).isTrue();
        assertThat(invoiceRepository.existsByOrderId(PaymentTestHelper.NON_EXISTENT_ORDER_ID)).isFalse();
    }
}
