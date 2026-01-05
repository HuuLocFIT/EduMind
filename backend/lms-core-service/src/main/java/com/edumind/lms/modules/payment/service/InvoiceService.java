package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.payment.dto.response.InvoiceResponse;
import com.edumind.lms.modules.payment.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Service to manage invoices.
 */
public interface InvoiceService {

    /**
     * Generate invoice for completed order
     */
    InvoiceResponse generateInvoice(Order order);

    /**
     * Get invoice by ID
     */
    InvoiceResponse getInvoiceById(Long invoiceId);

    /**
     * Get invoice by invoice number
     */
    InvoiceResponse getInvoiceByNumber(String invoiceNumber);

    /**
     * Get invoice for an order
     */
    InvoiceResponse getInvoiceByOrder(Long orderId);

    /**
     * Get user's invoices with pagination
     */
    Page<InvoiceResponse> getUserInvoices(Long userId, Pageable pageable);

    /**
     * Generate PDF for invoice (returns URL)
     */
    String generateInvoicePdf(Long invoiceId);

    /**
     * Generate PDF for invoice as byte array
     */
    byte[] generateInvoicePdfBytes(Long invoiceId);

    /**
     * Get invoice by ID with user ownership check
     */
    InvoiceResponse getInvoiceByIdAndUser(Long invoiceId, Long userId);

    /**
     * Get invoice by invoice number with user ownership check
     */
    InvoiceResponse getInvoiceByNumberAndUser(String invoiceNumber, Long userId);

    /**
     * Get invoice by order ID with user ownership check
     */
    InvoiceResponse getInvoiceByOrderIdAndUser(Long orderId, Long userId);

    /**
     * Send invoice email to user
     */
    void sendInvoiceEmail(Long invoiceId);
}
