package com.edumind.lms.modules.payment.service;

import com.edumind.common.dto.FileUploadResponse;
import com.edumind.common.service.CloudinaryService;
import com.edumind.lms.modules.payment.dto.response.InvoiceResponse;
import com.edumind.lms.modules.payment.entity.Invoice;
import com.edumind.lms.modules.payment.entity.Order;
import com.edumind.lms.modules.payment.entity.OrderItem;
import com.edumind.lms.modules.payment.enums.InvoiceStatus;
import com.edumind.lms.modules.payment.enums.OrderStatus;
import com.edumind.lms.modules.payment.exception.InvoiceNotFoundException;
import com.edumind.lms.modules.payment.mapper.InvoiceMapper;
import com.edumind.lms.modules.payment.repository.InvoiceRepository;
import com.edumind.lms.modules.payment.repository.OrderItemRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashSet;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("InvoiceService Unit Tests")
class InvoiceServiceTest {

    @Mock
    private InvoiceRepository invoiceRepository;

    @Mock
    private OrderItemRepository orderItemRepository;

    @Mock
    private NumberGeneratorService numberGeneratorService;

    @Mock
    private InvoiceMapper invoiceMapper;

    @Mock
    private CloudinaryService cloudinaryService;

    @InjectMocks
    private InvoiceServiceImpl invoiceService;

    private Long userId = 1L;
    private Long invoiceId = 100L;
    private Long orderId = 200L;
    private String invoiceNumber = "INV-2026-001";
    private Invoice invoice;
    private Order order;
    private InvoiceResponse invoiceResponse;

    @BeforeEach
    void setUp() {
        order = new Order();
        order.setId(orderId);
        order.setOrderNumber("ORD-2026-001");
        order.setUserId(userId);
        order.setStatus(OrderStatus.COMPLETED);
        order.setSubtotal(new BigDecimal("100.00"));
        order.setDiscountTotal(BigDecimal.ZERO);
        order.setTotalAmount(new BigDecimal("100.00"));
        order.setCurrency("USD");
        order.setCustomerName("Test User");
        order.setCustomerEmail("test@example.com");
        order.setItems(new HashSet<>());

        invoice = new Invoice();
        invoice.setId(invoiceId);
        invoice.setInvoiceNumber(invoiceNumber);
        invoice.setOrder(order);
        invoice.setUserId(userId);
        invoice.setBuyerName("Test User");
        invoice.setBuyerEmail("test@example.com");
        invoice.setSubtotal(new BigDecimal("100.00"));
        invoice.setDiscountTotal(BigDecimal.ZERO);
        invoice.setTaxAmount(BigDecimal.ZERO);
        invoice.setTaxRate(BigDecimal.ZERO);
        invoice.setTotalAmount(new BigDecimal("100.00"));
        invoice.setCurrency("USD");
        invoice.setStatus(InvoiceStatus.GENERATED);
        invoice.setIssuedAt(LocalDateTime.now());

        invoiceResponse = InvoiceResponse.builder()
                .id(invoiceId)
                .invoiceNumber(invoiceNumber)
                .orderId(orderId)
                .orderNumber("ORD-2026-001")
                .buyerId(userId)
                .buyerName("Test User")
                .buyerEmail("test@example.com")
                .subtotal(new BigDecimal("100.00"))
                .discountTotal(BigDecimal.ZERO)
                .totalAmount(new BigDecimal("100.00"))
                .currency("USD")
                .status(InvoiceStatus.GENERATED)
                .build();
    }

    @Nested
    @DisplayName("generateInvoice Tests")
    class GenerateInvoiceTests {

        @Test
        @DisplayName("Should generate new invoice for order")
        void generateInvoice_NewOrder_CreatesInvoice() {
            // Given
            when(invoiceRepository.existsByOrderId(orderId)).thenReturn(false);
            when(numberGeneratorService.generateInvoiceNumber()).thenReturn(invoiceNumber);
            when(invoiceRepository.save(any(Invoice.class))).thenReturn(invoice);
            when(orderItemRepository.findByOrderId(orderId)).thenReturn(Collections.emptyList());
            when(invoiceMapper.toResponse(any(), any(), any(), any(), any(), any(), any())).thenReturn(invoiceResponse);

            // When
            InvoiceResponse result = invoiceService.generateInvoice(order);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getInvoiceNumber()).isEqualTo(invoiceNumber);
            verify(invoiceRepository).save(any(Invoice.class));
        }

