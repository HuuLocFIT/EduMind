package com.edumind.lms.modules.payment.service;

/**
 * Service to generate sequential numbers for orders, invoices, transactions.
 * Format: PREFIX-YYYYMM-SEQUENCE
 * Sequences reset monthly.
 */
public interface NumberGeneratorService {

    /**
     * Generate order number: ORD-202501-0001
     */
    String generateOrderNumber();

    /**
     * Generate invoice number: INV-202501-0001
     */
    String generateInvoiceNumber();

    /**
     * Generate transaction number: TXN-202501-0001
     */
    String generateTransactionNumber();
}
