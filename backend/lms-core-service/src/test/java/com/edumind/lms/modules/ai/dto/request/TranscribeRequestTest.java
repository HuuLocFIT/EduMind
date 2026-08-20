package com.edumind.lms.modules.ai.dto.request;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TranscribeRequestTest {

    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    @Test
    void acceptsSupportedLanguagesAndDefaultLanguageRequest() {
        assertThat(validator.validate(new TranscribeRequest("https://example.com/video.mp4", "en"))).isEmpty();
        assertThat(validator.validate(new TranscribeRequest("https://example.com/video.mp4", "vi"))).isEmpty();
        assertThat(validator.validate(new TranscribeRequest("https://example.com/video.mp4", null))).isEmpty();
    }

    @Test
    void rejectsUnsupportedLanguage() {
        assertThat(validator.validate(new TranscribeRequest("https://example.com/video.mp4", "fr")))
                .extracting(violation -> violation.getMessage())
                .containsExactly("Language must be either 'en' or 'vi'");
    }
}
