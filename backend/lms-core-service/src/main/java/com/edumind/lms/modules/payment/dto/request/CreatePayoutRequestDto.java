package com.edumind.lms.modules.payment.dto.request;

import com.edumind.lms.modules.payment.enums.PayoutMethod;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreatePayoutRequestDto {

    @NotNull(message = "Instructor ID is required")
    @Positive(message = "Instructor ID must be positive")
    private Long instructorId;

    @NotNull(message = "Payment method is required")
    private PayoutMethod paymentMethod;

    // Optional: specific earnings to include (if null, include all available)
    private List<Long> earningIds;

    // Recipient info (required based on payment method)
    private String bankAccount;  // For BANK_TRANSFER
    private String bankName;
    private String accountHolderName;
    private String swiftCode;
    private String bankAddress;
    private String paypalEmail;  // For PAYPAL
}
