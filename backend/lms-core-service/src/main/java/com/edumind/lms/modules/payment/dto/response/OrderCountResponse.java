package com.edumind.lms.modules.payment.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderCountResponse {
    private int total;
    private int pending;
    private int completed;
    private int failed;
    private int refunded;
    private int cancelled;
}
