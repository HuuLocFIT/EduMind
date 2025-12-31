package com.edumind.lms.modules.payment.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "order_sequences", schema = "payment")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderSequence {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "date_key", nullable = false, unique = true, length = 8)
    private String dateKey;  // Format: YYYYMMDD

    @Column(name = "current_sequence", nullable = false)
    @Builder.Default
    private Integer currentSequence = 0;
}
