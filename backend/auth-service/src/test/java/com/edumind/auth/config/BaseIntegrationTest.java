package com.edumind.auth.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * Base class for integration tests in auth-service.
 * Uses Testcontainers with real PostgreSQL instead of H2.
 *
 * <p>Features:
 * <ul>
 *   <li>Full Spring context is loaded</li>
 *   <li>Uses real PostgreSQL via Testcontainers</li>
 *   <li>Flyway migrations are applied (real schema)</li>
 *   <li>Default roles are available via Flyway migrations</li>
 *   <li>MockMvc is auto-configured for testing HTTP endpoints</li>
 *   <li>Transactions are rolled back after each test</li>
 * </ul>
 *
 * <p>Usage:
 * <pre>
 * {@code
 * class MyIntegrationTest extends BaseIntegrationTest {
 *     @Test
 *     void myTest() throws Exception {
 *         mockMvc.perform(get("/api/endpoint"))
 *             .andExpect(status().isOk());
 *     }
 * }
 * }
 * </pre>
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ContextConfiguration(initializers = PostgresTestContainerConfig.Initializer.class)
@ActiveProfiles("test")
@Transactional
public abstract class BaseIntegrationTest {

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;
}
