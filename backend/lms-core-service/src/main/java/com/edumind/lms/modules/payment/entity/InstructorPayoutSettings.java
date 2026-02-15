package com.edumind.lms.modules.payment.entity;

import com.edumind.lms.modules.payment.enums.PayoutMethod;
import com.edumind.lms.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
        name = "instructor_payout_settings",
        schema = "payment",
        uniqueConstraints = @UniqueConstraint(columnNames = "instructor_id")
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InstructorPayoutSettings extends BaseEntity {

    @Column(name = "instructor_id", nullable = false, unique = true)
    private Long instructorId;

    @Enumerated(EnumType.STRING)
    @Column(name = "preferred_method", nullable = false, length = 20)
    private PayoutMethod preferredMethod;

    // Bank transfer fields
    @Column(name = "bank_name", length = 100)
    private String bankName;

    @Column(name = "account_holder_name", length = 100)
    private String accountHolderName;

    @Column(name = "bank_account", length = 255)
    private String bankAccount;

    @Column(name = "swift_code", length = 20)
    private String swiftCode;

    @Column(name = "bank_address", length = 200)
    private String bankAddress;

    // PayPal fields
    @Column(name = "paypal_email", length = 255)
    private String paypalEmail;
}

