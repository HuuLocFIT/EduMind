package com.edumind.lms.modules.payment.gateway;

/**
 * Status of payment from gateway perspective.
 */
public enum GatewayResultStatus {
    SUCCESS,          // Payment completed successfully
    FAILED,           // Payment failed
    PENDING,          // Payment is processing (async)
    REQUIRES_ACTION,  // User needs to complete action (3DS, redirect)
    CANCELLED,        // User cancelled payment
    EXPIRED,          // Payment session expired
    UNKNOWN           // Status cannot be determined - check order database
}
