package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.payment.dto.response.InvoiceResponse;
import com.edumind.lms.modules.payment.entity.Invoice;
import com.edumind.lms.modules.payment.entity.Order;
import com.edumind.lms.modules.payment.entity.OrderItem;
import com.edumind.lms.modules.payment.enums.InvoiceStatus;
import com.edumind.lms.modules.payment.exception.InvoiceNotFoundException;
import com.edumind.lms.modules.payment.mapper.InvoiceMapper;
import com.edumind.lms.modules.payment.repository.InvoiceRepository;
import com.edumind.lms.modules.payment.repository.OrderItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class InvoiceServiceImpl implements InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final OrderItemRepository orderItemRepository;
    private final NumberGeneratorService numberGeneratorService;
    private final InvoiceMapper invoiceMapper;

    // Platform info
    private static final String SELLER_NAME = "EduMind Learning Platform";
    private static final String SELLER_ADDRESS = "123 Education Street, Learning City, LC 12345";
    private static final String SELLER_EMAIL = "billing@edumind.com";
    private static final String SELLER_TAX_ID = "TAX-123456789";
    private static final String SELLER_PHONE = "+1 (555) 123-4567";

    @Override
    @Transactional
    public InvoiceResponse generateInvoice(Order order) {
        log.info("Generating invoice for order: {}", order.getOrderNumber());

        // Check if invoice already exists
        if (invoiceRepository.existsByOrderId(order.getId())) {
            log.warn("Invoice already exists for order: {}", order.getOrderNumber());
            Invoice existing = invoiceRepository.findByOrderId(order.getId()).orElseThrow();
            return buildInvoiceResponse(existing);
        }

        Invoice invoice = new Invoice();
        invoice.setInvoiceNumber(numberGeneratorService.generateInvoiceNumber());
        invoice.setOrder(order);
        invoice.setUserId(order.getUserId());

        // Buyer info
        invoice.setBuyerName(order.getCustomerName());
        invoice.setBuyerEmail(order.getCustomerEmail());

        // Amounts
        invoice.setSubtotal(order.getSubtotal());
        invoice.setDiscountTotal(order.getDiscountTotal());
        invoice.setTaxAmount(BigDecimal.ZERO);
        invoice.setTaxRate(BigDecimal.ZERO);
        invoice.setTotalAmount(order.getTotalAmount());
        invoice.setCurrency(order.getCurrency());

        // Status
        invoice.setStatus(InvoiceStatus.GENERATED);

        // Timestamps
        invoice.setIssuedAt(LocalDateTime.now());
        invoice.setCreatedAt(LocalDateTime.now());

        Invoice saved = invoiceRepository.save(invoice);

        log.info("Invoice generated: {} for order {}", saved.getInvoiceNumber(), order.getOrderNumber());

        return buildInvoiceResponse(saved);
    }

    private InvoiceResponse buildInvoiceResponse(Invoice invoice) {
        List<OrderItem> items = orderItemRepository.findByOrderId(invoice.getOrder().getId());
        List<com.edumind.lms.modules.payment.dto.response.OrderItemResponse> itemResponses = items.stream()
                .map(item -> {
                    com.edumind.lms.modules.payment.dto.response.OrderItemResponse.OrderItemResponseBuilder builder =
                            com.edumind.lms.modules.payment.dto.response.OrderItemResponse.builder()
                                    .id(item.getId())
                                    .courseId(item.getCourseId())
                                    .courseTitle(item.getCourseTitle())
                                    .courseSlug(item.getCourseSlug())
                                    .courseThumbnailUrl(item.getCourseThumbnailUrl())
                                    .instructorId(item.getInstructorId())
                                    .instructorName(item.getInstructorName())
                                    .originalPrice(item.getOriginalPrice())
                                    .finalPrice(item.getFinalPrice())
                                    .discountAmount(item.getDiscountAmount());
                    return builder.build();
                })
                .collect(java.util.stream.Collectors.toList());

        return invoiceMapper.toResponse(
                invoice,
                SELLER_NAME,
                SELLER_ADDRESS,
                SELLER_TAX_ID,
                SELLER_EMAIL,
                SELLER_PHONE,
                itemResponses
        );
    }

    @Override
    @Transactional(readOnly = true)
    public InvoiceResponse getInvoiceById(Long invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new InvoiceNotFoundException(invoiceId));
        return buildInvoiceResponse(invoice);
    }

    @Override
    @Transactional(readOnly = true)
    public InvoiceResponse getInvoiceByNumber(String invoiceNumber) {
        Invoice invoice = invoiceRepository.findByInvoiceNumber(invoiceNumber)
                .orElseThrow(() -> new InvoiceNotFoundException(invoiceNumber));
        return buildInvoiceResponse(invoice);
    }

    @Override
    @Transactional(readOnly = true)
    public InvoiceResponse getInvoiceByOrder(Long orderId) {
        Invoice invoice = invoiceRepository.findByOrderId(orderId)
                .orElseThrow(() -> new InvoiceNotFoundException("Order: " + orderId));
        return buildInvoiceResponse(invoice);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<InvoiceResponse> getUserInvoices(Long userId, Pageable pageable) {
        return invoiceRepository.findByUserIdOrderByIssuedAtDesc(userId, pageable)
                .map(this::buildInvoiceResponse);
    }

    @Override
    @Transactional
    public String generateInvoicePdf(Long invoiceId) {
        log.info("Generating PDF for invoice: {}", invoiceId);

        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new InvoiceNotFoundException(invoiceId));

        // TODO: Implement PDF generation with Cloudinary upload
        String pdfUrl = "https://cloudinary.com/edumind/invoices/" + invoice.getInvoiceNumber() + ".pdf";

        invoice.setPdfUrl(pdfUrl);
        invoiceRepository.save(invoice);

        log.info("PDF generated for invoice {}: {}", invoice.getInvoiceNumber(), pdfUrl);

        return pdfUrl;
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] generateInvoicePdfBytes(Long invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new InvoiceNotFoundException(invoiceId));

        log.info("Generating PDF bytes for invoice: {}", invoice.getInvoiceNumber());

        // TODO: Implement actual PDF generation using a library like iText or Apache PDFBox
        // For now, return empty byte array as placeholder
        log.warn("PDF generation not yet implemented, returning empty bytes");
        return new byte[0];
    }

    @Override
    @Transactional(readOnly = true)
    public InvoiceResponse getInvoiceByIdAndUser(Long invoiceId, Long userId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new InvoiceNotFoundException(invoiceId));

        if (!invoice.getUserId().equals(userId)) {
            throw new InvoiceNotFoundException(invoiceId);
        }

        return buildInvoiceResponse(invoice);
    }

    @Override
    @Transactional(readOnly = true)
    public InvoiceResponse getInvoiceByNumberAndUser(String invoiceNumber, Long userId) {
        Invoice invoice = invoiceRepository.findByInvoiceNumber(invoiceNumber)
                .orElseThrow(() -> new InvoiceNotFoundException(invoiceNumber));

        if (!invoice.getUserId().equals(userId)) {
            throw new InvoiceNotFoundException(invoiceNumber);
        }

        return buildInvoiceResponse(invoice);
    }

    @Override
    @Transactional(readOnly = true)
    public InvoiceResponse getInvoiceByOrderIdAndUser(Long orderId, Long userId) {
        Invoice invoice = invoiceRepository.findByOrderId(orderId)
                .orElseThrow(() -> new InvoiceNotFoundException("Order: " + orderId));

        if (!invoice.getUserId().equals(userId)) {
            throw new InvoiceNotFoundException("Order: " + orderId);
        }

        return buildInvoiceResponse(invoice);
    }

    @Override
    @Transactional
    public void sendInvoiceEmail(Long invoiceId) {
        log.info("Sending invoice email for: {}", invoiceId);

        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new InvoiceNotFoundException(invoiceId));

        if (invoice.getPdfUrl() == null) {
            generateInvoicePdf(invoiceId);
        }

        // TODO: Publish event to send email via Auth Service

        invoice.setStatus(InvoiceStatus.SENT);
        invoice.setSentAt(LocalDateTime.now());
        invoiceRepository.save(invoice);

        log.info("Invoice email sent for: {}", invoice.getInvoiceNumber());
    }
}