package com.edumind.lms.modules.payment.mapper;

import com.edumind.lms.modules.payment.dto.response.InvoiceResponse;
import com.edumind.lms.modules.payment.dto.response.InvoiceSummaryResponse;
import com.edumind.lms.modules.payment.dto.response.OrderItemResponse;
import com.edumind.lms.modules.payment.entity.Invoice;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class InvoiceMapper {

    public InvoiceResponse toResponse(Invoice invoice, String sellerName, String sellerAddress,
                                      String sellerTaxId, String sellerEmail, String sellerPhone,
                                      List<OrderItemResponse> items) {
        return InvoiceResponse.builder()
                .id(invoice.getId())
                .invoiceNumber(invoice.getInvoiceNumber())
                .orderId(invoice.getOrder().getId())
                .orderNumber(invoice.getOrder().getOrderNumber())
                .sellerName(sellerName)
                .sellerAddress(sellerAddress)
                .sellerTaxId(sellerTaxId)
                .sellerEmail(sellerEmail)
                .sellerPhone(sellerPhone)
                .buyerId(invoice.getUserId())
                .buyerName(invoice.getBuyerName())
                .buyerEmail(invoice.getBuyerEmail())
                .items(items)
                .subtotal(invoice.getSubtotal())
                .discountTotal(invoice.getDiscountTotal())
                .taxRate(invoice.getTaxRate())
                .taxAmount(invoice.getTaxAmount())
                .totalAmount(invoice.getTotalAmount())
                .currency(invoice.getCurrency())
                .pdfUrl(invoice.getPdfUrl())
                .hasPdf(invoice.hasPdf())
                .status(invoice.getStatus())
                .issuedAt(invoice.getIssuedAt())
                .sentAt(invoice.getSentAt())
                .viewedAt(invoice.getViewedAt())
                .build();
    }

    public InvoiceSummaryResponse toSummaryResponse(Invoice invoice) {
        return InvoiceSummaryResponse.builder()
                .id(invoice.getId())
                .invoiceNumber(invoice.getInvoiceNumber())
                .orderNumber(invoice.getOrder().getOrderNumber())
                .totalAmount(invoice.getTotalAmount())
                .currency(invoice.getCurrency())
                .status(invoice.getStatus())
                .pdfUrl(invoice.getPdfUrl())
                .issuedAt(invoice.getIssuedAt())
                .build();
    }

    // Helper for OrderMapper to avoid circular dependency
    public InvoiceResponse toSummaryAsResponse(Invoice invoice) {
        return InvoiceResponse.builder()
                .id(invoice.getId())
                .invoiceNumber(invoice.getInvoiceNumber())
                .totalAmount(invoice.getTotalAmount())
                .currency(invoice.getCurrency())
                .pdfUrl(invoice.getPdfUrl())
                .hasPdf(invoice.hasPdf())
                .status(invoice.getStatus())
                .issuedAt(invoice.getIssuedAt())
                .build();
    }

    public List<InvoiceSummaryResponse> toSummaryResponseList(List<Invoice> invoices) {
        return invoices.stream()
                .map(this::toSummaryResponse)
                .collect(Collectors.toList());
    }
}
