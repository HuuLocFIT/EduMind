package com.edumind.lms.modules.payment.gateway.impl.sepay;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Webhook payload from SePay when a bank transfer is detected.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SepayWebhookPayload {

    @JsonProperty("id")
    private Long id;                       // SePay internal ID

    @JsonProperty("gateway")
    private String gateway;                // Bank gateway code (Brand Name Bank)

    @JsonProperty("transactionDate")
    private String transactionDate;        // Transaction date

    @JsonProperty("accountNumber")
    private String accountNumber;          // Receiving account number

    @JsonProperty("code")
    private String code;                   // Parsed content code (order number)

    @JsonProperty("content")
    private String content;                // Full transfer content

    @JsonProperty("transferType")
    private String transferType;           // "in" for incoming

    @JsonProperty("transferAmount")
    private Long transferAmount;           // Transfer amount in VND

    @JsonProperty("accumulated")
    private Long accumulated;              // Running balance

    @JsonProperty("subAccount")
    private String subAccount;             // Sub account (if any)

    @JsonProperty("referenceCode")
    private String referenceCode;          // Bank reference code

    @JsonProperty("description")
    private String description;            // Transaction description
}
