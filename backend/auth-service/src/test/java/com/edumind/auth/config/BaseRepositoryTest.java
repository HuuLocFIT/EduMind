package com.edumind.auth.config;

import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;

/**
 * Base class for repository tests in auth-service.
 * Uses Testcontainers with real PostgreSQL instead of H2.
 *
 * <p>Features:
 * <ul>
 *   <li>Uses real PostgreSQL via Testcontainers</li>
 *   <li>Flyway migrations are applied (real schema)</li>
 *   <li>Default roles are inserted via migration V5__Insert_default_roles.sql</li>
 *   <li>Transactions are rolled back after each test</li>
 * </ul>
 *
 * <p>Usage:
 * <pre>
 * {@code
 * class MyRepositoryTest extends BaseRepositoryTest {
 *     @Autowired
 *     private MyRepository myRepository;
 *
 *     @Test
 *     void myTest() {
 *         // Test with real PostgreSQL
 *     }
 * }
 * }
 * </pre>
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@ContextConfiguration(initializers = PostgresTestContainerConfig.Initializer.class)
@ActiveProfiles("test")
public abstract class BaseRepositoryTest {
    // Common test utilities can be added here
}
