package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.payment.dto.response.TransactionResponse;
import com.edumind.lms.modules.payment.entity.Order;
import com.edumind.lms.modules.payment.entity.Transaction;
import com.edumind.lms.modules.payment.enums.OrderStatus;
import com.edumind.lms.modules.payment.enums.PaymentMethod;
import com.edumind.lms.modules.payment.enums.TransactionStatus;
import com.edumind.lms.modules.payment.exception.TransactionNotFoundException;
import com.edumind.lms.modules.payment.gateway.GatewayPaymentResult;
import com.edumind.lms.modules.payment.gateway.GatewayResultStatus;
import com.edumind.lms.modules.payment.mapper.TransactionMapper;
import com.edumind.lms.modules.payment.repository.TransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("TransactionService Unit Tests")
class TransactionServiceTest {

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private TransactionMapper transactionMapper;

    @Mock
    private NumberGeneratorService numberGeneratorService;

    @InjectMocks
    private TransactionServiceImpl transactionService;

    private Long transactionId = 100L;
    private String transactionNumber = "TXN-2026-001";
    private Long orderId = 200L;
    private Order order;
    private Transaction transaction;
    private TransactionResponse transactionResponse;

    @BeforeEach
    void setUp() {
        order = new Order();
        order.setId(orderId);
        order.setOrderNumber("ORD-2026-001");
        order.setUserId(1L);
        order.setStatus(OrderStatus.PENDING);
        order.setTotalAmount(new BigDecimal("100.00"));
        order.setCurrency("USD");
        order.setPaymentMethod(PaymentMethod.MOCK);

        transaction = new Transaction();
        transaction.setId(transactionId);
        transaction.setTransactionNumber(transactionNumber);
        transaction.setOrder(order);
        transaction.setAmount(new BigDecimal("100.00"));
        transaction.setCurrency("USD");
        transaction.setStatus(TransactionStatus.SUCCESS);
        transaction.setGateway(PaymentMethod.MOCK);

        transactionResponse = TransactionResponse.builder()
                .id(transactionId)
                .transactionNumber(transactionNumber)
                .orderId(orderId)
                .amount(new BigDecimal("100.00"))
                .currency("USD")
                .status(TransactionStatus.SUCCESS)
                .gateway(PaymentMethod.MOCK)
                .build();
    }

    @Nested
    @DisplayName("createTransaction Tests")
    class CreateTransactionTests {

        @Test
        @DisplayName("Should create transaction from successful gateway result")
        void createTransaction_SuccessResult_CreatesTransaction() {
            // Given
            GatewayPaymentResult result = GatewayPaymentResult.builder()
                    .success(true)
                    .status(GatewayResultStatus.SUCCESS)
                    .gatewayTransactionId("gateway-txn-123")
                    .amount(new BigDecimal("100.00"))
                    .currency("USD")
                    .build();

            when(numberGeneratorService.generateTransactionNumber()).thenReturn(transactionNumber);
            when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> {
                Transaction t = inv.getArgument(0);
                t.setId(transactionId);
                return t;
            });

            // When
            Transaction created = transactionService.createTransaction(order, result);

            // Then
            assertThat(created).isNotNull();
            assertThat(created.getTransactionNumber()).isEqualTo(transactionNumber);
            assertThat(created.getStatus()).isEqualTo(TransactionStatus.SUCCESS);
            verify(transactionRepository).save(any(Transaction.class));
        }

