package com.edumind.lms.modules.ai.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatRequest {

    @NotBlank(message = "Question is required")
    private String question;

    /**
     * Last N conversation turns sent by the client for stateless history.
     * Optional and limited to a small number of items on the caller side.
     */
    private List<ConversationTurn> recentHistory;

    public record ConversationTurn(String question, String answer) {
    }
}

