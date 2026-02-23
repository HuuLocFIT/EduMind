package com.edumind.lms.modules.ai.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;

/**
 * AI module configuration.
 * ChatClient and EmbeddingModel are auto-configured by spring-ai-starter-model-google-genai
 * when spring.ai.google.genai.api-key is set.
 * <p>
 * This class is conditional: if GEMINI_API_KEY is not set (api-key defaults to empty string),
 * this configuration is skipped entirely, allowing the app to start without Gemini credentials
 * during local development or in test environments.
 */
@Configuration
@ConditionalOnProperty(
        name = "spring.ai.google.genai.api-key",
        matchIfMissing = false
)
public class AiConfig {
}
