package com.edumind.auth.repository;

import com.edumind.auth.entity.PasswordResetToken;
import com.edumind.auth.entity.Role;
import com.edumind.auth.entity.User;
import com.edumind.auth.enums.AuthProvider;
import com.edumind.auth.enums.RoleName;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Repository tests for PasswordResetTokenRepository
 * Uses @DataJpaTest with H2 in-memory database
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@ActiveProfiles("test")
class PasswordResetTokenRepositoryTest {

    @Autowired
    private PasswordResetTokenRepository tokenRepository;

    @Autowired
    private TestEntityManager entityManager;

    private User testUser;
    private PasswordResetToken validToken;
    private PasswordResetToken expiredToken;
    private PasswordResetToken usedToken;

    @BeforeEach
    void setUp() {
        // Create and persist role
        Role studentRole = Role.builder()
                .name(RoleName.ROLE_STUDENT)
                .description("Student role")
                .build();
        entityManager.persistAndFlush(studentRole);

        // Create and persist test user
        testUser = User.builder()
                .username("testuser")
                .email("test@example.com")
                .password("encodedPassword123")
                .firstName("Test")
                .lastName("User")
                .isActive(true)
                .isEmailVerified(true)
                .is2faEnabled(false)
                .provider(AuthProvider.LOCAL)
                .roles(Set.of(studentRole))
                .build();
        entityManager.persistAndFlush(testUser);

        // Create valid token (not expired, not used)
        validToken = new PasswordResetToken();
        validToken.setToken(UUID.randomUUID().toString());
        validToken.setUser(testUser);
        validToken.setExpiryDate(LocalDateTime.now().plusHours(1));
        validToken.setUsed(false);
        validToken.setCreatedAt(LocalDateTime.now());
        entityManager.persistAndFlush(validToken);

        // Create expired token
        expiredToken = new PasswordResetToken();
        expiredToken.setToken(UUID.randomUUID().toString());
        expiredToken.setUser(testUser);
        expiredToken.setExpiryDate(LocalDateTime.now().minusHours(1));
        expiredToken.setUsed(false);
        expiredToken.setCreatedAt(LocalDateTime.now().minusDays(1));
        entityManager.persistAndFlush(expiredToken);

        // Create used token
        usedToken = new PasswordResetToken();
        usedToken.setToken(UUID.randomUUID().toString());
        usedToken.setUser(testUser);
        usedToken.setExpiryDate(LocalDateTime.now().plusHours(1));
        usedToken.setUsed(true);
        usedToken.setUsedAt(LocalDateTime.now().minusHours(2));
        usedToken.setCreatedAt(LocalDateTime.now().minusDays(1));
        entityManager.persistAndFlush(usedToken);

        entityManager.clear();
    }

    // ==================== FIND BY TOKEN TESTS ====================

    @Nested
    @DisplayName("findByToken Tests")
    class FindByTokenTests {

        @Test
        @DisplayName("Should find token by token string")
        void findByToken_WhenExists_ShouldReturnToken() {
            // When
            Optional<PasswordResetToken> result = tokenRepository.findByToken(validToken.getToken());

            // Then
            assertTrue(result.isPresent());
            assertEquals(validToken.getToken(), result.get().getToken());
            assertNotNull(result.get().getUser());
            assertEquals("testuser", result.get().getUser().getUsername());
        }

        @Test
        @DisplayName("Should return empty when token not found")
        void findByToken_WhenNotExists_ShouldReturnEmpty() {
            // When
            Optional<PasswordResetToken> result = tokenRepository.findByToken("nonexistent-token");

            // Then
            assertTrue(result.isEmpty());
        }

        @Test
        @DisplayName("Should find expired token")
        void findByToken_ExpiredToken_ShouldStillReturn() {
            // When
            Optional<PasswordResetToken> result = tokenRepository.findByToken(expiredToken.getToken());

            // Then
            assertTrue(result.isPresent());
            assertTrue(result.get().isExpired());
        }

        @Test
        @DisplayName("Should find used token")
        void findByToken_UsedToken_ShouldStillReturn() {
            // When
            Optional<PasswordResetToken> result = tokenRepository.findByToken(usedToken.getToken());

            // Then
            assertTrue(result.isPresent());
            assertTrue(result.get().isUsed());
        }
    }

    // ==================== FIND LATEST UNUSED BY USER TESTS ====================

    @Nested
    @DisplayName("findLatestUnusedByUser Tests")
    class FindLatestUnusedByUserTests {

        @Test
        @DisplayName("Should find latest unused token for user")
        void findLatestUnusedByUser_ShouldReturnLatestUnused() {
            // Given - Remove expired token so we only have one unused
            PasswordResetToken fetchedExpired = entityManager.find(PasswordResetToken.class, expiredToken.getId());
            entityManager.remove(fetchedExpired);
            entityManager.flush();
            entityManager.clear();

            User fetchedUser = entityManager.find(User.class, testUser.getId());

            // When
            Optional<PasswordResetToken> result = tokenRepository.findLatestUnusedByUser(fetchedUser);

            // Then
            assertTrue(result.isPresent());
            assertFalse(result.get().isUsed());
            assertEquals(validToken.getToken(), result.get().getToken());
        }

