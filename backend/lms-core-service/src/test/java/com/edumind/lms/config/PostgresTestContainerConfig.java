package com.edumind.lms.config;

import org.springframework.boot.test.util.TestPropertyValues;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * PostgreSQL Testcontainer configuration for lms-core-service tests.
 * Uses the singleton container pattern for performance - the same container
 * is reused across all test classes.
 *
 * <p>This configuration supports multiple schemas as used by the LMS modular monolith:
 * <ul>
 *   <li>course - Course module tables</li>
 *   <li>assessment - Assessment module tables</li>
 *   <li>gamification - Gamification module tables</li>
 *   <li>payment - Payment module tables</li>
 *   <li>notification - Notification module tables</li>
 *   <li>public - Shared utilities</li>
 * </ul>
 *
 * <p>Usage in tests:
 * <pre>
 * {@code
 * @SpringBootTest
 * @ContextConfiguration(initializers = PostgresTestContainerConfig.Initializer.class)
 * class MyTest { ... }
 * }
 * </pre>
 */
public class PostgresTestContainerConfig {

    /**
     * Comma-separated list of schemas used by the LMS service.
     * These are created by Flyway migration V1__Create_schemas.sql
     */
    private static final String SCHEMAS = "course,assessment,gamification,payment,notification,ai,public";

    /**
     * Singleton PostgreSQL container instance.
     * Uses a Postgres image with the pgvector extension pre-installed so that
     * AI-related Flyway migrations (V32__Create_ai_embeddings.sql) can run
     * successfully in tests.
     */
    private static final PostgreSQLContainer<?> POSTGRES_CONTAINER;

    static {
        POSTGRES_CONTAINER = new PostgreSQLContainer<>(DockerImageName.parse("pgvector/pgvector:pg16"))
                .withDatabaseName("lms_test")
                .withUsername("test")
                .withPassword("test")
                .withReuse(true);

        POSTGRES_CONTAINER.start();
    }

    /**
     * Get the singleton container instance.
     * @return the PostgreSQL container
     */
    public static PostgreSQLContainer<?> getContainer() {
        return POSTGRES_CONTAINER;
    }

    /**
     * Spring ApplicationContextInitializer that configures the datasource
     * properties to point to the Testcontainer PostgreSQL instance.
     * Also configures Flyway for multi-schema support.
     */
    public static class Initializer implements ApplicationContextInitializer<ConfigurableApplicationContext> {

        @Override
        public void initialize(ConfigurableApplicationContext applicationContext) {
            TestPropertyValues.of(
                    "spring.datasource.url=" + POSTGRES_CONTAINER.getJdbcUrl(),
                    "spring.datasource.username=" + POSTGRES_CONTAINER.getUsername(),
                    "spring.datasource.password=" + POSTGRES_CONTAINER.getPassword(),
                    "spring.datasource.driver-class-name=org.postgresql.Driver",
                    "spring.jpa.hibernate.ddl-auto=none",
                    "spring.flyway.enabled=true",
                    "spring.flyway.locations=classpath:db/migration",
                    "spring.flyway.schemas=" + SCHEMAS,
                    "spring.flyway.baseline-on-migrate=true"
            ).applyTo(applicationContext.getEnvironment());
        }
    }
}
