package com.edumind.lms.modules.payment.exception;

import com.edumind.common.exception.ResourceNotFoundException;

public class InvoiceNotFoundException extends ResourceNotFoundException {
    
    public InvoiceNotFoundException(Long invoiceId) {
        super("Invoice not found with id: " + invoiceId);
    }
    
    public InvoiceNotFoundException(String invoiceNumber) {
        super("Invoice not found with invoiceNumber: " + invoiceNumber);
    }
}
