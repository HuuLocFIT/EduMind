package com.edumind.lms.modules.payment.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "payout_sequences", schema = "payment")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayoutSequence {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "year_month", nullable = false, unique = true, length = 6)
    private String yearMonth;  // Format: YYYYMM

    @Column(name = "current_sequence", nullable = false)
    @Builder.Default
    private Integer currentSequence = 0;

    // Alias methods for compatibility
    public Long getLastValue() {
        return currentSequence != null ? currentSequence.longValue() : 0L;
    }

    public void setLastValue(Long lastValue) {
        this.currentSequence = lastValue != null ? lastValue.intValue() : 0;
    }
}
