package com.edumind.auth.config;

import org.springframework.boot.test.util.TestPropertyValues;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * PostgreSQL Testcontainer configuration for auth-service tests.
 * Uses the singleton container pattern for performance - the same container
 * is reused across all test classes.
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
     * Singleton PostgreSQL container instance.
     * Using postgres:16-alpine for consistency with production.
     */
    private static final PostgreSQLContainer<?> POSTGRES_CONTAINER;

    static {
        POSTGRES_CONTAINER = new PostgreSQLContainer<>(DockerImageName.parse("postgres:16-alpine"))
                .withDatabaseName("auth_test")
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
                    "spring.flyway.schemas=public",
                    "spring.flyway.baseline-on-migrate=true"
            ).applyTo(applicationContext.getEnvironment());
        }
    }
}
