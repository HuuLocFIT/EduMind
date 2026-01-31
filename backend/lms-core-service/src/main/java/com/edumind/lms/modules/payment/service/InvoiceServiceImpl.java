package com.edumind.lms.modules.payment.service;

import com.edumind.common.service.CloudinaryService;
import com.edumind.lms.modules.payment.config.PaymentConstants;
import com.edumind.lms.modules.payment.dto.response.InvoiceResponse;
import com.edumind.lms.modules.payment.dto.response.OrderItemResponse;
import com.edumind.lms.modules.payment.entity.Invoice;
import com.edumind.lms.modules.payment.entity.Order;
import com.edumind.lms.modules.payment.entity.OrderItem;
import com.edumind.lms.modules.payment.enums.InvoiceStatus;
import com.edumind.lms.modules.payment.exception.InvoiceNotFoundException;
import com.edumind.lms.modules.payment.mapper.InvoiceMapper;
import com.edumind.lms.modules.payment.repository.InvoiceRepository;
import com.edumind.lms.modules.payment.repository.OrderItemRepository;
import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.HorizontalAlignment;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class InvoiceServiceImpl implements InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final OrderItemRepository orderItemRepository;
    private final NumberGeneratorService numberGeneratorService;
    private final InvoiceMapper invoiceMapper;
    private final CloudinaryService cloudinaryService;

    // Platform info
    private static final String SELLER_NAME = "EduMind Learning Platform";
    private static final String SELLER_ADDRESS = "123 Education Street, Learning City, LC 12345";
    private static final String SELLER_EMAIL = "billing@edumind.com";
    private static final String SELLER_TAX_ID = "TAX-123456789";
    private static final String SELLER_PHONE = "+1 (555) 123-4567";

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
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

        // Buyer info - handle null email by fetching from user service
        String buyerName = order.getCustomerName() != null && !order.getCustomerName().isBlank() 
                ? order.getCustomerName() 
                : "Customer";
        String buyerEmail = order.getCustomerEmail();
        
        // Final fallback - use a placeholder email if still null
        if (buyerEmail == null || buyerEmail.isBlank()) {
            buyerEmail = "user-" + order.getUserId() + "@edumind.com";
            log.warn("Order {} has no customer email - using fallback email: {}", 
                    order.getOrderNumber(), buyerEmail);
        }
        
        invoice.setBuyerName(buyerName);
        invoice.setBuyerEmail(buyerEmail);

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
        List<OrderItemResponse> itemResponses = items.stream()
                .map(item -> {
                    OrderItemResponse.OrderItemResponseBuilder builder =
                            OrderItemResponse.builder()
                                    .id(item.getId())
                                    .courseId(item.getCourseId())
                                    .courseTitle(item.getCourseTitle())
                                    .courseSlug(item.getCourseSlug())
                                    .courseThumbnailUrl(item.getCourseThumbnailUrl())
                                    .instructorId(item.getInstructorId())
                                    .instructorName(item.getInstructorName())
                                    .originalPrice(item.getOriginalPrice())
                                    .finalPrice(item.getFinalPrice())
                                    .discountAmount(item.getDiscountAmount())
                                    .currency(item.getCurrency() != null ? item.getCurrency() : "USD")
                                    .createdAt(item.getCreatedAt());
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

        // Delete old PDF if exists
        if (invoice.getPdfPublicId() != null && !invoice.getPdfPublicId().isEmpty()) {
            try {
                cloudinaryService.deleteFile(invoice.getPdfPublicId(), "raw");
            } catch (Exception e) {
                log.warn("Failed to delete old PDF from Cloudinary: {}", e.getMessage());
            }
        }

        // Generate PDF bytes
        byte[] pdfBytes = generateInvoicePdfBytes(invoiceId);

        // Upload to Cloudinary
        String filename = invoice.getInvoiceNumber();
        var uploadResult = cloudinaryService.uploadPdf(
                pdfBytes,
                PaymentConstants.CLOUDINARY_INVOICE_FOLDER,
                filename
        );

        String pdfUrl = uploadResult.getUrl();
        String pdfPublicId = uploadResult.getPublicId();

        // Update invoice with PDF URL and public ID
        invoice.setPdfUrl(pdfUrl);
        invoice.setPdfPublicId(pdfPublicId);
        invoiceRepository.save(invoice);

        log.info("PDF generated and uploaded for invoice {}: {}", invoice.getInvoiceNumber(), pdfUrl);

        return pdfUrl;
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] generateInvoicePdfBytes(Long invoiceId) {
        Invoice invoice = invoiceRepository.findById(invoiceId)
                .orElseThrow(() -> new InvoiceNotFoundException(invoiceId));

        log.info("Generating PDF bytes for invoice: {}", invoice.getInvoiceNumber());

        try {
            return createInvoicePdf(invoice);
        } catch (IOException e) {
            log.error("Failed to generate PDF for invoice: {}", invoice.getInvoiceNumber(), e);
            throw new RuntimeException("Failed to generate PDF: " + e.getMessage(), e);
        }
    }

    /**
     * Create PDF document from invoice data
     */
    private byte[] createInvoicePdf(Invoice invoice) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(baos);
        PdfDocument pdfDoc = new PdfDocument(writer);
        Document document = new Document(pdfDoc);

        // Fonts
        PdfFont fontBold = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
        PdfFont fontNormal = PdfFontFactory.createFont(StandardFonts.HELVETICA);

        // Header
        Paragraph title = new Paragraph("INVOICE")
                .setFont(fontBold)
                .setFontSize(24)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginBottom(20);
        document.add(title);

        // Invoice info table
        Table infoTable = new Table(UnitValue.createPercentArray(new float[]{1, 1}))
                .useAllAvailableWidth()
                .setMarginBottom(30);

        // Left column - Seller info
        Cell sellerCell = new Cell()
                .add(new Paragraph("From:").setFont(fontBold).setFontSize(12))
                .add(new Paragraph(SELLER_NAME).setFont(fontNormal).setFontSize(10))
                .add(new Paragraph(SELLER_ADDRESS).setFont(fontNormal).setFontSize(10))
                .add(new Paragraph("Email: " + SELLER_EMAIL).setFont(fontNormal).setFontSize(10))
                .add(new Paragraph("Phone: " + SELLER_PHONE).setFont(fontNormal).setFontSize(10))
                .add(new Paragraph("Tax ID: " + SELLER_TAX_ID).setFont(fontNormal).setFontSize(10))
                .setPadding(10)
                .setBorder(null);
        infoTable.addCell(sellerCell);

        // Right column - Invoice details
        Cell invoiceCell = new Cell()
                .add(new Paragraph("Invoice Details").setFont(fontBold).setFontSize(12))
                .add(new Paragraph("Invoice #: " + invoice.getInvoiceNumber()).setFont(fontNormal).setFontSize(10))
                .add(new Paragraph("Order #: " + invoice.getOrder().getOrderNumber()).setFont(fontNormal).setFontSize(10))
                .add(new Paragraph("Date: " + formatDate(invoice.getIssuedAt())).setFont(fontNormal).setFontSize(10))
                .add(new Paragraph("Status: " + invoice.getStatus().name()).setFont(fontNormal).setFontSize(10))
                .setPadding(10)
                .setBorder(null)
                .setTextAlignment(TextAlignment.RIGHT);
        infoTable.addCell(invoiceCell);

        document.add(infoTable);

        // Buyer info
        Paragraph buyerTitle = new Paragraph("Bill To:").setFont(fontBold).setFontSize(12).setMarginTop(20);
        document.add(buyerTitle);
        document.add(new Paragraph(invoice.getBuyerName()).setFont(fontNormal).setFontSize(10));
        document.add(new Paragraph(invoice.getBuyerEmail()).setFont(fontNormal).setFontSize(10));
        document.add(new Paragraph(" ").setMarginBottom(20)); // Spacing

        // Items table
        List<OrderItem> items = orderItemRepository.findByOrderId(invoice.getOrder().getId());
        
        Table itemsTable = new Table(UnitValue.createPercentArray(new float[]{3, 2, 2, 2}))
                .useAllAvailableWidth()
                .setMarginTop(20)
                .setMarginBottom(20);

        // Header row
        itemsTable.addHeaderCell(new Cell().add(new Paragraph("Item").setFont(fontBold).setFontSize(10)).setPadding(8));
        itemsTable.addHeaderCell(new Cell().add(new Paragraph("Price").setFont(fontBold).setFontSize(10)).setPadding(8).setTextAlignment(TextAlignment.RIGHT));
        itemsTable.addHeaderCell(new Cell().add(new Paragraph("Discount").setFont(fontBold).setFontSize(10)).setPadding(8).setTextAlignment(TextAlignment.RIGHT));
        itemsTable.addHeaderCell(new Cell().add(new Paragraph("Total").setFont(fontBold).setFontSize(10)).setPadding(8).setTextAlignment(TextAlignment.RIGHT));

        // Item rows
        for (OrderItem item : items) {
            itemsTable.addCell(new Cell().add(new Paragraph(item.getCourseTitle()).setFont(fontNormal).setFontSize(9)).setPadding(8));
            itemsTable.addCell(new Cell().add(new Paragraph(formatCurrency(item.getOriginalPrice(), invoice.getCurrency())).setFont(fontNormal).setFontSize(9)).setPadding(8).setTextAlignment(TextAlignment.RIGHT));
            itemsTable.addCell(new Cell().add(new Paragraph(formatCurrency(item.getDiscountAmount(), invoice.getCurrency())).setFont(fontNormal).setFontSize(9)).setPadding(8).setTextAlignment(TextAlignment.RIGHT));
            itemsTable.addCell(new Cell().add(new Paragraph(formatCurrency(item.getFinalPrice(), invoice.getCurrency())).setFont(fontNormal).setFontSize(9)).setPadding(8).setTextAlignment(TextAlignment.RIGHT));
        }

        document.add(itemsTable);

        // Summary table
        Table summaryTable = new Table(UnitValue.createPercentArray(new float[]{3, 2}))
                .useAllAvailableWidth()
                .setMarginTop(20)
                .setHorizontalAlignment(HorizontalAlignment.RIGHT);

        summaryTable.addCell(new Cell().add(new Paragraph("Subtotal:").setFont(fontNormal).setFontSize(10)).setPadding(5).setBorder(null));
        summaryTable.addCell(new Cell().add(new Paragraph(formatCurrency(invoice.getSubtotal(), invoice.getCurrency())).setFont(fontNormal).setFontSize(10)).setPadding(5).setTextAlignment(TextAlignment.RIGHT).setBorder(null));

        if (invoice.getDiscountTotal().compareTo(BigDecimal.ZERO) > 0) {
            summaryTable.addCell(new Cell().add(new Paragraph("Discount:").setFont(fontNormal).setFontSize(10)).setPadding(5).setBorder(null));
            summaryTable.addCell(new Cell().add(new Paragraph("-" + formatCurrency(invoice.getDiscountTotal(), invoice.getCurrency())).setFont(fontNormal).setFontSize(10)).setPadding(5).setTextAlignment(TextAlignment.RIGHT).setBorder(null));
        }

        if (invoice.getTaxAmount().compareTo(BigDecimal.ZERO) > 0) {
            summaryTable.addCell(new Cell().add(new Paragraph("Tax (" + invoice.getTaxRate() + "%):").setFont(fontNormal).setFontSize(10)).setPadding(5).setBorder(null));
            summaryTable.addCell(new Cell().add(new Paragraph(formatCurrency(invoice.getTaxAmount(), invoice.getCurrency())).setFont(fontNormal).setFontSize(10)).setPadding(5).setTextAlignment(TextAlignment.RIGHT).setBorder(null));
        }

        summaryTable.addCell(new Cell().add(new Paragraph("Total:").setFont(fontBold).setFontSize(12)).setPadding(8).setBorder(null));
        summaryTable.addCell(new Cell().add(new Paragraph(formatCurrency(invoice.getTotalAmount(), invoice.getCurrency())).setFont(fontBold).setFontSize(12)).setPadding(8).setTextAlignment(TextAlignment.RIGHT).setBorder(null));

        document.add(summaryTable);

        // Footer
        Paragraph footer = new Paragraph("Thank you for your purchase!")
                .setFont(fontNormal)
                .setFontSize(10)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginTop(40)
                .setFontColor(ColorConstants.GRAY);
        document.add(footer);

        document.close();
        return baos.toByteArray();
    }

    private String formatCurrency(BigDecimal amount, String currency) {
        if (amount == null) {
            return currency + " 0.00";
        }
        return currency + " " + amount.setScale(2, RoundingMode.HALF_UP).toString();
    }

    private String formatDate(LocalDateTime dateTime) {
        if (dateTime == null) {
            return "N/A";
        }
        return dateTime.format(DateTimeFormatter.ofPattern("MMM dd, yyyy"));
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