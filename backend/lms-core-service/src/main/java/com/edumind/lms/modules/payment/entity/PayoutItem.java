package com.edumind.lms.modules.payment.entity;

import com.edumind.lms.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "payout_items", schema = "payment")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayoutItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payout_id", nullable = false)
    private Payout payout;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "earning_id", nullable = false, unique = true)
    private InstructorEarning earning;
}
