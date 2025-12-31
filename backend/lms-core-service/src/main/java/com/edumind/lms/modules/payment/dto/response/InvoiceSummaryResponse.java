package com.edumind.lms.modules.payment.dto.response;

import com.edumind.lms.modules.payment.enums.InvoiceStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvoiceSummaryResponse {

    private Long id;
    private String invoiceNumber;
    private String orderNumber;
    private BigDecimal totalAmount;
    private String currency;
    private InvoiceStatus status;
    private String pdfUrl;
    private LocalDateTime issuedAt;
}
