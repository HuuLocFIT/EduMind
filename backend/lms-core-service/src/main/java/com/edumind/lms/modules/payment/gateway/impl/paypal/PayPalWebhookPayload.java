package com.edumind.lms.modules.payment.gateway.impl.paypal;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.LinkedHashMap;
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
    private String eventType;

    /**
     * Time the event was created (ISO 8601 format)
     */
    private String createTime;

    /**
     * Resource type (e.g., "capture", "order")
     */
    private String resourceType;

    /**
     * The resource object containing payment details.
     * Note: This is populated from rawResource during deserialization,
     * not directly from JSON (to avoid Jackson conflicts).
     */
    @JsonIgnore
    private PayPalWebhookResource resource;

    /**
     * Summary of the event
     */
    private String summary;

    /**
     * Additional event info
     */
    private String eventVersion;

    /**
     * Raw resource as Map for flexible access
     */
    @JsonIgnore
    private Map<String, Object> rawResource;

    /**
     * Complete raw webhook event for signature verification.
     * PayPal requires the full original JSON for verification.
     * Uses LinkedHashMap to preserve field order (important for signature).
     */
    @JsonIgnore
    private final Map<String, Object> rawWebhookEvent = new LinkedHashMap<>();

    // Custom setters to populate both field and rawWebhookEvent

    @JsonProperty("id")
    public void setId(String id) {
        this.id = id;
        this.rawWebhookEvent.put("id", id);
    }

    @JsonProperty("event_type")
    public void setEventType(String eventType) {
        this.eventType = eventType;
        this.rawWebhookEvent.put("event_type", eventType);
    }

    @JsonProperty("create_time")
    public void setCreateTime(String createTime) {
        this.createTime = createTime;
        this.rawWebhookEvent.put("create_time", createTime);
    }

    @JsonProperty("resource_type")
    public void setResourceType(String resourceType) {
        this.resourceType = resourceType;
        this.rawWebhookEvent.put("resource_type", resourceType);
    }

    @JsonProperty("summary")
    public void setSummary(String summary) {
        this.summary = summary;
        this.rawWebhookEvent.put("summary", summary);
    }

    @JsonProperty("event_version")
    public void setEventVersion(String eventVersion) {
        this.eventVersion = eventVersion;
        this.rawWebhookEvent.put("event_version", eventVersion);
    }

    @JsonProperty("resource")
    public void setRawResource(Map<String, Object> rawResource) {
        this.rawResource = rawResource;
        this.rawWebhookEvent.put("resource", rawResource);
        // Also parse into structured resource
        if (rawResource != null) {
            this.resource = parseResource(rawResource);
        }
    }

    /**
     * Capture any additional JSON fields for signature verification.
     */
    @JsonAnySetter
    public void setAnyField(String name, Object value) {
        this.rawWebhookEvent.put(name, value);
    }

    /**
     * Get the complete raw webhook event for signature verification.
     */
    public Map<String, Object> getRawWebhookEvent() {
        return rawWebhookEvent;
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