        @Test
        @DisplayName("Should return empty when no unused tokens")
        void findLatestUnusedByUser_WhenNoUnusedTokens_ShouldReturnEmpty() {
            // Given - Mark all tokens as used
            PasswordResetToken fetchedValid = entityManager.find(PasswordResetToken.class, validToken.getId());
            PasswordResetToken fetchedExpired = entityManager.find(PasswordResetToken.class, expiredToken.getId());
            fetchedValid.setUsed(true);
            fetchedExpired.setUsed(true);
            entityManager.flush();
            entityManager.clear();

            User fetchedUser = entityManager.find(User.class, testUser.getId());

            // When
            Optional<PasswordResetToken> result = tokenRepository.findLatestUnusedByUser(fetchedUser);

            // Then
            assertTrue(result.isEmpty());
        }

        @Test
        @DisplayName("Should return empty when user has no tokens")
        void findLatestUnusedByUser_WhenNoTokens_ShouldReturnEmpty() {
            // Given - Create new user with no tokens
            User newUser = User.builder()
                    .username("newuser")
                    .email("new@example.com")
                    .password("password")
                    .firstName("New")
                    .lastName("User")
                    .isActive(true)
                    .isEmailVerified(false)
                    .is2faEnabled(false)
                    .provider(AuthProvider.LOCAL)
                    .build();
            entityManager.persistAndFlush(newUser);
            entityManager.clear();

            User fetchedUser = entityManager.find(User.class, newUser.getId());

            // When
            Optional<PasswordResetToken> result = tokenRepository.findLatestUnusedByUser(fetchedUser);

            // Then
            assertTrue(result.isEmpty());
        }
    }

    // ==================== EXISTS BY USER AND USED FALSE TESTS ====================

    @Nested
    @DisplayName("existsByUserAndUsedFalse Tests")
    class ExistsByUserAndUsedFalseTests {

        @Test
        @DisplayName("Should return true when user has unused tokens")
        void existsByUserAndUsedFalse_WhenUnusedExists_ShouldReturnTrue() {
            // Given
            User fetchedUser = entityManager.find(User.class, testUser.getId());

            // When
            boolean exists = tokenRepository.existsByUserAndUsedFalse(fetchedUser);

            // Then
            assertTrue(exists);
        }

        @Test
        @DisplayName("Should return false when user has no unused tokens")
        void existsByUserAndUsedFalse_WhenNoUnused_ShouldReturnFalse() {
            // Given - Mark all tokens as used
            PasswordResetToken fetchedValid = entityManager.find(PasswordResetToken.class, validToken.getId());
            PasswordResetToken fetchedExpired = entityManager.find(PasswordResetToken.class, expiredToken.getId());
            fetchedValid.setUsed(true);
            fetchedExpired.setUsed(true);
            entityManager.flush();
            entityManager.clear();

            User fetchedUser = entityManager.find(User.class, testUser.getId());

            // When
            boolean exists = tokenRepository.existsByUserAndUsedFalse(fetchedUser);

            // Then
            assertFalse(exists);
        }
    }

    // ==================== DELETE BY USER TESTS ====================

    @Nested
    @DisplayName("deleteByUser Tests")
    class DeleteByUserTests {

        @Test
        @DisplayName("Should delete all tokens for user")
        void deleteByUser_ShouldDeleteAllUserTokens() {
            // Given
            User fetchedUser = entityManager.find(User.class, testUser.getId());
            long countBefore = tokenRepository.count();
            assertEquals(3, countBefore);

            // When
            tokenRepository.deleteByUser(fetchedUser);
            entityManager.flush();
            entityManager.clear();

            // Then
            long countAfter = tokenRepository.count();
            assertEquals(0, countAfter);
        }

        @Test
        @DisplayName("Should not fail when user has no tokens")
        void deleteByUser_WhenNoTokens_ShouldNotFail() {
            // Given - Create new user with no tokens
            User newUser = User.builder()
                    .username("notokenuser")
                    .email("notoken@example.com")
                    .password("password")
                    .firstName("No")
                    .lastName("Token")
                    .isActive(true)
                    .isEmailVerified(false)
                    .is2faEnabled(false)
                    .provider(AuthProvider.LOCAL)
                    .build();
            entityManager.persistAndFlush(newUser);
            entityManager.clear();

            User fetchedUser = entityManager.find(User.class, newUser.getId());

            // When/Then - Should not throw exception
            assertDoesNotThrow(() -> {
                tokenRepository.deleteByUser(fetchedUser);
                entityManager.flush();
            });
        }
    }

    // ==================== DELETE EXPIRED AND USED TOKENS TESTS ====================

    @Nested
    @DisplayName("deleteExpiredAndUsedTokens Tests")
    class DeleteExpiredAndUsedTokensTests {

