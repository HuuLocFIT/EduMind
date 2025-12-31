package com.edumind.lms.modules.payment.enums;

public enum OrderStatus {
    PENDING,      // Order created, awaiting payment
    COMPLETED,    // Payment successful, enrollments created
    FAILED,       // Payment failed
    REFUNDED,     // Order was refunded
    CANCELLED     // Order cancelled by user before payment
}
