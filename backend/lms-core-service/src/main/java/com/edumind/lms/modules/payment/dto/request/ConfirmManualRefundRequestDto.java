package com.edumind.lms.modules.payment.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConfirmManualRefundRequestDto {

    /**
     * Bank transfer reference number or transaction ID from the manual transfer
     */
    @NotBlank(message = "Bank transfer reference is required")
    private String bankTransferReference;
}
