package com.edumind.lms.modules.payment.gateway.impl.paypal;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

/**
 * PayPal Webhook Resource object.
 * Contains the actual payment/order details.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class PayPalWebhookResource {

    /**
     * Resource ID (Capture ID or Order ID depending on event type)
     */
    private String id;

    /**
     * Resource status (COMPLETED, DENIED, REFUNDED, etc.)
     */
    private String status;

    /**
     * Custom ID set during order creation (our order number)
     */
    @JsonProperty("custom_id")
    private String customId;

    /**
     * Payment amount
     */
    private PayPalAmount amount;

    /**
     * Order ID (for capture events, this links back to the original order)
     */
    @JsonProperty("order_id")
    private String orderId;

    /**
     * Final capture indicator
     */
    @JsonProperty("final_capture")
    private Boolean finalCapture;

    /**
     * Invoice ID if provided
     */
    @JsonProperty("invoice_id")
    private String invoiceId;
}
