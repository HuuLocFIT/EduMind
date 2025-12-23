package com.edumind.auth.repository;

import com.edumind.auth.entity.RefreshToken;
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

import static org.junit.jupiter.api.Assertions.*;

/**
 * Repository tests for RefreshTokenRepository
 * Uses @DataJpaTest with H2 in-memory database
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@ActiveProfiles("test")
class RefreshTokenRepositoryTest {

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private TestEntityManager entityManager;

    private User testUser;
    private RefreshToken validToken;
    private RefreshToken expiredToken;
    private RefreshToken revokedToken;

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

        // Create valid token (not expired, not revoked)
        validToken = RefreshToken.builder()
                .token("valid-refresh-token-12345")
                .user(testUser)
                .expiryDate(LocalDateTime.now().plusDays(7))
                .revoked(false)
                .build();
        entityManager.persistAndFlush(validToken);

        // Create expired token
        expiredToken = RefreshToken.builder()
                .token("expired-refresh-token-12345")
                .user(testUser)
                .expiryDate(LocalDateTime.now().minusDays(1))
                .revoked(false)
                .build();
        entityManager.persistAndFlush(expiredToken);

        // Create revoked token
        revokedToken = RefreshToken.builder()
                .token("revoked-refresh-token-12345")
                .user(testUser)
                .expiryDate(LocalDateTime.now().plusDays(7))
                .revoked(true)
                .build();
        entityManager.persistAndFlush(revokedToken);

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
            Optional<RefreshToken> result = refreshTokenRepository.findByToken("valid-refresh-token-12345");

            // Then
            assertTrue(result.isPresent());
            assertEquals("valid-refresh-token-12345", result.get().getToken());
            assertNotNull(result.get().getUser());
            assertEquals("testuser", result.get().getUser().getUsername());
        }

        @Test
        @DisplayName("Should return empty when token not found")
        void findByToken_WhenNotExists_ShouldReturnEmpty() {
            // When
            Optional<RefreshToken> result = refreshTokenRepository.findByToken("nonexistent-token");

            // Then
            assertTrue(result.isEmpty());
        }

        @Test
        @DisplayName("Should find expired token")
        void findByToken_ExpiredToken_ShouldStillReturn() {
            // When
            Optional<RefreshToken> result = refreshTokenRepository.findByToken("expired-refresh-token-12345");

            // Then
            assertTrue(result.isPresent());
            assertTrue(result.get().getExpiryDate().isBefore(LocalDateTime.now()));
        }

        @Test
        @DisplayName("Should find revoked token")
        void findByToken_RevokedToken_ShouldStillReturn() {
            // When
            Optional<RefreshToken> result = refreshTokenRepository.findByToken("revoked-refresh-token-12345");

            // Then
            assertTrue(result.isPresent());
            assertTrue(result.get().getRevoked());
        }

        @Test
        @DisplayName("Should return empty when token is null")
        void findByToken_WithNullToken_ShouldReturnEmpty() {
            // When
            Optional<RefreshToken> result = refreshTokenRepository.findByToken(null);

            // Then
            assertTrue(result.isEmpty());
        }

        @Test
        @DisplayName("Should return empty when token is empty string")
        void findByToken_WithEmptyToken_ShouldReturnEmpty() {
            // When
            Optional<RefreshToken> result = refreshTokenRepository.findByToken("");

            // Then
            assertTrue(result.isEmpty());
        }
    }

    // ==================== FIND VALID TOKEN BY USER TESTS ====================

    @Nested
    @DisplayName("findValidTokenByUser Tests")
    class FindValidTokenByUserTests {

        @Test
        @DisplayName("Should find valid token for user")
        void findValidTokenByUser_WhenValidTokenExists_ShouldReturn() {
            // Given
            User fetchedUser = entityManager.find(User.class, testUser.getId());

            // When
            Optional<RefreshToken> result = refreshTokenRepository.findValidTokenByUser(
                    fetchedUser, LocalDateTime.now());

            // Then
            assertTrue(result.isPresent());
            assertEquals("valid-refresh-token-12345", result.get().getToken());
            assertFalse(result.get().getRevoked());
            assertTrue(result.get().getExpiryDate().isAfter(LocalDateTime.now()));
        }

        @Test
        @DisplayName("Should not return expired token")
        void findValidTokenByUser_ShouldNotReturnExpiredToken() {
            // Given - Delete valid token first
            RefreshToken fetchedValidToken = entityManager.find(RefreshToken.class, validToken.getId());
            entityManager.remove(fetchedValidToken);
            entityManager.flush();
            entityManager.clear();

            User fetchedUser = entityManager.find(User.class, testUser.getId());

            // When
            Optional<RefreshToken> result = refreshTokenRepository.findValidTokenByUser(
                    fetchedUser, LocalDateTime.now());

            // Then - Should not find expired or revoked tokens
            assertTrue(result.isEmpty());
        }

        @Test
        @DisplayName("Should not return revoked token")
        void findValidTokenByUser_ShouldNotReturnRevokedToken() {
            // Given - Remove valid token, keep only revoked
            RefreshToken fetchedValidToken = entityManager.find(RefreshToken.class, validToken.getId());
            RefreshToken fetchedExpiredToken = entityManager.find(RefreshToken.class, expiredToken.getId());
            entityManager.remove(fetchedValidToken);
            entityManager.remove(fetchedExpiredToken);
            entityManager.flush();
            entityManager.clear();

            User fetchedUser = entityManager.find(User.class, testUser.getId());

            // When
            Optional<RefreshToken> result = refreshTokenRepository.findValidTokenByUser(
                    fetchedUser, LocalDateTime.now());

            // Then
            assertTrue(result.isEmpty());
        }

        @Test
        @DisplayName("Should return empty when user has no valid tokens")
        void findValidTokenByUser_WhenNoValidTokens_ShouldReturnEmpty() {
            // Given - Create user with no tokens
            User newUser = User.builder()
                    .username("newuser")
                    .email("newuser@example.com")
                    .password("encodedPassword123")
                    .firstName("New")
                    .lastName("User")
                    .isActive(true)
                    .isEmailVerified(true)
                    .is2faEnabled(false)
                    .provider(AuthProvider.LOCAL)
                    .build();
            entityManager.persistAndFlush(newUser);
            entityManager.clear();

            User fetchedUser = entityManager.find(User.class, newUser.getId());

            // When
            Optional<RefreshToken> result = refreshTokenRepository.findValidTokenByUser(
                    fetchedUser, LocalDateTime.now());

            // Then
            assertTrue(result.isEmpty());
        }
    }

    // ==================== REVOKE ALL USER TOKENS TESTS ====================

    @Nested
    @DisplayName("revokeAllUserTokens Tests")
    class RevokeAllUserTokensTests {

        @Test
        @DisplayName("Should revoke all tokens for user")
        void revokeAllUserTokens_ShouldRevokeAllTokens() {
            // Given
            User fetchedUser = entityManager.find(User.class, testUser.getId());

            // When
            refreshTokenRepository.revokeAllUserTokens(fetchedUser);
            entityManager.flush();
            entityManager.clear();

            // Then - All tokens should be revoked
            Optional<RefreshToken> validTokenResult = refreshTokenRepository.findByToken("valid-refresh-token-12345");
            assertTrue(validTokenResult.isPresent());
            assertTrue(validTokenResult.get().getRevoked());

            Optional<RefreshToken> expiredTokenResult = refreshTokenRepository.findByToken("expired-refresh-token-12345");
            assertTrue(expiredTokenResult.isPresent());
            assertTrue(expiredTokenResult.get().getRevoked());
        }

        @Test
        @DisplayName("Should not affect tokens of other users")
        void revokeAllUserTokens_ShouldNotAffectOtherUsers() {
            // Given - Create another user with a token
            User anotherUser = User.builder()
                    .username("anotheruser")
                    .email("another@example.com")
                    .password("encodedPassword123")
                    .firstName("Another")
                    .lastName("User")
                    .isActive(true)
                    .isEmailVerified(true)
                    .is2faEnabled(false)
                    .provider(AuthProvider.LOCAL)
                    .build();
            entityManager.persistAndFlush(anotherUser);

            RefreshToken anotherToken = RefreshToken.builder()
                    .token("another-user-token-12345")
                    .user(anotherUser)
                    .expiryDate(LocalDateTime.now().plusDays(7))
                    .revoked(false)
                    .build();
            entityManager.persistAndFlush(anotherToken);
            entityManager.clear();

            // When - Revoke tokens for testUser only
            User fetchedTestUser = entityManager.find(User.class, testUser.getId());
            refreshTokenRepository.revokeAllUserTokens(fetchedTestUser);
            entityManager.flush();
            entityManager.clear();

            // Then - Another user's token should NOT be revoked
            Optional<RefreshToken> otherTokenResult = refreshTokenRepository.findByToken("another-user-token-12345");
            assertTrue(otherTokenResult.isPresent());
            assertFalse(otherTokenResult.get().getRevoked());
        }

        @Test
        @DisplayName("Should handle user with no tokens gracefully")
        void revokeAllUserTokens_WhenUserHasNoTokens_ShouldNotFail() {
            // Given - Create user with no tokens
            User newUser = User.builder()
                    .username("notokenuser")
                    .email("notoken@example.com")
                    .password("encodedPassword123")
                    .firstName("No")
                    .lastName("Token")
                    .isActive(true)
                    .isEmailVerified(true)
                    .is2faEnabled(false)
                    .provider(AuthProvider.LOCAL)
                    .build();
            entityManager.persistAndFlush(newUser);
            entityManager.clear();

            User fetchedUser = entityManager.find(User.class, newUser.getId());

            // When/Then - Should not throw exception
            assertDoesNotThrow(() -> {
                refreshTokenRepository.revokeAllUserTokens(fetchedUser);
                entityManager.flush();
            });
        }
    }

    // ==================== DELETE EXPIRED TOKENS TESTS ====================

    @Nested
    @DisplayName("deleteExpiredTokens Tests")
    class DeleteExpiredTokensTests {

        @Test
        @DisplayName("Should delete expired tokens")
        void deleteExpiredTokens_ShouldDeleteExpiredTokens() {
            // When
            refreshTokenRepository.deleteExpiredTokens(LocalDateTime.now());
            entityManager.flush();
            entityManager.clear();

            // Then - Expired token should be deleted
            Optional<RefreshToken> expiredResult = refreshTokenRepository.findByToken("expired-refresh-token-12345");
            assertTrue(expiredResult.isEmpty());

            // Valid token should still exist
            Optional<RefreshToken> validResult = refreshTokenRepository.findByToken("valid-refresh-token-12345");
            assertTrue(validResult.isPresent());
        }

        @Test
        @DisplayName("Should not delete non-expired tokens")
        void deleteExpiredTokens_ShouldNotDeleteNonExpiredTokens() {
            // When
            refreshTokenRepository.deleteExpiredTokens(LocalDateTime.now());
            entityManager.flush();
            entityManager.clear();

            // Then
            Optional<RefreshToken> validResult = refreshTokenRepository.findByToken("valid-refresh-token-12345");
            assertTrue(validResult.isPresent());

            Optional<RefreshToken> revokedResult = refreshTokenRepository.findByToken("revoked-refresh-token-12345");
            assertTrue(revokedResult.isPresent()); // Revoked but not expired
        }

        @Test
        @DisplayName("Should handle when no expired tokens exist")
        void deleteExpiredTokens_WhenNoExpiredTokens_ShouldNotFail() {
            // Given - Delete expired token first
            RefreshToken fetchedExpiredToken = entityManager.find(RefreshToken.class, expiredToken.getId());
            entityManager.remove(fetchedExpiredToken);
            entityManager.flush();
            entityManager.clear();

            // When/Then - Should not throw exception
            assertDoesNotThrow(() -> {
                refreshTokenRepository.deleteExpiredTokens(LocalDateTime.now());
                entityManager.flush();
            });
        }
    }

    // ==================== COUNT TOKENS TESTS ====================

    @Nested
    @DisplayName("Token counts Tests")
    class TokenCountsTests {

        @Test
        @DisplayName("Should count all tokens in repository")
        void count_ShouldReturnTotalTokenCount() {
            // When
            long count = refreshTokenRepository.count();

            // Then - Should have 3 tokens (valid, expired, revoked)
            assertEquals(3, count);
        }

        @Test
        @DisplayName("Should return zero when no tokens exist")
        void count_WhenNoTokens_ShouldReturnZero() {
            // Given - Delete all tokens
            refreshTokenRepository.deleteAll();
            entityManager.flush();
            entityManager.clear();

            // When
            long count = refreshTokenRepository.count();

            // Then
            assertEquals(0, count);
        }
    }

    // ==================== EDGE CASES TESTS ====================

    @Nested
    @DisplayName("Edge Cases Tests")
    class EdgeCasesTests {

        @Test
        @DisplayName("Should handle deleteExpiredTokens with boundary date")
        void deleteExpiredTokens_WithBoundaryDate_ShouldDeleteCorrectly() {
            // Given - Create token expiring exactly at boundary
            RefreshToken boundaryToken = RefreshToken.builder()
                    .token("boundary-token-12345")
                    .user(testUser)
                    .expiryDate(LocalDateTime.now().minusSeconds(1)) // Just expired
                    .revoked(false)
                    .build();
            entityManager.persistAndFlush(boundaryToken);
            entityManager.clear();

            // When
            refreshTokenRepository.deleteExpiredTokens(LocalDateTime.now());
            entityManager.flush();
            entityManager.clear();

            // Then - Boundary token should be deleted
            Optional<RefreshToken> result = refreshTokenRepository.findByToken("boundary-token-12345");
            assertTrue(result.isEmpty());
        }

        @Test
        @DisplayName("Should not delete token expiring in the future")
        void deleteExpiredTokens_WithFutureExpiry_ShouldNotDelete() {
            // Given - Create token expiring in the future
            RefreshToken futureToken = RefreshToken.builder()
                    .token("future-token-12345")
                    .user(testUser)
                    .expiryDate(LocalDateTime.now().plusDays(1))
                    .revoked(false)
                    .build();
            entityManager.persistAndFlush(futureToken);
            entityManager.clear();

            // When
            refreshTokenRepository.deleteExpiredTokens(LocalDateTime.now());
            entityManager.flush();
            entityManager.clear();

            // Then - Future token should still exist
            Optional<RefreshToken> result = refreshTokenRepository.findByToken("future-token-12345");
            assertTrue(result.isPresent());
        }
    }
}
