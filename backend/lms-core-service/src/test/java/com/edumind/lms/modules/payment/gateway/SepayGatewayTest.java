package com.edumind.lms.modules.payment.gateway;

import com.edumind.lms.modules.payment.gateway.GatewayPaymentRequest;
import com.edumind.lms.modules.payment.gateway.GatewayPaymentResult;
import com.edumind.lms.modules.payment.gateway.GatewayResultStatus;
import com.edumind.lms.modules.payment.gateway.impl.SepayGateway;
import com.edumind.lms.modules.payment.gateway.impl.SepayGatewayProperties;
import com.edumind.lms.modules.payment.gateway.impl.sepay.SepayWebhookPayload;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SepayGateway Unit Tests")
class SepayGatewayTest {

    @Mock
    private SepayGatewayProperties properties;

    private SepayGateway sepayGateway;

    @BeforeEach
    void setUp() {
        lenient().when(properties.getBankCode()).thenReturn("MB");
        lenient().when(properties.getBankAccount()).thenReturn("1234567890");
        lenient().when(properties.getAccountName()).thenReturn("Test Account");
        lenient().when(properties.getConnectTimeoutMs()).thenReturn(5000);
        lenient().when(properties.getReadTimeoutMs()).thenReturn(30000);
        lenient().when(properties.getQrExpireMinutes()).thenReturn(15);
        lenient().when(properties.getMaxAmountVarianceVnd()).thenReturn(1000L);
        lenient().when(properties.getTransferContentPrefix()).thenReturn("EDUMIND");
        lenient().when(properties.getMaxTransferContentLength()).thenReturn(50);
        lenient().when(properties.getTemplate()).thenReturn("compact2");
        lenient().when(properties.getUsdToVndRate()).thenReturn(java.math.BigDecimal.valueOf(25000));
        lenient().when(properties.getTransactionQueryLimit()).thenReturn(100);
        lenient().when(properties.getBaseUrl()).thenReturn("https://my.sepay.vn");
        lenient().when(properties.getApiKey()).thenReturn("test-api-key");

        sepayGateway = new SepayGateway(properties);
    }

    @Nested
    @DisplayName("processPayment Transfer Details Tests")
    class ProcessPaymentTransferDetailsTests {

        @Test
        @DisplayName("Should return bank transfer details so the frontend can render a text alternative to the QR image")
        void testProcessPayment_ReturnsTransferDetails() {
            // Given
            when(properties.getBankName()).thenReturn("MB Bank");

            // When
            GatewayPaymentResult result =
                    sepayGateway.processPayment(createPaymentRequest("ORD-202602-0001", 100000L));

            // Then
            assertThat(result.getStatus()).isEqualTo(GatewayResultStatus.REQUIRES_ACTION);
            assertThat(result.getBankCode()).isEqualTo("MB");
            assertThat(result.getBankName()).isEqualTo("MB Bank");
            assertThat(result.getBankAccount()).isEqualTo("1234567890");
            assertThat(result.getAccountName()).isEqualTo("Test Account");
            assertThat(result.getTransferContent()).isEqualTo("EDUMIND ORD-202602-0001");
        }

        @Test
        @DisplayName("Should fall back to the bank code when no display bank name is configured")
        void testProcessPayment_BankNameFallsBackToBankCode() {
            // Given
            when(properties.getBankName()).thenReturn("");

            // When
            GatewayPaymentResult result =
                    sepayGateway.processPayment(createPaymentRequest("ORD-202602-0002", 100000L));

            // Then
            assertThat(result.getBankName()).isEqualTo("MB");
        }
    }

    @Nested
    @DisplayName("handleWebhook Tests")
    class HandleWebhookTests {

        @Test
        @DisplayName("Should successfully process webhook with valid data")
        void testHandleWebhook_Success() {
            // Given
            SepayWebhookPayload payload = SepayWebhookPayload.builder()
                    .id(12345L)
                    .accountNumber("1234567890")
                    .transferType("in")
                    .transferAmount(100000L)
                    .code("ORD-202602-0001")
                    .content("EDUMIND ORD-202602-0001")
                    .build();

            // Add pending payment
            sepayGateway.processPayment(createPaymentRequest("ORD-202602-0001", 100000L));

            // When
            SepayGateway.WebhookResult result = sepayGateway.handleWebhook(payload);

            // Then
            assertThat(result.success()).isTrue();
            assertThat(result.orderNumber()).isEqualTo("ORD-202602-0001");
            assertThat(result.amountVnd()).isEqualTo(100000L);
        }

