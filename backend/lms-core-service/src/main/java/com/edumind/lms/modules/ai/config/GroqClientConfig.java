package com.edumind.lms.modules.ai.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.web.client.RestClient;

@Configuration
public class GroqClientConfig {

    @Bean
    public RestClient groqRestClient(@Value("${ai.groq.api-key:}") String apiKey) {
        RestClient.Builder builder = RestClient.builder()
                .baseUrl("https://api.groq.com");

        if (apiKey != null && !apiKey.isBlank()) {
            builder.defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey);
        }

        return builder.build();
    }
}

