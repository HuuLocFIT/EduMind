package com.edumind.auth.config;

import com.fasterxml.jackson.databind.ser.std.StdSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.core.JsonGenerator;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

/**
 * Serialize LocalDateTime as UTC ISO-8601 with 'Z' suffix so JavaScript clients
 * parse timestamps correctly regardless of server or browser timezone.
 */
@Configuration
public class JacksonConfig {

    @Bean
    public Jackson2ObjectMapperBuilderCustomizer localDateTimeAsUtc() {
        return builder -> builder.serializerByType(LocalDateTime.class, new LocalDateTimeUtcSerializer());
    }

    private static class LocalDateTimeUtcSerializer extends StdSerializer<LocalDateTime> {

        private static final DateTimeFormatter FORMATTER =
                DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'");

        LocalDateTimeUtcSerializer() {
            super(LocalDateTime.class);
        }

        @Override
        public void serialize(LocalDateTime value, JsonGenerator gen, SerializerProvider provider)
                throws IOException {
            gen.writeString(value.atOffset(ZoneOffset.UTC).format(FORMATTER));
        }
    }
}
