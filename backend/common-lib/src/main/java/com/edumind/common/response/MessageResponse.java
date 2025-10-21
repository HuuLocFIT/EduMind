package com.edumind.common.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MessageResponse {
    @Builder.Default
    private int status = 200;

    @Builder.Default
    private boolean success = true;

    private String message;

    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();

    private String requestId;

    public static MessageResponse success(String message) {
        return MessageResponse.builder()
                .status(200)
                .success(true)
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();
    }

    public static MessageResponse created(String message) {
        return MessageResponse.builder()
                .status(201)
                .success(true)
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();
    }
}
