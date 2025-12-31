package com.edumind.lms.modules.payment.enums;

public enum InvoiceStatus {
    GENERATED,    // Invoice PDF created
    SENT,         // Invoice email sent to buyer
    VIEWED        // Buyer has viewed/downloaded the invoice
}
