package com.edumind.lms.config;

import jakarta.persistence.EntityManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;

/**
 * Base class for repository tests in lms-core-service.
 * Uses Testcontainers with real PostgreSQL instead of H2.
 *
 * <p>Features:
 * <ul>
 *   <li>Uses real PostgreSQL via Testcontainers</li>
 *   <li>Flyway migrations are applied (including multi-schema setup)</li>
 *   <li>Schemas created: course, assessment, gamification, payment, notification, public</li>
 *   <li>JPA Auditing is enabled via JpaAuditingConfig import</li>
 *   <li>Transactions are rolled back after each test</li>
 *   <li>Automatic cleanup of PENDING/PROCESSING orders to prevent unique constraint violations</li>
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
@Import(JpaAuditingConfig.class)
@ActiveProfiles("test")
public abstract class BaseRepositoryTest {
    
    @Autowired
    protected EntityManager entityManager;
    
    /**
     * Cleanup method to remove any existing PENDING/PROCESSING orders for test users.
     * This prevents unique constraint violations when tests create multiple active orders.
     * Override this method in subclasses if you need custom cleanup logic.
     */
    protected void cleanupActiveOrders() {
        // Clean up any existing PENDING/PROCESSING orders for common test user IDs
        // This ensures test isolation even if previous tests didn't roll back properly
        entityManager.createNativeQuery(
            "DELETE FROM payment.orders " +
            "WHERE user_id IN (1, 101, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210) " +
            "AND status IN ('PENDING', 'PROCESSING')"
        ).executeUpdate();
        entityManager.flush();
        entityManager.clear();
    }
}