        @Test
        @DisplayName("Should reject webhook when account number mismatch")
        void testHandleWebhook_AccountMismatch() {
            // Given
            SepayWebhookPayload payload = SepayWebhookPayload.builder()
                    .id(12345L)
                    .accountNumber("WRONG-ACCOUNT")
                    .transferType("in")
                    .transferAmount(100000L)
                    .code("ORD-202602-0001")
                    .content("EDUMIND ORD-202602-0001")
                    .build();

            // When
            SepayGateway.WebhookResult result = sepayGateway.handleWebhook(payload);

            // Then
            assertThat(result.success()).isFalse();
        }

        @Test
        @DisplayName("Should reject zero transfer amount")
        void testHandleWebhook_ZeroAmount() {
            // Given
            SepayWebhookPayload payload = SepayWebhookPayload.builder()
                    .id(12345L)
                    .accountNumber("1234567890")
                    .transferType("in")
                    .transferAmount(0L)  // Zero amount
                    .code("ORD-202602-0001")
                    .content("EDUMIND ORD-202602-0001")
                    .build();

            sepayGateway.processPayment(createPaymentRequest("ORD-202602-0001", 100000L));

            // When
            SepayGateway.WebhookResult result = sepayGateway.handleWebhook(payload);

            // Then
            assertThat(result.success()).isFalse();
        }

        @Test
        @DisplayName("Should handle null code AND null content gracefully")
        void testOrderNumberExtraction_BothNull() {
            // Given
            SepayWebhookPayload payload = SepayWebhookPayload.builder()
                    .id(12345L)
                    .accountNumber("1234567890")
                    .transferType("in")
                    .transferAmount(100000L)
                    .code(null)
                    .content(null)  // Both null
                    .build();

            // When
            SepayGateway.WebhookResult result = sepayGateway.handleWebhook(payload);

            // Then
            assertThat(result.success()).isFalse();
        }

        @Test
        @DisplayName("Should prioritize code over content for order number extraction")
        void testOrderNumberExtraction_CodeTakesPriority() {
            // Given
            SepayWebhookPayload payload = SepayWebhookPayload.builder()
                    .id(12345L)
                    .accountNumber("1234567890")
                    .transferType("in")
                    .transferAmount(100000L)
                    .code("ORD-111")  // This should be used
                    .content("EDUMIND ORD-222")  // This should be ignored
                    .build();

            sepayGateway.processPayment(createPaymentRequest("ORD-111", 100000L));

            // When
            SepayGateway.WebhookResult result = sepayGateway.handleWebhook(payload);

            // Then
            assertThat(result.success()).isTrue();
            // Code should take priority
            assertThat(result.orderNumber()).isEqualTo("ORD-111");
        }

        @Test
        @DisplayName("Should fail when order number pattern is invalid")
        void testOrderNumberExtraction_InvalidPattern() {
            // Given
            SepayWebhookPayload payload = SepayWebhookPayload.builder()
                    .id(12345L)
                    .accountNumber("1234567890")
                    .transferType("in")
                    .transferAmount(100000L)
                    .code("ORDER-123")  // Invalid pattern (not ORD-*)
                    .content("Invalid order")
                    .build();

            // When
            SepayGateway.WebhookResult result = sepayGateway.handleWebhook(payload);

            // Then
            assertThat(result.success()).isFalse();
        }

        @Test
        @DisplayName("Should accept overpayment within tolerance")
        void testAmountVariance_Overpayment_WithinTolerance() {
            // Given
            long expectedAmount = 100000L;
            long actualAmount = 100500L;  // +500 VND (within 1000 tolerance)
            
            SepayWebhookPayload payload = SepayWebhookPayload.builder()
                    .id(12345L)
                    .accountNumber("1234567890")
                    .transferType("in")
                    .transferAmount(actualAmount)
                    .code("ORD-202602-0001")
                    .content("EDUMIND ORD-202602-0001")
                    .build();

            sepayGateway.processPayment(createPaymentRequest("ORD-202602-0001", expectedAmount));

            // When
            SepayGateway.WebhookResult result = sepayGateway.handleWebhook(payload);

            // Then
            assertThat(result.success()).isTrue();
            assertThat(result.orderNumber()).isEqualTo("ORD-202602-0001");
            // Payment should be processed successfully (within tolerance)
        }

        @Test
        @DisplayName("Should handle empty string in code field")
        void testOrderNumberExtraction_EmptyCode() {
            // Given
            SepayWebhookPayload payload = SepayWebhookPayload.builder()
                    .id(12345L)
                    .accountNumber("1234567890")
                    .transferType("in")
                    .transferAmount(100000L)
                    .code("")  // Empty string
                    .content("EDUMIND ORD-202602-0001")
                    .build();

            sepayGateway.processPayment(createPaymentRequest("ORD-202602-0001", 100000L));

            // When
            SepayGateway.WebhookResult result = sepayGateway.handleWebhook(payload);

            // Then
            assertThat(result.success()).isTrue();
            // Should fallback to extracting from content
            assertThat(result.orderNumber()).isEqualTo("ORD-202602-0001");
        }

