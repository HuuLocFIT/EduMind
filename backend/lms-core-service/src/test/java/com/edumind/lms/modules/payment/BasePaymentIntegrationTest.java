package com.edumind.lms.modules.payment;

import com.edumind.lms.config.PostgresTestContainerConfig;
import com.edumind.lms.modules.course.repository.CategoryRepository;
import com.edumind.lms.modules.course.repository.CourseRepository;
import com.edumind.lms.modules.course.repository.EnrollmentRepository;
import com.edumind.lms.modules.payment.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Base class for payment integration tests that require REQUIRES_NEW transaction behavior.
 *
 * <p>Unlike {@link BaseIntegrationTest}, this class does NOT use @Transactional at the class level.
 * This allows nested transactions with REQUIRES_NEW propagation to see committed data properly.
 *
 * <p>Since tests are not transactional, data must be cleaned up manually in @AfterEach.
 * The {@link #cleanupTestData()} method handles this automatically.
 *
 * <p>Features:
 * <ul>
 *   <li>Full Spring context is loaded</li>
 *   <li>Uses real PostgreSQL via Testcontainers</li>
 *   <li>Flyway migrations are applied (including multi-schema setup)</li>
 *   <li>MockMvc is auto-configured for testing HTTP endpoints</li>
 *   <li>Manual data cleanup after each test (no automatic rollback)</li>
 * </ul>
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ContextConfiguration(initializers = PostgresTestContainerConfig.Initializer.class)
@ActiveProfiles("test")
public abstract class BasePaymentIntegrationTest {

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    // Repositories for cleanup
    @Autowired
    protected InvoiceRepository invoiceRepository;

    @Autowired
    protected TransactionRepository transactionRepository;

    @Autowired
    protected InstructorEarningRepository earningRepository;

    @Autowired
    protected OrderItemRepository orderItemRepository;

    @Autowired
    protected OrderRepository orderRepository;

    @Autowired
    protected CartItemRepository cartItemRepository;

    @Autowired
    protected CartRepository cartRepository;

    @Autowired
    protected EnrollmentRepository enrollmentRepository;

    @Autowired
    protected CourseRepository courseRepository;

    @Autowired
    protected CategoryRepository categoryRepository;

    /**
     * Clean up all test data after each test.
     * Order matters due to foreign key constraints.
     */
    @AfterEach
    void cleanupTestData() {
        // Clean in reverse order of dependencies
        invoiceRepository.deleteAll();
        transactionRepository.deleteAll();
        earningRepository.deleteAll();
        orderItemRepository.deleteAll();
        orderRepository.deleteAll();
        cartItemRepository.deleteAll();
        cartRepository.deleteAll();
        enrollmentRepository.deleteAll();
        courseRepository.deleteAll();
        categoryRepository.deleteAll();
    }
}
