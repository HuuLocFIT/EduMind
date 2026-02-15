package com.edumind.lms.modules.payment.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApproveRefundRequestDto {

    // Optional notes from admin
    private String notes;
}
