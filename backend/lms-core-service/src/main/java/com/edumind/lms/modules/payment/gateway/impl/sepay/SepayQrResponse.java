package com.edumind.lms.modules.payment.gateway.impl.sepay;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO from SePay QR generation API.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SepayQrResponse {

    @JsonProperty("status")
    private Integer status;            // HTTP status code

    @JsonProperty("error")
    private String error;              // Error message if failed

    @JsonProperty("messages")
    private Messages messages;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Messages {
        @JsonProperty("success")
        private Boolean success;
    }
}
