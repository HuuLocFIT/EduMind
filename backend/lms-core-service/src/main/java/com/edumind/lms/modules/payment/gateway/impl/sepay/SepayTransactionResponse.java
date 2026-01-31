package com.edumind.lms.modules.payment.gateway.impl.sepay;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response DTO from SePay transaction list API.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SepayTransactionResponse {

    @JsonProperty("status")
    private Integer status;

    @JsonProperty("error")
    private String error;

    @JsonProperty("messages")
    private Messages messages;

    @JsonProperty("transactions")
    private List<SepayTransaction> transactions;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Messages {
        @JsonProperty("success")
        private Boolean success;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SepayTransaction {

        @JsonProperty("id")
        private String id;                 // SePay transaction ID

        @JsonProperty("gateway")
        private String gateway;            // Payment gateway code

        @JsonProperty("transaction_date")
        private String transactionDate;    // Transaction date/time

        @JsonProperty("account_number")
        private String accountNumber;      // Bank account number

        @JsonProperty("sub_account")
        private String subAccount;         // Sub account (if any)

        @JsonProperty("amount_in")
        private Long amountIn;             // Incoming amount

        @JsonProperty("amount_out")
        private Long amountOut;            // Outgoing amount

        @JsonProperty("accumulated")
        private Long accumulated;          // Running balance

        @JsonProperty("code")
        private String code;               // Transaction code/content

        @JsonProperty("transaction_content")
        private String transactionContent; // Full transfer content

        @JsonProperty("reference_number")
        private String referenceNumber;    // Bank reference number

        @JsonProperty("description")
        private String description;        // Transaction description
    }
}