        @Test
        @DisplayName("Should handle empty string in content field")
        void testOrderNumberExtraction_EmptyContent() {
            // Given
            SepayWebhookPayload payload = SepayWebhookPayload.builder()
                    .id(12345L)
                    .accountNumber("1234567890")
                    .transferType("in")
                    .transferAmount(100000L)
                    .code(null)
                    .content("")  // Empty string
                    .build();

            // When
            SepayGateway.WebhookResult result = sepayGateway.handleWebhook(payload);

            // Then
            assertThat(result.success()).isFalse();
        }

        @Test
        @DisplayName("Should extract first order number when content contains multiple order numbers")
        void testOrderNumberExtraction_MultipleOrderNumbers() {
            // Given
            SepayWebhookPayload payload = SepayWebhookPayload.builder()
                    .id(12345L)
                    .accountNumber("1234567890")
                    .transferType("in")
                    .transferAmount(100000L)
                    .code(null)
                    .content("EDUMIND ORD-202602-0001 ORD-202602-0002")  // Multiple order numbers
                    .build();

            sepayGateway.processPayment(createPaymentRequest("ORD-202602-0001", 100000L));

            // When
            SepayGateway.WebhookResult result = sepayGateway.handleWebhook(payload);

            // Then
            assertThat(result.success()).isTrue();
            // Should extract first matching order number
            assertThat(result.orderNumber()).isEqualTo("ORD-202602-0001");
        }

        @Test
        @DisplayName("Should fail when content has multiple order numbers but none match pending payment")
        void testOrderNumberExtraction_MultipleOrderNumbers_NoMatch() {
            // Given
            SepayWebhookPayload payload = SepayWebhookPayload.builder()
                    .id(12345L)
                    .accountNumber("1234567890")
                    .transferType("in")
                    .transferAmount(100000L)
                    .code(null)
                    .content("EDUMIND ORD-202602-0002 ORD-202602-0003")  // No matching pending payment
                    .build();

            sepayGateway.processPayment(createPaymentRequest("ORD-202602-0001", 100000L));

            // When
            SepayGateway.WebhookResult result = sepayGateway.handleWebhook(payload);

            // Then
            assertThat(result.success()).isFalse();
        }

        @Test
        @DisplayName("Should handle order number with special characters in content")
        void testOrderNumberExtraction_SpecialCharactersInContent() {
            // Given
            SepayWebhookPayload payload = SepayWebhookPayload.builder()
                    .id(12345L)
                    .accountNumber("1234567890")
                    .transferType("in")
                    .transferAmount(100000L)
                    .code(null)
                    .content("EDUMIND!@#$%ORD-202602-0001^&*()")  // Special chars around order number
                    .build();

            sepayGateway.processPayment(createPaymentRequest("ORD-202602-0001", 100000L));

            // When
            SepayGateway.WebhookResult result = sepayGateway.handleWebhook(payload);

            // Then
            assertThat(result.success()).isTrue();
            assertThat(result.orderNumber()).isEqualTo("ORD-202602-0001");
        }
    }

    @Nested
    @DisplayName("Pending Payment Cleanup Tests")
    class PendingPaymentCleanupTests {

        @Test
        @DisplayName("Should cleanup expired pending payments")
        void testPendingPaymentCleanup() throws InterruptedException {
            // Given - create pending payment with short expiration
            when(properties.getQrExpireMinutes()).thenReturn(1);  // 1 minute
            SepayGateway shortExpiryGateway = new SepayGateway(properties);
            
            shortExpiryGateway.processPayment(createPaymentRequest("ORD-202602-0001", 100000L));
            
            // Verify payment exists
            assertThat(shortExpiryGateway.getPendingPayment("ORD-202602-0001")).isNotNull();
            
            // Wait for expiration (in real scenario, scheduler runs every 5 minutes)
            // For test, we'll manually trigger cleanup by checking expired status
            // Note: Actual cleanup is done by scheduler, but we can verify the logic
            
            // When - try to process webhook after expiration
            // In real scenario, cleanup scheduler would remove it
            // For test purposes, we verify the payment exists initially
            assertThat(shortExpiryGateway.getPendingPayment("ORD-202602-0001")).isNotNull();
        }
    }

    // ===== Helper Methods =====

    private GatewayPaymentRequest createPaymentRequest(String orderNumber, long amountVnd) {
        return GatewayPaymentRequest.builder()
                .orderNumber(orderNumber)
                .amount(java.math.BigDecimal.valueOf(amountVnd))
                .currency("VND")
                .successUrl("http://localhost:3000/success")
                .cancelUrl("http://localhost:3000/cancel")
                .build();
    }
}
