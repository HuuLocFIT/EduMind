package com.edumind.lms.modules.payment.enums;

public enum RefundStatus {
    PENDING,     // Refund request submitted, awaiting approval
    APPROVED,    // Refund approved by admin, ready to process
    REJECTED,    // Refund request rejected by admin
    COMPLETED,   // Refund processed successfully via gateway
    FAILED       // Refund processing failed (e.g., gateway error, manual processing required)
}
