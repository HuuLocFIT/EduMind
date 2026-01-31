package com.edumind.lms.modules.payment.gateway.impl.sepay;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for generating SePay QR code.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SepayQrRequest {

    @JsonProperty("bank_code")
    private String bankCode;           // Bank code (MB, VCB, TCB, etc.)

    @JsonProperty("account_number")
    private String accountNumber;      // Bank account number

    @JsonProperty("account_name")
    private String accountName;        // Account holder name

    @JsonProperty("amount")
    private Long amount;               // Amount in VND

    @JsonProperty("content")
    private String content;            // Transfer content (order reference)

    @JsonProperty("template")
    private String template;           // QR template (compact, compact2, qr_only, print)
}
