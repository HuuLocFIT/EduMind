package com.edumind.auth.service;

import com.edumind.auth.config.PostgresTestContainerConfig;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Integration tests for {@link PasswordResetRateLimiter}, backed by a REAL PostgreSQL instance
 * via Testcontainers (not H2) - the UPSERT SQL uses {@code ON CONFLICT ... RETURNING}, which H2
 * cannot parse in the same dialect as Postgres.
 *
 * <p>These tests go through the real Spring-managed bean (autowired from the application
 * context), NOT a manually {@code new}'d instance, so that {@code @Transactional(propagation =
 * REQUIRES_NEW)} is actually exercised via the Spring AOP proxy. This matters most for the
 * concurrency test below: if {@code REQUIRES_NEW} were ever bypassed (e.g. via self-invocation),
 * single-threaded tests would still pass, but concurrent increments would silently lose updates
 * or return duplicate counts.
 */
@SpringBootTest
@ContextConfiguration(initializers = PostgresTestContainerConfig.Initializer.class)
@ActiveProfiles("test")
class PasswordResetRateLimiterTest {

    @Autowired
    private PasswordResetRateLimiter rateLimiter;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void cleanTable() {
        jdbcTemplate.execute("DELETE FROM password_reset_buckets");
    }

    @AfterEach
    void cleanUpAfter() {
        jdbcTemplate.execute("DELETE FROM password_reset_buckets");
    }

    @Nested
    @DisplayName("incrementAndGet Tests")
    class IncrementAndGetTests {

        @Test
        @DisplayName("Should return 1 for first call, 2 for second call on same hash, and 1 for a different hash")
        void incrementAndGet_BasicIncrement() {
            // Given
            String hashA = "hash-" + UUID.randomUUID();
            String hashB = "hash-" + UUID.randomUUID();

            // When
            int firstA = rateLimiter.incrementAndGet(hashA);
            int secondA = rateLimiter.incrementAndGet(hashA);
            int firstB = rateLimiter.incrementAndGet(hashB);

            // Then
            assertEquals(1, firstA);
            assertEquals(2, secondA);
            assertEquals(1, firstB);
        }

        @Test
        @DisplayName("Should return sequential counts 1,2,3,4 for four sequential calls on the same hash")
        void incrementAndGet_SequentialCallsHaveNoOffByOne() {
            // Given
            String hash = "hash-" + UUID.randomUUID();

            // When
            int a1 = rateLimiter.incrementAndGet(hash);
            int a2 = rateLimiter.incrementAndGet(hash);
            int a3 = rateLimiter.incrementAndGet(hash);
            int a4 = rateLimiter.incrementAndGet(hash);

            // Then
            assertEquals(1, a1);
            assertEquals(2, a2);
            assertEquals(3, a3);
            assertEquals(4, a4);
        }

        @Test
        @DisplayName("Should atomically increment under concurrency with no lost updates or duplicate counts")
        void incrementAndGet_ConcurrentCallsAreAtomic() throws InterruptedException {
            // Given
            String hash = "hash-" + UUID.randomUUID();
            int threadCount = 10;
            ExecutorService executor = Executors.newFixedThreadPool(threadCount);
            CountDownLatch startLatch = new CountDownLatch(1);

            try {
                // When: fire N concurrent increments against the SAME hash, all released at once
                List<CompletableFuture<Integer>> futures = IntStream.range(0, threadCount)
                        .mapToObj(i -> CompletableFuture.supplyAsync(() -> {
                            try {
                                startLatch.await();
                            } catch (InterruptedException e) {
                                Thread.currentThread().interrupt();
                                throw new IllegalStateException(e);
                            }
                            return rateLimiter.incrementAndGet(hash);
                        }, executor))
                        .collect(Collectors.toList());

                startLatch.countDown();

                CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();

                List<Integer> results = futures.stream()
                        .map(CompletableFuture::join)
                        .collect(Collectors.toList());

                // Then: every increment observed a distinct value, and together they are
                // exactly {1, 2, ..., threadCount} - no duplicates (lost update) and no gaps.
                Set<Integer> uniqueResults = Set.copyOf(results);
                assertEquals(threadCount, uniqueResults.size(),
                        "Expected " + threadCount + " distinct counts but got duplicates: " + results);

                Set<Integer> expected = IntStream.rangeClosed(1, threadCount)
                        .boxed()
                        .collect(Collectors.toSet());
                assertEquals(expected, uniqueResults,
                        "Expected counts {1.." + threadCount + "} but got: " + uniqueResults);
            } finally {
                executor.shutdown();
                executor.awaitTermination(10, TimeUnit.SECONDS);
            }
        }
    }

    @Nested
    @DisplayName("hashEmail Tests")
    class HashEmailTests {

        @Test
        @DisplayName("Should produce the same hash for the same email regardless of case or surrounding whitespace")
        void hashEmail_IsDeterministicAndCaseInsensitive() {
            // Given
            String base = "foo@example.com";
            String upperCase = "Foo@Example.com";
            String withWhitespace = "  foo@example.com  ";

            // When
            String hashBase = rateLimiter.hashEmail(base);
            String hashUpperCase = rateLimiter.hashEmail(upperCase);
            String hashWithWhitespace = rateLimiter.hashEmail(withWhitespace);

            // Then
            assertNotNull(hashBase);
            assertEquals(hashBase, hashUpperCase);
            assertEquals(hashBase, hashWithWhitespace);
        }

        @Test
        @DisplayName("Should produce different hashes for different emails")
        void hashEmail_DifferentEmailsProduceDifferentHashes() {
            // Given
            String emailA = "foo@example.com";
            String emailB = "bar@example.com";

            // When
            String hashA = rateLimiter.hashEmail(emailA);
            String hashB = rateLimiter.hashEmail(emailB);

            // Then
            assertNotEquals(hashA, hashB);
        }

        @Test
        @DisplayName("Should produce a hex-encoded HMAC-SHA-256 digest (64 hex chars)")
        void hashEmail_ProducesHexEncodedDigest() {
            // Given
            String email = "foo@example.com";

            // When
            String hash = rateLimiter.hashEmail(email);

            // Then
            assertEquals(64, hash.length());
            assertTrue(hash.matches("[0-9a-f]+"));
        }
    }
}
