package com.edumind.lms.modules.payment.enums;

public enum PayoutStatus {
    PENDING,      // Payout created, awaiting processing
    PROCESSING,   // Payout being processed by gateway
    AWAITING_MANUAL_PAYOUT, // Gateway cannot auto-process, admin must manually transfer
    COMPLETED,    // Payout completed successfully
    FAILED       // Payout failed (will retry or require manual intervention)
}
