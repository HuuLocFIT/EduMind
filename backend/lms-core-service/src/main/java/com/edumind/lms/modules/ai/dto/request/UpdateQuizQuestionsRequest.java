package com.edumind.lms.modules.ai.dto.request;

import com.edumind.lms.modules.ai.dto.response.QuizQuestionDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateQuizQuestionsRequest {

    @NotEmpty(message = "Questions list must not be empty")
    @Valid
    private List<QuizQuestionDto> questions;
}
