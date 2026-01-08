package com.edumind.lms.modules.payment.dto.response;

import com.edumind.lms.modules.payment.enums.InvoiceStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvoiceResponse {

    private Long id;
    private String invoiceNumber;
    private Long orderId;
    private String orderNumber;

    // Seller info
    private String sellerName;
    private String sellerAddress;
    private String sellerTaxId;
    private String sellerEmail;
    private String sellerPhone;

    // Buyer info
    private Long buyerId;
    private String buyerName;
    private String buyerEmail;

    // Line items
    private List<OrderItemResponse> items;

    // Amounts
    private BigDecimal subtotal;
    private BigDecimal discountTotal;
    private BigDecimal taxRate;
    private BigDecimal taxAmount;
    private BigDecimal totalAmount;
    private String currency;

    // PDF
    private String pdfUrl;
    private boolean hasPdf;

    // Status
    private InvoiceStatus status;

    // Timestamps
    private LocalDateTime issuedAt;
    private LocalDateTime sentAt;
    private LocalDateTime viewedAt;
}
