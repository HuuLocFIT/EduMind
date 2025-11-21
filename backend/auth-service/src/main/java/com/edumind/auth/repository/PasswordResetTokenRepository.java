package com.edumind.auth.repository;

import com.edumind.auth.entity.PasswordResetToken;
import com.edumind.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
    /**
     * Find token by token string
     */
    Optional<PasswordResetToken> findByToken(String token);

    /**
     * Find latest unused token for a user
     */
    @Query("SELECT t FROM PasswordResetToken t WHERE t.user = :user " +
            "AND t.used = false " +
            "ORDER BY t.createdAt DESC")
    Optional<PasswordResetToken> findLatestUnusedByUser(@Param("user") User user);

    /**
     * Check if user has any unused tokens
     */
    boolean existsByUserAndUsedFalse(User user);

    /**
     * Delete all tokens for a user (cleanup)
     */
    void deleteByUser(User user);

    /**
     * Delete expired and used tokens (for scheduled cleanup job)
     */
    @Modifying
    @Query("DELETE FROM PasswordResetToken t WHERE t.expiryDate < :now OR t.used = true")
    int deleteExpiredAndUsedTokens(@Param("now") LocalDateTime now);

    /**
     * Count unused tokens for a user
     */
    int countByUserAndUsedFalse(User user);

    /**
     * Invalidate (mark as used) all existing tokens for a user
     * Used when user successfully resets password
     */
    @Modifying
    @Query("UPDATE PasswordResetToken t SET t.used = true, t.usedAt = :now " +
            "WHERE t.user = :user AND t.used = false")
    int invalidateAllTokensForUser(@Param("user") User user, @Param("now") LocalDateTime now);
}