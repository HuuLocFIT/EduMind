package com.edumind.lms.modules.payment.exception;

import com.edumind.common.exception.ResourceNotFoundException;

public class TransactionNotFoundException extends ResourceNotFoundException {
    
    public TransactionNotFoundException(Long transactionId) {
        super("Transaction not found with id: " + transactionId);
    }
    
    public TransactionNotFoundException(String transactionNumber) {
        super("Transaction not found with transactionNumber: " + transactionNumber);
    }
}
