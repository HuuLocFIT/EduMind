package com.edumind.lms.modules.payment.exception;

/**
 * Exception thrown when a webhook has already been processed.
 * This is not an error condition - just indicates duplicate processing was prevented.
 */
public class DuplicateWebhookException extends RuntimeException {

    public DuplicateWebhookException(String message) {
        super(message);
    }

    public DuplicateWebhookException(String orderNumber, String reason) {
        super("Webhook for order " + orderNumber + " already processed: " + reason);
    }
}
