package com.edumind.lms.modules.payment.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WebhookPayloadRequest {

    private String eventType;           // payment.success, payment.failed, refund.completed
    private String transactionId;       // Gateway's transaction ID
    private String orderNumber;         // Our order number
    private BigDecimal amount;
    private String currency;
    private String status;              // SUCCESS, FAILED
    private String failureReason;
    private String signature;           // For webhook verification
    private Map<String, Object> rawPayload;  // Original payload from gateway
}
