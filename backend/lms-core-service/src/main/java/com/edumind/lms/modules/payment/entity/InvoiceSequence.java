package com.edumind.lms.modules.payment.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "invoice_sequences", schema = "payment")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvoiceSequence {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "year_month", nullable = false, unique = true, length = 6)
    private String yearMonth;  // Format: YYYYMM

    @Column(name = "current_sequence", nullable = false)
    @Builder.Default
    private Integer currentSequence = 0;
}
