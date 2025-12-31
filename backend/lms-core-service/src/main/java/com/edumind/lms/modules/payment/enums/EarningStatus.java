package com.edumind.lms.modules.payment.enums;

public enum EarningStatus {
    PENDING,      // Sale completed, waiting for clearance period
    AVAILABLE,    // Funds available for payout
    PAID,         // Funds have been paid out to instructor
    REFUNDED      // Sale was refunded, earning cancelled
}