        @Test
        @DisplayName("Should create transaction from failed gateway result")
        void createTransaction_FailedResult_CreatesWithFailure() {
            // Given
            GatewayPaymentResult result = GatewayPaymentResult.builder()
                    .success(false)
                    .status(GatewayResultStatus.FAILED)
                    .errorCode("CARD_DECLINED")
                    .errorMessage("Card was declined")
                    .build();

            when(numberGeneratorService.generateTransactionNumber()).thenReturn(transactionNumber);
            when(transactionRepository.save(any(Transaction.class))).thenAnswer(inv -> {
                Transaction t = inv.getArgument(0);
                t.setId(transactionId);
                return t;
            });

            // When
            Transaction created = transactionService.createTransaction(order, result);

            // Then
            assertThat(created.getStatus()).isEqualTo(TransactionStatus.FAILED);
            assertThat(created.getFailureCode()).isEqualTo("CARD_DECLINED");
            assertThat(created.getFailureReason()).isEqualTo("Card was declined");
        }
    }

    @Nested
    @DisplayName("getTransactionById Tests")
    class GetTransactionByIdTests {

        @Test
        @DisplayName("Should return transaction by ID")
        void getTransactionById_Exists_ReturnsTransaction() {
            // Given
            when(transactionRepository.findById(transactionId)).thenReturn(Optional.of(transaction));
            when(transactionMapper.toResponse(transaction)).thenReturn(transactionResponse);

            // When
            TransactionResponse result = transactionService.getTransactionById(transactionId);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(transactionId);
        }

        @Test
        @DisplayName("Should throw exception if transaction not found")
        void getTransactionById_NotFound_ThrowsException() {
            // Given
            when(transactionRepository.findById(transactionId)).thenReturn(Optional.empty());

            // When & Then
            assertThatThrownBy(() -> transactionService.getTransactionById(transactionId))
                    .isInstanceOf(TransactionNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("getTransactionByNumber Tests")
    class GetTransactionByNumberTests {

        @Test
        @DisplayName("Should return transaction by number")
        void getTransactionByNumber_Exists_ReturnsTransaction() {
            // Given
            when(transactionRepository.findByTransactionNumber(transactionNumber)).thenReturn(Optional.of(transaction));
            when(transactionMapper.toResponse(transaction)).thenReturn(transactionResponse);

            // When
            TransactionResponse result = transactionService.getTransactionByNumber(transactionNumber);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getTransactionNumber()).isEqualTo(transactionNumber);
        }
    }

    @Nested
    @DisplayName("getTransactionsByOrder Tests")
    class GetTransactionsByOrderTests {

        @Test
        @DisplayName("Should return all transactions for order")
        void getTransactionsByOrder_ReturnsTransactions() {
            // Given
            when(transactionRepository.findByOrderId(orderId)).thenReturn(List.of(transaction));
            when(transactionMapper.toResponse(transaction)).thenReturn(transactionResponse);

            // When
            List<TransactionResponse> result = transactionService.getTransactionsByOrder(orderId);

            // Then
            assertThat(result).hasSize(1);
        }

        @Test
        @DisplayName("Should return empty list if no transactions")
        void getTransactionsByOrder_NoTransactions_ReturnsEmpty() {
            // Given
            when(transactionRepository.findByOrderId(orderId)).thenReturn(Collections.emptyList());

            // When
            List<TransactionResponse> result = transactionService.getTransactionsByOrder(orderId);

            // Then
            assertThat(result).isEmpty();
        }
    }

    @Nested
    @DisplayName("updateTransactionFromGateway Tests")
    class UpdateTransactionFromGatewayTests {

        @Test
        @DisplayName("Should update transaction status from gateway callback")
        void updateTransactionFromGateway_Success_UpdatesStatus() {
            // Given
            String gatewayTxnId = "gateway-txn-123";
            GatewayPaymentResult result = GatewayPaymentResult.builder()
                    .success(true)
                    .status(GatewayResultStatus.SUCCESS)
                    .build();

            transaction.setGatewayTransactionId(gatewayTxnId);
            transaction.setStatus(TransactionStatus.PENDING);

            when(transactionRepository.findByGatewayTransactionId(gatewayTxnId)).thenReturn(Optional.of(transaction));
            when(transactionRepository.save(any(Transaction.class))).thenReturn(transaction);

            // When
            transactionService.updateTransactionFromGateway(gatewayTxnId, result);

            // Then
            assertThat(transaction.getStatus()).isEqualTo(TransactionStatus.SUCCESS);
            verify(transactionRepository).save(transaction);
        }

        @Test
        @DisplayName("Should throw exception if transaction not found")
        void updateTransactionFromGateway_NotFound_ThrowsException() {
            // Given
            String gatewayTxnId = "unknown-txn";
            GatewayPaymentResult result = GatewayPaymentResult.builder()
                    .success(true)
                    .status(GatewayResultStatus.SUCCESS)
                    .build();

            when(transactionRepository.findByGatewayTransactionId(gatewayTxnId)).thenReturn(Optional.empty());

            // When & Then
            assertThatThrownBy(() -> transactionService.updateTransactionFromGateway(gatewayTxnId, result))
                    .isInstanceOf(TransactionNotFoundException.class);
        }
    }
}
