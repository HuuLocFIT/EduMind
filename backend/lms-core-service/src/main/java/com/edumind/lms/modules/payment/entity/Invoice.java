package com.edumind.lms.modules.payment.entity;

import com.edumind.lms.modules.payment.enums.InvoiceStatus;
import com.edumind.lms.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "invoices", schema = "payment")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Invoice extends BaseEntity {
    @Column(name = "invoice_number", nullable = false, unique = true, length = 50)
    private String invoiceNumber;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    // Buyer info (snapshot)
    @Column(name = "buyer_name", nullable = false)
    private String buyerName;

    @Column(name = "buyer_email", nullable = false)
    private String buyerEmail;

    // Amounts
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "discount_total", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal discountTotal = BigDecimal.ZERO;

    @Column(name = "tax_amount", precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Column(name = "tax_rate", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal taxRate = BigDecimal.ZERO;

    @Column(name = "total_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @Column(length = 3)
    @Builder.Default
    private String currency = "USD";

    // PDF storage (Cloudinary)
    @Column(name = "pdf_url", length = 500)
    private String pdfUrl;

    @Column(name = "pdf_public_id", length = 255)
    private String pdfPublicId;

    // Status
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private InvoiceStatus status = InvoiceStatus.GENERATED;

    // Timestamps
    @Column(name = "issued_at")
    @Builder.Default
    private LocalDateTime issuedAt = LocalDateTime.now();

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "viewed_at")
    private LocalDateTime viewedAt;

    // Helper methods
    public boolean isSent() {
        return sentAt != null;
    }

    public boolean isViewed() {
        return viewedAt != null;
    }

    public void markAsSent() {
        this.status = InvoiceStatus.SENT;
        this.sentAt = LocalDateTime.now();
    }

    public void markAsViewed() {
        this.status = InvoiceStatus.VIEWED;
        this.viewedAt = LocalDateTime.now();
    }

    public boolean hasPdf() {
        return pdfUrl != null && !pdfUrl.isEmpty();
    }
}
