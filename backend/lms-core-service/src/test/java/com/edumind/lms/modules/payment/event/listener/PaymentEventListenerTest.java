package com.edumind.lms.modules.payment.event.listener;

import com.edumind.lms.modules.payment.dto.response.InvoiceResponse;
import com.edumind.lms.modules.payment.event.OrderCompletedEvent;
import com.edumind.lms.modules.payment.service.CartService;
import com.edumind.lms.modules.payment.service.EarningService;
import com.edumind.lms.modules.payment.service.InvoiceService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PaymentEventListener Unit Tests")
class PaymentEventListenerTest {

    @Mock
    private CartService cartService;

    @Mock
    private EarningService earningService;

    @Mock
    private InvoiceService invoiceService;

    @InjectMocks
    private PaymentEventListener listener;

    private OrderCompletedEvent buildEvent(boolean freeOrder, List<OrderCompletedEvent.OrderItemInfo> items) {
        return new OrderCompletedEvent(this, 10L, "ORD-001", 5L, items,
                new BigDecimal("100.00"), "USD", freeOrder);
    }

    @Nested
    @DisplayName("handleCartClearing()")
    class HandleCartClearingTests {

        @Test
        @DisplayName("Should remove purchased courses from cart")
        void handleCartClearing_ValidItems_RemovesFromCart() {
            List<OrderCompletedEvent.OrderItemInfo> items = List.of(
                    new OrderCompletedEvent.OrderItemInfo(1L, "Course A", 100L, BigDecimal.TEN),
                    new OrderCompletedEvent.OrderItemInfo(2L, "Course B", 101L, BigDecimal.TEN)
            );
            OrderCompletedEvent event = buildEvent(false, items);

            listener.handleCartClearing(event);

            verify(cartService).removeItems(eq(5L), eq(List.of(1L, 2L)));
        }

        @Test
        @DisplayName("Should filter out null items before removing from cart")
        void handleCartClearing_NullItemInList_FiltersOut() {
            List<OrderCompletedEvent.OrderItemInfo> items = new ArrayList<>();
            items.add(null);
            items.add(new OrderCompletedEvent.OrderItemInfo(1L, "Course A", 100L, BigDecimal.TEN));
            OrderCompletedEvent event = buildEvent(false, items);

            listener.handleCartClearing(event);

            verify(cartService).removeItems(eq(5L), eq(List.of(1L)));
        }

        @Test
        @DisplayName("Should skip cart clearing when items list is null")
        void handleCartClearing_NullItems_Skips() {
            OrderCompletedEvent event = buildEvent(false, null);

            listener.handleCartClearing(event);

            verifyNoInteractions(cartService);
        }

        @Test
        @DisplayName("Should skip cart clearing when items list is empty")
        void handleCartClearing_EmptyItems_Skips() {
            OrderCompletedEvent event = buildEvent(false, List.of());

            listener.handleCartClearing(event);

            verifyNoInteractions(cartService);
        }

        @Test
        @DisplayName("Should log and continue when cart removal fails")
        void handleCartClearing_ServiceThrows_LogsAndContinues() {
            List<OrderCompletedEvent.OrderItemInfo> items = List.of(
                    new OrderCompletedEvent.OrderItemInfo(1L, "Course A", 100L, BigDecimal.TEN)
            );
            OrderCompletedEvent event = buildEvent(false, items);
            doThrow(new RuntimeException("DB error")).when(cartService).removeItems(anyLong(), anyList());

            // Should not throw
            listener.handleCartClearing(event);
        }
    }

    @Nested
    @DisplayName("handleEarningsCreation()")
    class HandleEarningsCreationTests {

        @Test
        @DisplayName("Should create earnings for order")
        void handleEarningsCreation_ValidEvent_CreatesEarnings() {
            OrderCompletedEvent event = buildEvent(false, List.of());

            listener.handleEarningsCreation(event);

            verify(earningService).createEarningsForOrder(10L);
        }

        @Test
        @DisplayName("Should log and continue when earnings creation fails")
        void handleEarningsCreation_ServiceThrows_LogsAndContinues() {
            OrderCompletedEvent event = buildEvent(false, List.of());
            doThrow(new RuntimeException("DB error")).when(earningService).createEarningsForOrder(anyLong());

            // Should not throw
            listener.handleEarningsCreation(event);
        }
    }

    @Nested
    @DisplayName("handleInvoiceGeneration()")
    class HandleInvoiceGenerationTests {

        @Test
        @DisplayName("Should skip invoice generation for free orders")
        void handleInvoiceGeneration_FreeOrder_Skips() {
            OrderCompletedEvent event = buildEvent(true, List.of());

            listener.handleInvoiceGeneration(event);

            verifyNoInteractions(invoiceService);
        }

        @Test
        @DisplayName("Should generate invoice and PDF for paid orders")
        void handleInvoiceGeneration_PaidOrder_GeneratesInvoiceAndPdf() {
            OrderCompletedEvent event = buildEvent(false, List.of());

            InvoiceResponse invoiceResponse = InvoiceResponse.builder().id(99L).build();
            when(invoiceService.generateInvoice(10L)).thenReturn(invoiceResponse);
            when(invoiceService.generateInvoicePdf(99L)).thenReturn("https://cdn.example.com/invoice.pdf");

            listener.handleInvoiceGeneration(event);

            verify(invoiceService).generateInvoice(10L);
            verify(invoiceService).generateInvoicePdf(99L);
        }

        @Test
        @DisplayName("Should log invoice ID when PDF generation fails (no orphan silenced)")
        void handleInvoiceGeneration_PdfFails_LogsInvoiceId() {
            OrderCompletedEvent event = buildEvent(false, List.of());

            InvoiceResponse invoiceResponse = InvoiceResponse.builder().id(99L).build();
            when(invoiceService.generateInvoice(10L)).thenReturn(invoiceResponse);
            doThrow(new RuntimeException("Cloudinary error")).when(invoiceService).generateInvoicePdf(99L);

            // Should not throw — invoice was created, PDF can be retried
            listener.handleInvoiceGeneration(event);

            verify(invoiceService).generateInvoice(10L);
            verify(invoiceService).generateInvoicePdf(99L);
        }

        @Test
        @DisplayName("Should log error when invoice creation itself fails")
        void handleInvoiceGeneration_InvoiceCreationFails_LogsError() {
            OrderCompletedEvent event = buildEvent(false, List.of());
            doThrow(new RuntimeException("DB error")).when(invoiceService).generateInvoice(anyLong());

            // Should not throw
            listener.handleInvoiceGeneration(event);

            verify(invoiceService).generateInvoice(10L);
            verify(invoiceService, never()).generateInvoicePdf(any());
        }
    }
}
