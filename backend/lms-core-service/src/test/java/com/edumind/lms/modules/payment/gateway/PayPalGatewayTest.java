package com.edumind.lms.modules.payment.gateway;

import com.edumind.lms.modules.payment.gateway.impl.PayPalGateway;
import com.edumind.lms.modules.payment.gateway.impl.PayPalGatewayProperties;
import com.paypal.core.PayPalHttpClient;
import com.paypal.http.HttpResponse;
import com.paypal.http.exceptions.HttpException;
import com.paypal.orders.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PayPalGateway Unit Tests")
class PayPalGatewayTest {

    @Mock
    private PayPalHttpClient payPalClient;

    @Mock
    private PayPalGatewayProperties properties;

    private PayPalGateway payPalGateway;

    @BeforeEach
    void setUp() {
        when(properties.getMode()).thenReturn("sandbox");
        when(properties.getClientId()).thenReturn("test-client-id");
        when(properties.getClientSecret()).thenReturn("test-client-secret");
        
        // Create gateway instance - we'll need to use reflection or create a testable version
        // For now, we'll mock the client after construction
        payPalGateway = new PayPalGateway(properties);
        
        // Use reflection to inject mocked client
        try {
            java.lang.reflect.Field clientField = PayPalGateway.class.getDeclaredField("payPalClient");
            clientField.setAccessible(true);
            clientField.set(payPalGateway, payPalClient);
        } catch (Exception e) {
            throw new RuntimeException("Failed to inject mock client", e);
        }
    }

    @Nested
    @DisplayName("capturePayment Tests")
    class CapturePaymentTests {

        @Test
        @DisplayName("Should successfully capture payment when order is APPROVED")
        void testCapturePayment_Success() throws IOException {
            // Given
            String orderId = "PAYPAL-ORDER-123";
            
            // Mock order status check - APPROVED
            Order approvedOrder = createMockOrder(orderId, "APPROVED");
            HttpResponse<Order> getResponse = mock(HttpResponse.class);
            when(getResponse.result()).thenReturn(approvedOrder);
            when(payPalClient.execute(any(OrdersGetRequest.class))).thenReturn(getResponse);
            
            // Mock capture response - COMPLETED
            Order completedOrder = createMockOrderWithCapture(orderId, "COMPLETED", "CAPTURE-123");
            HttpResponse<Order> captureResponse = mock(HttpResponse.class);
            when(captureResponse.result()).thenReturn(completedOrder);
            when(payPalClient.execute(any(OrdersCaptureRequest.class))).thenReturn(captureResponse);

            // When
            GatewayPaymentResult result = payPalGateway.capturePayment(orderId);

            // Then
            assertThat(result.isSuccess()).isTrue();
            assertThat(result.getGatewayTransactionId()).isEqualTo("CAPTURE-123");
            assertThat(result.getGatewayName()).isEqualTo("PAYPAL");
            assertThat(result.getStatus()).isEqualTo(GatewayResultStatus.SUCCESS);
            
            verify(payPalClient).execute(any(OrdersGetRequest.class));
            verify(payPalClient).execute(any(OrdersCaptureRequest.class));
        }

        @Test
        @DisplayName("Should return error when order is not APPROVED")
        void testCapturePayment_OrderNotApproved() throws IOException {
            // Given
            String orderId = "PAYPAL-ORDER-123";
            
            // Mock order status check - CREATED (not approved)
            Order createdOrder = createMockOrder(orderId, "CREATED");
            HttpResponse<Order> getResponse = mock(HttpResponse.class);
            when(getResponse.result()).thenReturn(createdOrder);
            when(payPalClient.execute(any(OrdersGetRequest.class))).thenReturn(getResponse);

            // When
            GatewayPaymentResult result = payPalGateway.capturePayment(orderId);

            // Then
            assertThat(result.isSuccess()).isFalse();
            assertThat(result.getErrorCode()).isEqualTo("ORDER_NOT_APPROVED");
            assertThat(result.getErrorMessage()).contains("not yet authorized");
            
            verify(payPalClient).execute(any(OrdersGetRequest.class));
            verify(payPalClient, never()).execute(any(OrdersCaptureRequest.class));
        }

