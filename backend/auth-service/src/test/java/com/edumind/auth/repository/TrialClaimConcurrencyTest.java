package com.edumind.auth.repository;

import com.edumind.auth.config.BaseRepositoryTest;
import com.edumind.auth.entity.User;
import com.edumind.auth.enums.AuthProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.function.IntSupplier;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.assertEquals;

class TrialClaimConcurrencyTest extends BaseRepositoryTest {
    private static final int THREAD_COUNT = 8;

    @Autowired private UserRepository userRepository;
    @Autowired private PlatformTransactionManager transactionManager;

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    @DisplayName("Exactly one concurrent reminder claim succeeds")
    void claimTrialReminder_IsAtomicAcrossTransactions() throws Exception {
        LocalDateTime now = LocalDateTime.now();
        Long userId = createTrialUser(now.plusDays(5));

        List<Integer> results = runConcurrently(() -> inNewTransaction(
                () -> userRepository.claimTrialReminder(userId, now)));

        assertEquals(1, results.stream().mapToInt(Integer::intValue).sum());
        assertEquals(1, results.stream().filter(result -> result == 1).count());
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    @DisplayName("Exactly one concurrent expiry claim succeeds")
    void claimTrialExpiry_IsAtomicAcrossTransactions() throws Exception {
        LocalDateTime now = LocalDateTime.now();
        Long userId = createTrialUser(now.minusMinutes(1));

        List<Integer> results = runConcurrently(() -> inNewTransaction(
                () -> userRepository.claimTrialExpiry(userId, now)));

        assertEquals(1, results.stream().mapToInt(Integer::intValue).sum());
        assertEquals(1, results.stream().filter(result -> result == 1).count());
    }

    private Long createTrialUser(LocalDateTime trialEndDate) {
        return inNewTransaction(() -> {
            String suffix = UUID.randomUUID().toString();
            User user = User.builder()
                    .username("trial-" + suffix)
                    .email("trial-" + suffix + "@example.test")
                    .password("encoded-password")
                    .isActive(true)
                    .isEmailVerified(true)
                    .isTrial(true)
                    .trialStartDate(trialEndDate.minusDays(30))
                    .trialEndDate(trialEndDate)
                    .is2faEnabled(false)
                    .provider(AuthProvider.LOCAL)
                    .build();
            return userRepository.saveAndFlush(user).getId();
        });
    }

    private int inNewTransaction(IntSupplier work) {
        TransactionTemplate transaction = new TransactionTemplate(transactionManager);
        transaction.setPropagationBehavior(Propagation.REQUIRES_NEW.value());
        return transaction.execute(status -> work.getAsInt());
    }

    private Long inNewTransaction(java.util.function.Supplier<Long> work) {
        TransactionTemplate transaction = new TransactionTemplate(transactionManager);
        transaction.setPropagationBehavior(Propagation.REQUIRES_NEW.value());
        return transaction.execute(status -> work.get());
    }

    private List<Integer> runConcurrently(IntSupplier claim) throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(THREAD_COUNT);
        CountDownLatch ready = new CountDownLatch(THREAD_COUNT);
        CountDownLatch start = new CountDownLatch(1);
        try {
            List<CompletableFuture<Integer>> futures = IntStream.range(0, THREAD_COUNT)
                    .mapToObj(index -> CompletableFuture.supplyAsync(() -> {
                        ready.countDown();
                        try {
                            start.await();
                        } catch (InterruptedException exception) {
                            Thread.currentThread().interrupt();
                            throw new IllegalStateException(exception);
                        }
                        return claim.getAsInt();
                    }, executor))
                    .toList();
            ready.await(10, TimeUnit.SECONDS);
            start.countDown();
            CompletableFuture.allOf(futures.toArray(CompletableFuture[]::new)).get(20, TimeUnit.SECONDS);
            return futures.stream().map(CompletableFuture::join).toList();
        } finally {
            executor.shutdownNow();
            executor.awaitTermination(10, TimeUnit.SECONDS);
        }
    }
}
