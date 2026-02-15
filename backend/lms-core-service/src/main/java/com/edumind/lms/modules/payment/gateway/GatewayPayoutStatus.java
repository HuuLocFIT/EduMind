package com.edumind.lms.modules.payment.gateway;

public enum GatewayPayoutStatus {
    PENDING,     // Payout initiated, awaiting processing
    COMPLETED,   // Payout completed successfully
    FAILED       // Payout failed
}
