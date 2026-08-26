package com.edumind.auth.repository;

import com.edumind.auth.entity.EmailVerificationToken;
import com.edumind.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, Long> {
    /**
     * Find token by token string
     */
    Optional<EmailVerificationToken> findByToken(String token);

    /**
     * Find latest unverified token for a user
     */
    @Query("SELECT t FROM EmailVerificationToken t WHERE t.user = :user " +
            "AND t.verifiedAt IS NULL " +
            "ORDER BY t.createdAt DESC")
    Optional<EmailVerificationToken> findLatestUnverifiedByUser(@Param("user") User user);

    @Modifying(flushAutomatically = true)
    @Query("UPDATE EmailVerificationToken t SET t.invalidatedAt = :now " +
            "WHERE t.user = :user AND t.verifiedAt IS NULL AND t.invalidatedAt IS NULL")
    int invalidateActiveTokens(@Param("user") User user, @Param("now") LocalDateTime now);

    /**
     * Check if user has any unverified tokens
     */
    boolean existsByUserAndVerifiedAtIsNull(User user);

    /**
     * Delete all tokens for a user (cleanup)
     */
    void deleteByUser(User user);

    /**
     * Delete expired tokens (for scheduled cleanup job)
     */
    @Modifying
    @Query("DELETE FROM EmailVerificationToken t WHERE t.expiryDate < :now")
    int deleteExpiredTokens(@Param("now") LocalDateTime now);

    /**
     * Count unverified tokens for a user
     */
    int countByUserAndVerifiedAtIsNull(User user);

}