        @Test
        @DisplayName("Should return success when order is already COMPLETED (idempotent)")
        void testCapturePayment_AlreadyCaptured() throws IOException {
            // Given
            String orderId = "PAYPAL-ORDER-123";
            
            // Mock order status check - already COMPLETED
            Order completedOrder = createMockOrderWithCapture(orderId, "COMPLETED", "CAPTURE-123");
            HttpResponse<Order> getResponse = mock(HttpResponse.class);
            when(getResponse.result()).thenReturn(completedOrder);
            when(payPalClient.execute(any(OrdersGetRequest.class))).thenReturn(getResponse);

            // When
            GatewayPaymentResult result = payPalGateway.capturePayment(orderId);

            // Then
            assertThat(result.isSuccess()).isTrue();
            assertThat(result.getGatewayTransactionId()).isEqualTo("CAPTURE-123");
            
            // Should not attempt capture since already completed
            verify(payPalClient).execute(any(OrdersGetRequest.class));
            verify(payPalClient, never()).execute(any(OrdersCaptureRequest.class));
        }

        @Test
        @DisplayName("Should extract Capture ID from payment.captures[0].id")
        void testCapturePayment_CaptureIdExtraction() throws IOException {
            // Given
            String orderId = "PAYPAL-ORDER-123";
            String captureId = "CAPTURE-456";
            
            // Mock order status check - APPROVED
            Order approvedOrder = createMockOrder(orderId, "APPROVED");
            HttpResponse<Order> getResponse = mock(HttpResponse.class);
            when(getResponse.result()).thenReturn(approvedOrder);
            when(payPalClient.execute(any(OrdersGetRequest.class))).thenReturn(getResponse);
            
            // Mock capture response with capture ID
            Order completedOrder = createMockOrderWithCapture(orderId, "COMPLETED", captureId);
            HttpResponse<Order> captureResponse = mock(HttpResponse.class);
            when(captureResponse.result()).thenReturn(completedOrder);
            when(payPalClient.execute(any(OrdersCaptureRequest.class))).thenReturn(captureResponse);

            // When
            GatewayPaymentResult result = payPalGateway.capturePayment(orderId);

            // Then
            assertThat(result.getGatewayTransactionId()).isEqualTo(captureId);
            // Verify capture ID is used, not order ID
            assertThat(result.getGatewayTransactionId()).isNotEqualTo(orderId);
        }

        @Test
        @DisplayName("Should handle INSTRUMENT_DECLINED error")
        void testCapturePayment_InstrumentDeclined() throws IOException {
            // Given
            String orderId = "PAYPAL-ORDER-123";
            
            // Mock order status check - APPROVED
            Order approvedOrder = createMockOrder(orderId, "APPROVED");
            HttpResponse<Order> getResponse = mock(HttpResponse.class);
            when(getResponse.result()).thenReturn(approvedOrder);
            when(payPalClient.execute(any(OrdersGetRequest.class))).thenReturn(getResponse);
            
            // Mock capture failure with INSTRUMENT_DECLINED
            HttpException httpException = mock(HttpException.class);
            when(httpException.getMessage()).thenReturn("INSTRUMENT_DECLINED: Payment method declined");
            when(payPalClient.execute(any(OrdersCaptureRequest.class))).thenThrow(httpException);

            // When
            GatewayPaymentResult result = payPalGateway.capturePayment(orderId);

            // Then
            assertThat(result.isSuccess()).isFalse();
            assertThat(result.getErrorCode()).isEqualTo("INSTRUMENT_DECLINED");
            assertThat(result.getErrorMessage()).contains("payment method was declined");
        }

        @Test
        @DisplayName("Should handle PAYER_ACTION_REQUIRED error")
        void testCapturePayment_PayerActionRequired() throws IOException {
            // Given
            String orderId = "PAYPAL-ORDER-123";
            
            // Mock order status check - APPROVED
            Order approvedOrder = createMockOrder(orderId, "APPROVED");
            HttpResponse<Order> getResponse = mock(HttpResponse.class);
            when(getResponse.result()).thenReturn(approvedOrder);
            when(payPalClient.execute(any(OrdersGetRequest.class))).thenReturn(getResponse);
            
            // Mock capture failure with PAYER_ACTION_REQUIRED
            HttpException httpException = mock(HttpException.class);
            when(httpException.getMessage()).thenReturn("PAYER_ACTION_REQUIRED: Additional action needed");
            when(payPalClient.execute(any(OrdersCaptureRequest.class))).thenThrow(httpException);

            // When
            GatewayPaymentResult result = payPalGateway.capturePayment(orderId);

            // Then
            assertThat(result.isSuccess()).isFalse();
            assertThat(result.getErrorCode()).isEqualTo("PAYER_ACTION_REQUIRED");
            assertThat(result.getErrorMessage()).contains("Additional action required");
        }

