package com.edumind.auth.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StatusHistoryResponse {
    private Long id;
    private String oldStatus;
    private String newStatus;
    private String changedByUsername;
    private String changedByEmail;
    private String changeReason;
    private LocalDateTime createdAt;
}
