package com.edumind.lms.modules.payment.gateway;

/**
 * Status of refund operation.
 */
public enum GatewayRefundStatus {
    COMPLETED,  // Refund completed
    PENDING,    // Refund is processing
    FAILED      // Refund failed
}
