package com.edumind.lms.modules.payment.dto.request;

import com.edumind.lms.modules.payment.enums.PayoutMethod;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayoutSettingsDto {

    @NotNull(message = "Preferred payout method is required")
    private PayoutMethod preferredMethod;

    // Bank transfer fields
    private String bankName;
    private String accountHolderName;
    private String bankAccount;
    private String swiftCode;
    private String bankAddress;

    // PayPal
    @Email(message = "Invalid PayPal email")
    private String paypalEmail;
}