        @Test
        @DisplayName("Should handle network timeout")
        void testCapturePayment_NetworkTimeout() throws IOException {
            // Given
            String orderId = "PAYPAL-ORDER-123";
            
            // Mock order status check - APPROVED
            Order approvedOrder = createMockOrder(orderId, "APPROVED");
            HttpResponse<Order> getResponse = mock(HttpResponse.class);
            when(getResponse.result()).thenReturn(approvedOrder);
            when(payPalClient.execute(any(OrdersGetRequest.class))).thenReturn(getResponse);
            
            // Mock network timeout
            IOException ioException = new IOException("Connection timeout");
            when(payPalClient.execute(any(OrdersCaptureRequest.class))).thenThrow(ioException);

            // When
            GatewayPaymentResult result = payPalGateway.capturePayment(orderId);

            // Then
            assertThat(result.isSuccess()).isFalse();
            assertThat(result.getErrorCode()).isEqualTo("PAYPAL_CAPTURE_ERROR");
            assertThat(result.getErrorMessage()).contains("Payment capture failed");
        }

        @Test
        @DisplayName("Should handle invalid order ID")
        void testCapturePayment_InvalidOrderId() throws IOException {
            // Given
            String invalidOrderId = "INVALID-ORDER";
            
            // Mock order status check failure
            HttpException httpException = mock(HttpException.class);
            when(httpException.getMessage()).thenReturn("INVALID_RESOURCE_ID: Order not found");
            when(payPalClient.execute(any(OrdersGetRequest.class))).thenThrow(httpException);
            
            // Mock capture attempt also fails with same exception
            when(payPalClient.execute(any(OrdersCaptureRequest.class))).thenThrow(httpException);

            // When
            GatewayPaymentResult result = payPalGateway.capturePayment(invalidOrderId);

            // Then
            assertThat(result.isSuccess()).isFalse();
            // Should attempt both status check and capture (as per implementation)
            verify(payPalClient, atLeastOnce()).execute(any());
        }

        @Test
        @DisplayName("Should handle ORDER_ALREADY_CAPTURED gracefully")
        void testCapturePayment_OrderAlreadyCaptured() throws IOException {
            // Given
            String orderId = "PAYPAL-ORDER-123";
            
            // Mock order status check - APPROVED
            Order approvedOrder = createMockOrder(orderId, "APPROVED");
            HttpResponse<Order> getResponse = mock(HttpResponse.class);
            lenient().when(getResponse.result()).thenReturn(approvedOrder);
            
            // Mock capture failure with ORDER_ALREADY_CAPTURED
            HttpException httpException = mock(HttpException.class);
            when(httpException.getMessage()).thenReturn("ORDER_ALREADY_CAPTURED: This order was already captured");
            when(payPalClient.execute(any(OrdersCaptureRequest.class))).thenThrow(httpException);
            
            // Mock getPaymentStatusAsResult to return success
            Order completedOrder = createMockOrderWithCapture(orderId, "COMPLETED", "CAPTURE-123");
            HttpResponse<Order> statusResponse = mock(HttpResponse.class);
            when(statusResponse.result()).thenReturn(completedOrder);
            when(payPalClient.execute(any(OrdersGetRequest.class)))
                    .thenReturn(getResponse)  // First call for status check
                    .thenReturn(statusResponse); // Second call for getPaymentStatusAsResult

            // When
            GatewayPaymentResult result = payPalGateway.capturePayment(orderId);

            // Then
            assertThat(result.isSuccess()).isTrue();
            assertThat(result.getGatewayTransactionId()).isNotNull();
        }
    }

    @Nested
    @DisplayName("refund Tests")
    class RefundTests {

