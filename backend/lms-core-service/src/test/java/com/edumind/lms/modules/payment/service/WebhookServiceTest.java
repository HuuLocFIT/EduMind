package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.course.service.EnrollmentService;
import com.edumind.lms.modules.payment.dto.request.WebhookPayloadRequest;
import com.edumind.lms.modules.payment.entity.Order;
import com.edumind.lms.modules.payment.entity.Transaction;
import com.edumind.lms.modules.payment.enums.OrderStatus;
import com.edumind.lms.modules.payment.enums.PaymentMethod;
import com.edumind.lms.modules.payment.enums.TransactionStatus;
import com.edumind.lms.modules.payment.exception.OrderNotFoundException;
import com.edumind.lms.modules.payment.repository.OrderRepository;
import com.edumind.lms.modules.payment.repository.TransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("WebhookService Unit Tests")
class WebhookServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private EnrollmentService enrollmentService;

    @Mock
    private EarningService earningService;

    @Mock
    private InvoiceService invoiceService;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @InjectMocks
    private WebhookServiceImpl webhookService;

    private Order order;
    private Transaction transaction;
    private String orderNumber = "ORD-2026-001";
    private Long orderId = 100L;

    @BeforeEach
    void setUp() {
        order = new Order();
        order.setId(orderId);
        order.setOrderNumber(orderNumber);
        order.setUserId(1L);
        order.setStatus(OrderStatus.PENDING);
        order.setTotalAmount(new BigDecimal("100.00"));
        order.setCurrency("USD");
        order.setPaymentMethod(PaymentMethod.MOCK);
        order.setItems(new HashSet<>());

        transaction = new Transaction();
        transaction.setId(200L);
        transaction.setTransactionNumber("TXN-2026-001");
        transaction.setOrder(order);
        transaction.setStatus(TransactionStatus.PENDING);
    }

    @Nested
    @DisplayName("handleWebhook Tests")
    class HandleWebhookTests {

        @Test
        @DisplayName("Should process successful payment webhook")
        void handleWebhook_Success_ProcessesPayment() {
            // Given
            WebhookPayloadRequest request = WebhookPayloadRequest.builder()
                    .orderNumber(orderNumber)
                    .status("SUCCESS")
                    .transactionId("gateway-txn-123")
                    .build();

            when(orderRepository.findByOrderNumber(orderNumber)).thenReturn(Optional.of(order));
            when(transactionRepository.findFirstByOrderIdOrderByCreatedAtDesc(orderId)).thenReturn(Optional.of(transaction));
            when(transactionRepository.save(any(Transaction.class))).thenReturn(transaction);
            when(orderRepository.save(any(Order.class))).thenReturn(order);

            // When
            webhookService.handleWebhook(PaymentMethod.MOCK, request);

            // Then
            assertThat(order.getStatus()).isEqualTo(OrderStatus.COMPLETED);
            verify(earningService).createEarningsForOrder(order);
            verify(invoiceService).generateInvoice(order);
        }

        @Test
        @DisplayName("Should process failed payment webhook")
        void handleWebhook_Failed_UpdatesStatus() {
            // Given
            WebhookPayloadRequest request = WebhookPayloadRequest.builder()
                    .orderNumber(orderNumber)
                    .status("FAILED")
                    .failureReason("Insufficient funds")
                    .build();

            when(orderRepository.findByOrderNumber(orderNumber)).thenReturn(Optional.of(order));
            when(transactionRepository.findFirstByOrderIdOrderByCreatedAtDesc(orderId)).thenReturn(Optional.of(transaction));
            when(transactionRepository.save(any(Transaction.class))).thenReturn(transaction);
            when(orderRepository.save(any(Order.class))).thenReturn(order);

            // When
            webhookService.handleWebhook(PaymentMethod.MOCK, request);

            // Then
            assertThat(order.getStatus()).isEqualTo(OrderStatus.FAILED);
            assertThat(order.getFailureReason()).isEqualTo("Insufficient funds");
        }

        @Test
        @DisplayName("Should throw exception if order not found")
        void handleWebhook_OrderNotFound_ThrowsException() {
            // Given
            WebhookPayloadRequest request = WebhookPayloadRequest.builder()
                    .orderNumber("UNKNOWN-ORDER")
                    .status("SUCCESS")
                    .build();

            when(orderRepository.findByOrderNumber("UNKNOWN-ORDER")).thenReturn(Optional.empty());

            // When & Then
            assertThatThrownBy(() -> webhookService.handleWebhook(PaymentMethod.MOCK, request))
                    .isInstanceOf(OrderNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("verifySignature Tests")
    class VerifySignatureTests {

        @Test
        @DisplayName("Should return true for MOCK gateway")
        void verifySignature_MockGateway_ReturnsTrue() {
            // Given
            WebhookPayloadRequest request = WebhookPayloadRequest.builder()
                    .orderNumber(orderNumber)
                    .status("SUCCESS")
                    .build();

            // When
            boolean result = webhookService.verifySignature(PaymentMethod.MOCK, request, "signature");

            // Then
            assertThat(result).isTrue();
        }
    }
}
