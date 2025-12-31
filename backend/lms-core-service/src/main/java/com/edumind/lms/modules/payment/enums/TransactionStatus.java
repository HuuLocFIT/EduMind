package com.edumind.lms.modules.payment.enums;

public enum TransactionStatus {
    PENDING,      // Transaction initiated, waiting for gateway response
    SUCCESS,      // Payment successful
    FAILED,       // Payment failed
    REFUNDED      // Transaction was refunded
}
