package com.edumind.lms.modules.payment.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "transaction_sequences", schema = "payment")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransactionSequence {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "date_key", nullable = false, unique = true, length = 8)
    private String dateKey;  // Format: YYYYMMDD

    @Column(name = "current_sequence", nullable = false)
    @Builder.Default
    private Integer currentSequence = 0;

    // Alias methods for compatibility
    public String getYearMonth() {
        if (dateKey == null || dateKey.length() < 6) {
            return dateKey;
        }
        // Extract first 6 characters (YYYYMM) from dateKey (YYYYMMDD)
        return dateKey.substring(0, 6);
    }

    public void setYearMonth(String yearMonth) {
        if (yearMonth == null) {
            this.dateKey = null;
            return;
        }
        // If yearMonth is 6 chars (YYYYMM), pad with "01" to make dateKey (YYYYMMDD)
        // If already 8 chars, use as is
        if (yearMonth.length() == 6) {
            this.dateKey = yearMonth + "01";
        } else {
            this.dateKey = yearMonth;
        }
    }

    public Long getLastValue() {
        return currentSequence != null ? currentSequence.longValue() : 0L;
    }

    public void setLastValue(Long lastValue) {
        this.currentSequence = lastValue != null ? lastValue.intValue() : 0;
    }
}