        @Test
        @DisplayName("Should return existing invoice if already exists")
        void generateInvoice_ExistingInvoice_ReturnsExisting() {
            // Given
            when(invoiceRepository.existsByOrderId(orderId)).thenReturn(true);
            when(invoiceRepository.findByOrderId(orderId)).thenReturn(Optional.of(invoice));
            when(orderItemRepository.findByOrderId(orderId)).thenReturn(Collections.emptyList());
            when(invoiceMapper.toResponse(any(), any(), any(), any(), any(), any(), any())).thenReturn(invoiceResponse);

            // When
            InvoiceResponse result = invoiceService.generateInvoice(order);

            // Then
            assertThat(result).isNotNull();
            verify(invoiceRepository, never()).save(any(Invoice.class));
        }
    }

    @Nested
    @DisplayName("getInvoiceById Tests")
    class GetInvoiceByIdTests {

        @Test
        @DisplayName("Should return invoice by ID")
        void getInvoiceById_Exists_ReturnsInvoice() {
            // Given
            when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
            when(orderItemRepository.findByOrderId(orderId)).thenReturn(Collections.emptyList());
            when(invoiceMapper.toResponse(any(), any(), any(), any(), any(), any(), any())).thenReturn(invoiceResponse);

            // When
            InvoiceResponse result = invoiceService.getInvoiceById(invoiceId);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(invoiceId);
        }

        @Test
        @DisplayName("Should throw exception if invoice not found")
        void getInvoiceById_NotFound_ThrowsException() {
            // Given
            when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.empty());

            // When & Then
            assertThatThrownBy(() -> invoiceService.getInvoiceById(invoiceId))
                    .isInstanceOf(InvoiceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("getInvoiceByNumber Tests")
    class GetInvoiceByNumberTests {

        @Test
        @DisplayName("Should return invoice by number")
        void getInvoiceByNumber_Exists_ReturnsInvoice() {
            // Given
            when(invoiceRepository.findByInvoiceNumber(invoiceNumber)).thenReturn(Optional.of(invoice));
            when(orderItemRepository.findByOrderId(orderId)).thenReturn(Collections.emptyList());
            when(invoiceMapper.toResponse(any(), any(), any(), any(), any(), any(), any())).thenReturn(invoiceResponse);

            // When
            InvoiceResponse result = invoiceService.getInvoiceByNumber(invoiceNumber);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getInvoiceNumber()).isEqualTo(invoiceNumber);
        }
    }

    @Nested
    @DisplayName("getInvoiceByOrder Tests")
    class GetInvoiceByOrderTests {

        @Test
        @DisplayName("Should return invoice by order ID")
        void getInvoiceByOrder_Exists_ReturnsInvoice() {
            // Given
            when(invoiceRepository.findByOrderId(orderId)).thenReturn(Optional.of(invoice));
            when(orderItemRepository.findByOrderId(orderId)).thenReturn(Collections.emptyList());
            when(invoiceMapper.toResponse(any(), any(), any(), any(), any(), any(), any())).thenReturn(invoiceResponse);

            // When
            InvoiceResponse result = invoiceService.getInvoiceByOrder(orderId);

            // Then
            assertThat(result).isNotNull();
        }
    }

    @Nested
    @DisplayName("getUserInvoices Tests")
    class GetUserInvoicesTests {

        @Test
        @DisplayName("Should return paginated invoices for user")
        void getUserInvoices_ReturnsPage() {
            // Given
            Pageable pageable = PageRequest.of(0, 10);
            Page<Invoice> invoicePage = new PageImpl<>(Collections.singletonList(invoice));

            when(invoiceRepository.findByUserIdOrderByIssuedAtDesc(userId, pageable)).thenReturn(invoicePage);
            when(orderItemRepository.findByOrderId(orderId)).thenReturn(Collections.emptyList());
            when(invoiceMapper.toResponse(any(), any(), any(), any(), any(), any(), any())).thenReturn(invoiceResponse);

            // When
            Page<InvoiceResponse> result = invoiceService.getUserInvoices(userId, pageable);

            // Then
            assertThat(result.getContent()).hasSize(1);
        }
    }

    @Nested
    @DisplayName("getInvoiceByIdAndUser Tests")
    class GetInvoiceByIdAndUserTests {

        @Test
        @DisplayName("Should return invoice for valid user")
        void getInvoiceByIdAndUser_ValidUser_ReturnsInvoice() {
            // Given
            when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
            when(orderItemRepository.findByOrderId(orderId)).thenReturn(Collections.emptyList());
            when(invoiceMapper.toResponse(any(), any(), any(), any(), any(), any(), any())).thenReturn(invoiceResponse);

            // When
            InvoiceResponse result = invoiceService.getInvoiceByIdAndUser(invoiceId, userId);

            // Then
            assertThat(result).isNotNull();
        }

        @Test
        @DisplayName("Should throw exception if user does not own invoice")
        void getInvoiceByIdAndUser_WrongUser_ThrowsException() {
            // Given
            invoice.setUserId(999L);
            when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));

            // When & Then
            assertThatThrownBy(() -> invoiceService.getInvoiceByIdAndUser(invoiceId, userId))
                    .isInstanceOf(InvoiceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("getInvoiceByNumberAndUser Tests")
    class GetInvoiceByNumberAndUserTests {

        @Test
        @DisplayName("Should return invoice for valid user")
        void getInvoiceByNumberAndUser_ValidUser_ReturnsInvoice() {
            // Given
            when(invoiceRepository.findByInvoiceNumber(invoiceNumber)).thenReturn(Optional.of(invoice));
            when(orderItemRepository.findByOrderId(orderId)).thenReturn(Collections.emptyList());
            when(invoiceMapper.toResponse(any(), any(), any(), any(), any(), any(), any())).thenReturn(invoiceResponse);

            // When
            InvoiceResponse result = invoiceService.getInvoiceByNumberAndUser(invoiceNumber, userId);

            // Then
            assertThat(result).isNotNull();
        }

        @Test
        @DisplayName("Should throw exception if user does not own invoice")
        void getInvoiceByNumberAndUser_WrongUser_ThrowsException() {
            // Given
            invoice.setUserId(999L);
            when(invoiceRepository.findByInvoiceNumber(invoiceNumber)).thenReturn(Optional.of(invoice));

            // When & Then
            assertThatThrownBy(() -> invoiceService.getInvoiceByNumberAndUser(invoiceNumber, userId))
                    .isInstanceOf(InvoiceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("getInvoiceByOrderIdAndUser Tests")
    class GetInvoiceByOrderIdAndUserTests {

        @Test
        @DisplayName("Should return invoice for valid user")
        void getInvoiceByOrderIdAndUser_ValidUser_ReturnsInvoice() {
            // Given
            when(invoiceRepository.findByOrderId(orderId)).thenReturn(Optional.of(invoice));
            when(orderItemRepository.findByOrderId(orderId)).thenReturn(Collections.emptyList());
            when(invoiceMapper.toResponse(any(), any(), any(), any(), any(), any(), any())).thenReturn(invoiceResponse);

            // When
            InvoiceResponse result = invoiceService.getInvoiceByOrderIdAndUser(orderId, userId);

            // Then
            assertThat(result).isNotNull();
        }
    }

    @Nested
    @DisplayName("generateInvoicePdf Tests")
    class GenerateInvoicePdfTests {

        @Test
        @DisplayName("Should generate PDF and upload to Cloudinary")
        void generateInvoicePdf_Success_ReturnsPdfUrl() {
            // Given
            FileUploadResponse uploadResult = FileUploadResponse.builder()
                    .url("https://cloudinary.com/invoice.pdf")
                    .publicId("invoices/INV-2026-001")
                    .build();

            when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
            when(orderItemRepository.findByOrderId(orderId)).thenReturn(Collections.emptyList());
            when(cloudinaryService.uploadPdf(any(), any(), any())).thenReturn(uploadResult);
            when(invoiceRepository.save(any(Invoice.class))).thenReturn(invoice);

            // When
            String pdfUrl = invoiceService.generateInvoicePdf(invoiceId);

            // Then
            assertThat(pdfUrl).isEqualTo("https://cloudinary.com/invoice.pdf");
            verify(cloudinaryService).uploadPdf(any(), any(), any());
        }
    }

    @Nested
    @DisplayName("sendInvoiceEmail Tests")
    class SendInvoiceEmailTests {

        @Test
        @DisplayName("Should update invoice status to SENT")
        void sendInvoiceEmail_UpdatesStatus() {
            // Given
            invoice.setPdfUrl("https://cloudinary.com/invoice.pdf");
            when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
            when(invoiceRepository.save(any(Invoice.class))).thenReturn(invoice);

            // When
            invoiceService.sendInvoiceEmail(invoiceId);

            // Then
            assertThat(invoice.getStatus()).isEqualTo(InvoiceStatus.SENT);
            assertThat(invoice.getSentAt()).isNotNull();
            verify(invoiceRepository).save(invoice);
        }

        @Test
        @DisplayName("Should generate PDF if not exists before sending email")
        void sendInvoiceEmail_NoPdf_GeneratesPdf() {
            // Given
            invoice.setPdfUrl(null);
            FileUploadResponse uploadResult = FileUploadResponse.builder()
                    .url("https://cloudinary.com/invoice.pdf")
                    .publicId("invoices/INV-2026-001")
                    .build();

            when(invoiceRepository.findById(invoiceId)).thenReturn(Optional.of(invoice));
            when(orderItemRepository.findByOrderId(orderId)).thenReturn(Collections.emptyList());
            when(cloudinaryService.uploadPdf(any(), any(), any())).thenReturn(uploadResult);
            when(invoiceRepository.save(any(Invoice.class))).thenReturn(invoice);

            // When
            invoiceService.sendInvoiceEmail(invoiceId);

            // Then
            verify(cloudinaryService).uploadPdf(any(), any(), any());
        }
    }
}
