package com.edumind.lms.modules.payment.gateway.impl.paypal;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.Map;

/**
 * PayPal Webhook Event Payload.
 *
 * Reference: https://developer.paypal.com/docs/api/webhooks/v1/#webhooks-event-types
 *
 * Common event types:
 * - CHECKOUT.ORDER.APPROVED: Order approved by buyer, ready for capture
 * - PAYMENT.CAPTURE.COMPLETED: Payment captured successfully
 * - PAYMENT.CAPTURE.DENIED: Payment capture denied
 * - PAYMENT.CAPTURE.REFUNDED: Payment was refunded
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class PayPalWebhookPayload {

    /**
     * Webhook event ID (e.g., "WH-XXX-XXX")
     */
    private String id;

    /**
     * Event type (e.g., "PAYMENT.CAPTURE.COMPLETED")
     */
    @JsonProperty("event_type")
    private String eventType;

    /**
     * Time the event was created (ISO 8601 format)
     */
    @JsonProperty("create_time")
    private String createTime;

    /**
     * Resource type (e.g., "capture", "order")
     */
    @JsonProperty("resource_type")
    private String resourceType;

    /**
     * The resource object containing payment details
     */
    private PayPalWebhookResource resource;

    /**
     * Summary of the event
     */
    private String summary;

    /**
     * Additional event info
     */
    @JsonProperty("event_version")
    private String eventVersion;

    /**
     * Raw resource as Map for flexible access
     */
    @JsonProperty("resource")
    private Map<String, Object> rawResource;

    public void setResource(PayPalWebhookResource resource) {
        this.resource = resource;
    }

    @JsonProperty("resource")
    public void setRawResource(Map<String, Object> rawResource) {
        this.rawResource = rawResource;
        // Also parse into structured resource
        if (rawResource != null) {
            this.resource = parseResource(rawResource);
        }
    }

    private PayPalWebhookResource parseResource(Map<String, Object> raw) {
        PayPalWebhookResource res = new PayPalWebhookResource();
        res.setId((String) raw.get("id"));
        res.setStatus((String) raw.get("status"));
        res.setCustomId((String) raw.get("custom_id"));

        // Parse amount
        @SuppressWarnings("unchecked")
        Map<String, Object> amountMap = (Map<String, Object>) raw.get("amount");
        if (amountMap != null) {
            PayPalAmount amount = new PayPalAmount();
            amount.setCurrencyCode((String) amountMap.get("currency_code"));
            amount.setValue((String) amountMap.get("value"));
            res.setAmount(amount);
        }

        // For ORDER events, extract from purchase_units
        @SuppressWarnings("unchecked")
        java.util.List<Map<String, Object>> purchaseUnits =
            (java.util.List<Map<String, Object>>) raw.get("purchase_units");
        if (purchaseUnits != null && !purchaseUnits.isEmpty()) {
            Map<String, Object> firstUnit = purchaseUnits.get(0);
            if (res.getCustomId() == null) {
                res.setCustomId((String) firstUnit.get("reference_id"));
            }
            if (res.getAmount() == null) {
                @SuppressWarnings("unchecked")
                Map<String, Object> unitAmount = (Map<String, Object>) firstUnit.get("amount");
                if (unitAmount != null) {
                    PayPalAmount amount = new PayPalAmount();
                    amount.setCurrencyCode((String) unitAmount.get("currency_code"));
                    amount.setValue((String) unitAmount.get("value"));
                    res.setAmount(amount);
                }
            }
        }

        // For CAPTURE events, supplementary_data may contain order_id
        @SuppressWarnings("unchecked")
        Map<String, Object> supplementaryData = (Map<String, Object>) raw.get("supplementary_data");
        if (supplementaryData != null) {
            @SuppressWarnings("unchecked")
            Map<String, Object> relatedIds = (Map<String, Object>) supplementaryData.get("related_ids");
            if (relatedIds != null) {
                res.setOrderId((String) relatedIds.get("order_id"));
            }
        }

        return res;
    }
}
