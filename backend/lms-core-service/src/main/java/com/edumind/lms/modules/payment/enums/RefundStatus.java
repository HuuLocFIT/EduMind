package com.edumind.lms.modules.payment.enums;

public enum RefundStatus {
    PENDING,                // Refund request submitted, awaiting approval
    APPROVED,               // Refund approved by admin, ready to process (auto-refund gateways)
    AWAITING_MANUAL_REFUND, // Refund approved, waiting for admin to manually transfer money (manual gateways like SePay)
    REJECTED,               // Refund request rejected by admin
    COMPLETED,              // Refund processed successfully via gateway or manual transfer
    FAILED                  // Refund processing failed (e.g., gateway error)
}
