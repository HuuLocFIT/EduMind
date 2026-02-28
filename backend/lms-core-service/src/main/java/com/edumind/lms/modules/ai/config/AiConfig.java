package com.edumind.lms.modules.ai.config;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * AI module configuration.
 * ChatModel is auto-configured by spring-ai-starter-model-google-genai
 * when spring.ai.google.genai.api-key is set.
 * <p>
 * This class is conditional: if GEMINI_API_KEY is not set (api-key defaults to empty string),
 * this configuration is skipped entirely, allowing the app to start without Gemini credentials
 * during local development or in test environments.
 */
@Configuration
@Profile("!test")
@ConditionalOnProperty(
        name = "spring.ai.google.genai.api-key",
        matchIfMissing = false
)
public class AiConfig {

    @Bean
    public ChatClient chatClient(ChatModel chatModel) {
        return ChatClient.builder(chatModel).build();
    }
}