        @Test
        @DisplayName("Should successfully refund payment")
        void testRefund_Success() throws IOException {
            // Given
            String captureId = "CAPTURE-123";
            BigDecimal amount = new BigDecimal("100.00");
            String currency = "USD";
            
            // Mock refund response with proper structure
            com.paypal.payments.Refund refund = mock(com.paypal.payments.Refund.class);
            when(refund.id()).thenReturn("REFUND-123");
            when(refund.status()).thenReturn("COMPLETED");
            
            // Mock the sellerPayableBreakdown and its nested totalRefundedAmount
            com.paypal.payments.MerchantPayableBreakdown sellerBreakdown = mock(com.paypal.payments.MerchantPayableBreakdown.class);
            com.paypal.payments.Money refundAmount = mock(com.paypal.payments.Money.class);
            when(refundAmount.value()).thenReturn("100.00");
            when(refundAmount.currencyCode()).thenReturn("USD");
            when(sellerBreakdown.totalRefundedAmount()).thenReturn(refundAmount);
            when(refund.sellerPayableBreakdown()).thenReturn(sellerBreakdown);
            
            HttpResponse<com.paypal.payments.Refund> response = mock(HttpResponse.class);
            when(response.result()).thenReturn(refund);
            when(payPalClient.execute(any(com.paypal.payments.CapturesRefundRequest.class))).thenReturn(response);

            // When
            GatewayRefundResult result = payPalGateway.refund(captureId, amount, currency);

            // Then
            assertThat(result).isNotNull();
            // Verify refund was attempted
            verify(payPalClient).execute(any(com.paypal.payments.CapturesRefundRequest.class));
        }
    }

    // ===== Helper Methods =====

    private Order createMockOrder(String orderId, String status) {
        Order order = mock(Order.class);
        lenient().when(order.id()).thenReturn(orderId);
        lenient().when(order.status()).thenReturn(status);
        
        PurchaseUnit purchaseUnit = mock(PurchaseUnit.class);
        AmountWithBreakdown amount = mock(AmountWithBreakdown.class);
        lenient().when(amount.currencyCode()).thenReturn("USD");
        lenient().when(amount.value()).thenReturn("100.00");
        lenient().when(purchaseUnit.amountWithBreakdown()).thenReturn(amount);
        
        List<PurchaseUnit> purchaseUnits = new ArrayList<>();
        purchaseUnits.add(purchaseUnit);
        lenient().when(order.purchaseUnits()).thenReturn(purchaseUnits);
        
        return order;
    }

    private Order createMockOrderWithCapture(String orderId, String status, String captureId) {
        Order order = createMockOrder(orderId, status);
        
        // Create amount for the purchase unit
        AmountWithBreakdown amountWithBreakdown = mock(AmountWithBreakdown.class);
        lenient().when(amountWithBreakdown.currencyCode()).thenReturn("USD");
        lenient().when(amountWithBreakdown.value()).thenReturn("100.00");
        
        // Create capture with its amount
        Capture capture = mock(Capture.class);
        lenient().when(capture.id()).thenReturn(captureId);
        
        Money captureAmount = mock(Money.class);
        lenient().when(captureAmount.currencyCode()).thenReturn("USD");
        lenient().when(captureAmount.value()).thenReturn("100.00");
        lenient().when(capture.amount()).thenReturn(captureAmount);
        
        List<Capture> captures = new ArrayList<>();
        captures.add(capture);
        
        // Use RETURNS_DEEP_STUBS to handle method chaining (payments().captures())
        // This allows us to mock the chain without needing the Payments type
        PurchaseUnit deepStubPurchaseUnit = mock(PurchaseUnit.class, org.mockito.Answers.RETURNS_DEEP_STUBS);
        lenient().when(deepStubPurchaseUnit.amountWithBreakdown()).thenReturn(amountWithBreakdown);
        
        // Set up the deep stub chain: payments().captures() returns our list
        // Note: This uses Mockito's deep stubs feature which automatically creates mocks for method chains
        lenient().when(deepStubPurchaseUnit.payments().captures()).thenReturn(captures);
        
        // Replace the purchaseUnit in the order's purchaseUnits list
        List<PurchaseUnit> purchaseUnits = new ArrayList<>();
        purchaseUnits.add(deepStubPurchaseUnit);
        lenient().when(order.purchaseUnits()).thenReturn(purchaseUnits);
        
        return order;
    }
}
