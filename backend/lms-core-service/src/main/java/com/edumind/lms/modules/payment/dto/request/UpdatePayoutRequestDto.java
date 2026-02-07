package com.edumind.lms.modules.payment.dto.request;

import com.edumind.lms.modules.payment.enums.PayoutMethod;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdatePayoutRequestDto {

    private PayoutMethod paymentMethod;

    // Recipient info (required based on payment method)
    private String bankAccount;  // For BANK_TRANSFER
    private String paypalEmail;  // For PAYPAL
}
