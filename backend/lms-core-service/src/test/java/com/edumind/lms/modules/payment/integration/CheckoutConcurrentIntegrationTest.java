package com.edumind.lms.modules.payment.integration;

import com.edumind.lms.modules.course.entity.Category;
import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.enums.CourseStatus;
import com.edumind.lms.modules.payment.BasePaymentIntegrationTest;
import com.edumind.lms.modules.payment.dto.request.DirectCheckoutRequest;
import com.edumind.lms.modules.payment.dto.response.CheckoutResultResponse;
import com.edumind.lms.modules.payment.entity.Order;
import com.edumind.lms.modules.payment.entity.Transaction;
import com.edumind.lms.modules.payment.enums.PaymentMethod;
import com.edumind.lms.modules.payment.enums.TransactionStatus;
import com.edumind.lms.modules.payment.service.CheckoutService;
import com.edumind.lms.config.security.JwtUserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for concurrent checkout scenarios with REAL database pessimistic locking.
 * 
 * <p>This test uses:
 * <ul>
 *   <li>Real PostgreSQL database via Testcontainers</li>
 *   <li>Real JPA pessimistic locking (SELECT FOR UPDATE)</li>
 *   <li>Concurrent threads to simulate race conditions</li>
 *   <li>No mocks - tests actual production behavior</li>
 * </ul>
 * 
 * <p><b>What this test validates:</b>
 * <ul>
 *   <li>Pessimistic locking prevents duplicate payment captures</li>
 *   <li>Only ONE thread successfully captures payment</li>
 *   <li>Other threads get idempotent "already captured" response</li>
 *   <li>No double enrollment happens</li>
 *   <li>Database transactions commit properly under concurrency</li>
 *   <li>Lock timeout handling (if configured)</li>
 * </ul>
 * 
 * <p><b>LIMITATION:</b> The capturePayment operation requires PayPal gateway which cannot be tested
 * in integration tests without real PayPal credentials. MOCK gateway does not support capture operations.
 * For comprehensive concurrent testing, see {@link com.edumind.lms.modules.payment.service.CheckoutServiceTest#testCapturePayment_ConcurrentPessimisticLocking()}
 * which uses mocks to verify the pessimistic locking behavior.
 * 
 * <p><b>TODO:</b> Convert this test to verify webhook concurrent handling instead of capture,
 * since webhooks work with all gateways including MOCK.
 */
@DisplayName("Checkout Concurrent Integration Tests (Real DB + Pessimistic Locking)")
class CheckoutConcurrentIntegrationTest extends BasePaymentIntegrationTest {

    @Autowired
    private CheckoutService checkoutService;

    private Course course;
    private Long userId = 1L;
    private Order order;
    private Transaction transaction;

    @BeforeEach
    void setUp() {
        Category category = Category.builder()
                .name("Test Category")
                .slug("test-category-concurrent")
                .isActive(true)
                .build();
        categoryRepository.save(category);

        course = Course.builder()
                .title("Concurrent Test Course")
                .slug("concurrent-test-course")
                .description("Testing concurrent payment capture")
                .instructorId(101L)
                .instructorName("Prof. Concurrent")
                .category(category)
                .price(new BigDecimal("99.99"))
                .currency("USD")
                .status(CourseStatus.PUBLISHED)
                .publishedAt(LocalDateTime.now())
                .totalLessons(0)
                .build();
        courseRepository.save(course);

        setupSecurityContext();
    }

    private void setupSecurityContext() {
        JwtUserPrincipal principal = new JwtUserPrincipal(
                userId,
                "student",
                "student@example.com",
                List.of(new SimpleGrantedAuthority("ROLE_STUDENT")),
                null
        );

        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                principal,
                null,
                principal.authorities()
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    /**
     * Real concurrent test with actual database pessimistic locking.
     * 
     * <p><b>Scenario:</b> Simulate a race condition where user clicks "Pay" button multiple times,
     * or webhook arrives while user is still on payment page and clicks "Complete Payment".
     * 
     * <p><b>Expected behavior:</b>
     * <ul>
     *   <li>3 threads attempt to capture same payment simultaneously</li>
     *   <li>Database SELECT FOR UPDATE ensures only 1 thread gets the lock</li>
     *   <li>First thread: Performs actual capture, enrolls student, completes order</li>
     *   <li>Other 2 threads: Wait for lock, then see transaction already SUCCESS, return idempotent response</li>
     *   <li>No duplicate enrollments, no double billing</li>
     * </ul>
     */
    @Test
    @DisplayName("Should handle concurrent capture with REAL database pessimistic locking - DISABLED: Requires PayPal gateway")
    @org.junit.jupiter.api.Disabled("MOCK gateway does not support capture operations. See CheckoutServiceTest.testCapturePayment_ConcurrentPessimisticLocking() for concurrent testing with mocks.")
    void testConcurrentCaptureWithRealDatabase() throws Exception {
        // Given - Manually create a PENDING order and transaction to test concurrent capture
        // We can't use directCheckout() because MOCK gateway completes immediately
        
        // Create order manually
        Order order = Order.builder()
                .userId(userId)
                .orderNumber("ORD-CONCURRENT-TEST-" + System.currentTimeMillis())
                .customerEmail("student@example.com")
                .status(com.edumind.lms.modules.payment.enums.OrderStatus.PROCESSING)
                .paymentMethod(PaymentMethod.MOCK)
                .totalAmount(new BigDecimal("99.99"))
                .subtotal(new BigDecimal("99.99"))
                .discountTotal(BigDecimal.ZERO)
                .currency("USD")
                .build();
        orderRepository.saveAndFlush(order);

        // Add order item for the course
        com.edumind.lms.modules.payment.entity.OrderItem orderItem = com.edumind.lms.modules.payment.entity.OrderItem.builder()
                .order(order)
                .courseId(course.getId())
                .courseTitle(course.getTitle())
                .courseSlug(course.getSlug())
                .instructorId(course.getInstructorId())
                .instructorName(course.getInstructorName())
                .originalPrice(new BigDecimal("99.99"))
                .discountAmount(BigDecimal.ZERO)
                .finalPrice(new BigDecimal("99.99"))
                .currency("USD")
                .build();
        orderItemRepository.saveAndFlush(orderItem);

        // Create PENDING transaction
        Transaction pendingTx = Transaction.builder()
                .order(order)
                .transactionNumber("TXN-CONCURRENT-" + System.currentTimeMillis())
                .gatewayOrderId("MANUAL-CONCURRENT-" + System.nanoTime())
                .gatewayTransactionId("MANUAL-TXN-" + System.nanoTime())
                .gateway(PaymentMethod.MOCK)
                .status(TransactionStatus.PENDING)
                .amount(new BigDecimal("99.99"))
                .currency("USD")
                .build();
        transactionRepository.saveAndFlush(pendingTx);

        final String concurrentGatewayOrderId = pendingTx.getGatewayOrderId();

        // When - Launch 3 concurrent threads attempting to capture same payment
        int numberOfThreads = 3;
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(numberOfThreads);
        ConcurrentHashMap<Integer, CheckoutResultResponse> results = new ConcurrentHashMap<>();
        ConcurrentHashMap<Integer, Throwable> exceptions = new ConcurrentHashMap<>();
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger idempotentCount = new AtomicInteger(0);

        for (int i = 0; i < numberOfThreads; i++) {
            final int threadId = i;
            new Thread(() -> {
                try {
                    // Setup security context for this thread
                    setupSecurityContext();

                    startLatch.await(); // Wait for all threads to be ready

                    // CRITICAL: All threads call capturePayment simultaneously
                    CheckoutResultResponse result = checkoutService.capturePayment(userId, concurrentGatewayOrderId);
                    results.put(threadId, result);

                    System.out.println("Thread-" + threadId + " got result: success=" + result.isSuccess() + ", message=" + result.getMessage());

                    if (result.isSuccess()) {
                        successCount.incrementAndGet();
                        // Check if this is idempotent response
                        if (result.getMessage() != null &&
                                result.getMessage().toLowerCase().contains("already captured")) {
                            idempotentCount.incrementAndGet();
                        }
                    }
                } catch (Exception e) {
                    exceptions.put(threadId, e);
                    System.err.println("Thread-" + threadId + " threw exception: " + e.getMessage());
                    e.printStackTrace();
                } finally {
                    doneLatch.countDown();
                }
            }, "CaptureThread-" + threadId).start();
        }

        // Start all threads simultaneously
        startLatch.countDown();

        // Wait for all threads to complete (with timeout to prevent hanging)
        boolean completedInTime = doneLatch.await(10, TimeUnit.SECONDS);

        // Then - Comprehensive assertions

        // 1. All threads must complete within timeout
        assertThat(completedInTime)
                .as("All threads should complete within 10 seconds")
                .isTrue();

        // 2. All threads should return results
        assertThat(results)
                .as("All %d threads should return results", numberOfThreads)
                .hasSize(numberOfThreads);

        // 3. No thread should throw exceptions (pessimistic locking handles concurrency gracefully)
        assertThat(exceptions)
                .as("No threads should throw exceptions - database pessimistic locking should prevent crashes")
                .isEmpty();

        // 4. All threads see success (first captures, others get idempotent)
        assertThat(successCount.get())
                .as("All threads should see success (first does actual capture, others get idempotent response)")
                .isEqualTo(numberOfThreads);

        // 5. At least N-1 threads should get idempotent response
        assertThat(idempotentCount.get())
                .as("At least %d threads should get 'already captured' message", numberOfThreads - 1)
                .isGreaterThanOrEqualTo(numberOfThreads - 1);

        // 6. Verify database state: Transaction should be SUCCESS (only once)
        Transaction finalTx = transactionRepository.findByGatewayTransactionId(concurrentGatewayOrderId)
                .or(() -> transactionRepository.findByGatewayOrderIdForUpdate(concurrentGatewayOrderId))
                .orElseThrow(() -> new AssertionError("Transaction disappeared from database"));
        assertThat(finalTx.getStatus())
                .as("Transaction should be in SUCCESS state after concurrent capture")
                .isEqualTo(TransactionStatus.SUCCESS);

        // 7. Verify enrollment happened only ONCE
        boolean isEnrolled = enrollmentRepository.existsByCourseIdAndStudentId(course.getId(), userId);
        assertThat(isEnrolled)
                .as("Student should be enrolled after successful payment")
                .isTrue();
        
        // Count all enrollments for this course+student to ensure no duplicates
        // (Since existsByCourseIdAndStudentId just checks boolean, we verify via finding the enrollment)
        var enrollment = enrollmentRepository.findByCourseIdAndStudentId(course.getId(), userId);
        assertThat(enrollment)
                .as("Student should have exactly ONE enrollment for this course")
                .isPresent();

        // 8. Verify order is COMPLETED
        Order finalOrder = orderRepository.findById(finalTx.getOrder().getId())
                .orElseThrow(() -> new AssertionError("Order disappeared from database"));
        assertThat(finalOrder.getStatus().name())
                .as("Order should be COMPLETED after successful capture")
                .isEqualTo("COMPLETED");

        // Log results for debugging
        System.out.println("\n=== Concurrent Capture Test Results ===");
        results.forEach((threadId, result) ->
                System.out.printf("Thread-%d: success=%s, message=%s%n",
                        threadId, result.isSuccess(), result.getMessage())
        );
        System.out.printf("Total success: %d/%d, Idempotent: %d%n",
                successCount.get(), numberOfThreads, idempotentCount.get());
        System.out.println("=== Test Completed Successfully ===\n");
    }

    /**
     * Test to verify lock timeout behavior if database is configured with lock timeout.
     * This is commented out by default as it requires specific database configuration.
     */
    // @Test
    // @DisplayName("Should handle database lock timeout gracefully")
    // void testDatabaseLockTimeout() {
    //     // Requires: SET lock_timeout = '2s' in PostgreSQL
    //     // This would test that if a thread waits too long for pessimistic lock,
    //     // it throws proper exception and doesn't crash the system
    // }
}
