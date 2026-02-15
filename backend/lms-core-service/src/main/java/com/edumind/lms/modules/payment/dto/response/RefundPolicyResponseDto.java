package com.edumind.lms.modules.payment.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefundPolicyResponseDto {

    private int autoApproveDays;  // Days within which refund is auto-approved
    private int maxRefundDays;  // Maximum days after purchase for refund eligibility
    private int partialRefundThreshold;  // Course access percentage threshold for partial refunds
    private BigDecimal eligibleRefundAmount;  // Calculated refund amount based on policy
    private boolean isEligible;  // Whether order is eligible for refund
    private String eligibilityReason;  // Reason for eligibility/ineligibility
    private boolean requiresAdminApproval;  // Whether refund requires admin approval
}