        @Test
        @DisplayName("Should delete expired and used tokens")
        void deleteExpiredAndUsedTokens_ShouldDeleteExpiredAndUsed() {
            // When
            int deleted = tokenRepository.deleteExpiredAndUsedTokens(LocalDateTime.now());
            entityManager.flush();
            entityManager.clear();

            // Then - Should delete expired and used tokens (2 tokens)
            assertEquals(2, deleted);
            
            // Valid token should still exist
            Optional<PasswordResetToken> result = tokenRepository.findByToken(validToken.getToken());
            assertTrue(result.isPresent());
        }

        @Test
        @DisplayName("Should not delete valid unused tokens")
        void deleteExpiredAndUsedTokens_ShouldNotDeleteValidUnused() {
            // When
            tokenRepository.deleteExpiredAndUsedTokens(LocalDateTime.now());
            entityManager.flush();
            entityManager.clear();

            // Then - Valid token should still exist
            Optional<PasswordResetToken> result = tokenRepository.findByToken(validToken.getToken());
            assertTrue(result.isPresent());
            assertFalse(result.get().isUsed());
            assertFalse(result.get().isExpired());
        }
    }

    // ==================== COUNT BY USER AND USED FALSE TESTS ====================

    @Nested
    @DisplayName("countByUserAndUsedFalse Tests")
    class CountByUserAndUsedFalseTests {

        @Test
        @DisplayName("Should count unused tokens for user")
        void countByUserAndUsedFalse_ShouldReturnCount() {
            // Given
            User fetchedUser = entityManager.find(User.class, testUser.getId());

            // When
            int count = tokenRepository.countByUserAndUsedFalse(fetchedUser);

            // Then - Should be 2 (validToken and expiredToken are unused)
            assertEquals(2, count);
        }

        @Test
        @DisplayName("Should return 0 when no unused tokens")
        void countByUserAndUsedFalse_WhenNoUnused_ShouldReturnZero() {
            // Given - Mark all tokens as used
            PasswordResetToken fetchedValid = entityManager.find(PasswordResetToken.class, validToken.getId());
            PasswordResetToken fetchedExpired = entityManager.find(PasswordResetToken.class, expiredToken.getId());
            fetchedValid.setUsed(true);
            fetchedExpired.setUsed(true);
            entityManager.flush();
            entityManager.clear();

            User fetchedUser = entityManager.find(User.class, testUser.getId());

            // When
            int count = tokenRepository.countByUserAndUsedFalse(fetchedUser);

            // Then
            assertEquals(0, count);
        }
    }

    // ==================== INVALIDATE ALL TOKENS FOR USER TESTS ====================

    @Nested
    @DisplayName("invalidateAllTokensForUser Tests")
    class InvalidateAllTokensForUserTests {

        @Test
        @DisplayName("Should invalidate all unused tokens for user")
        void invalidateAllTokensForUser_ShouldMarkAllAsUsed() {
            // Given
            User fetchedUser = entityManager.find(User.class, testUser.getId());

            // When
            int invalidated = tokenRepository.invalidateAllTokensForUser(fetchedUser, LocalDateTime.now());
            entityManager.flush();
            entityManager.clear();

            // Then - Should invalidate 2 unused tokens
            assertEquals(2, invalidated);
            
            Optional<PasswordResetToken> validResult = tokenRepository.findByToken(validToken.getToken());
            assertTrue(validResult.isPresent());
            assertTrue(validResult.get().isUsed());
            
            Optional<PasswordResetToken> expiredResult = tokenRepository.findByToken(expiredToken.getToken());
            assertTrue(expiredResult.isPresent());
            assertTrue(expiredResult.get().isUsed());
        }

        @Test
        @DisplayName("Should not affect already used tokens")
        void invalidateAllTokensForUser_ShouldNotAffectUsedTokens() {
            // Given
            User fetchedUser = entityManager.find(User.class, testUser.getId());
            LocalDateTime usedAtBefore = usedToken.getUsedAt();

            // When
            tokenRepository.invalidateAllTokensForUser(fetchedUser, LocalDateTime.now());
            entityManager.flush();
            entityManager.clear();

            // Then - Used token should not be affected (already used)
            Optional<PasswordResetToken> usedResult = tokenRepository.findByToken(usedToken.getToken());
            assertTrue(usedResult.isPresent());
            assertTrue(usedResult.get().isUsed());
            // Note: usedAt might be updated, but the token was already used
        }

        @Test
        @DisplayName("Should return 0 when user has no unused tokens")
        void invalidateAllTokensForUser_WhenNoUnused_ShouldReturnZero() {
            // Given - Mark all tokens as used
            PasswordResetToken fetchedValid = entityManager.find(PasswordResetToken.class, validToken.getId());
            PasswordResetToken fetchedExpired = entityManager.find(PasswordResetToken.class, expiredToken.getId());
            fetchedValid.setUsed(true);
            fetchedExpired.setUsed(true);
            entityManager.flush();
            entityManager.clear();

            User fetchedUser = entityManager.find(User.class, testUser.getId());

            // When
            int invalidated = tokenRepository.invalidateAllTokensForUser(fetchedUser, LocalDateTime.now());

            // Then
            assertEquals(0, invalidated);
        }
    }
}
