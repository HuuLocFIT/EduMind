package com.edumind.auth.security;

import com.edumind.common.constants.ErrorCode;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.stream.Collectors;

@Component
public class JwtTokenProvider {
    
    private static final Logger logger = LoggerFactory.getLogger(JwtTokenProvider.class);

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration}")
    private long jwtExpirationMs;

    @Value("${jwt.refresh-expiration}")
    private long refreshExpirationMs;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Generate access token for authenticated user
     */
    public String generateAccessToken(Authentication authentication) {
        UserDetailsImpl userPrincipal = (UserDetailsImpl) authentication.getPrincipal();

        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationMs);

        String roles = userPrincipal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.joining(","));

        logger.debug("🔐 Generating access token for user: {}", userPrincipal.getUsername());

        return Jwts.builder()
                .subject(userPrincipal.getUsername())
                .claim("userId", userPrincipal.getId())
                .claim("email", userPrincipal.getEmail())
                .claim("roles", roles)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey())
                .compact();
    }

    /**
     * Generate refresh token for authenticated user
     */
    public String generateRefreshToken(Authentication authentication) {
        UserDetailsImpl userPrincipal = (UserDetailsImpl) authentication.getPrincipal();

        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + refreshExpirationMs);

        logger.debug("🔄 Generating refresh token for user: {}", userPrincipal.getUsername());

        return Jwts.builder()
                .subject(userPrincipal.getUsername())
                .claim("userId", userPrincipal.getId())
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey())
                .compact();
    }

    /**
     * Extract username from token
     */
    public String getUsernameFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return claims.getSubject();
    }

    /**
     * Extract user ID from token
     */
    public Long getUserIdFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return claims.get("userId", Long.class);
    }

    /**
     * Simple validation (backward compatible)
     */
    public boolean validateToken(String authToken) {
        return validateTokenWithDetails(authToken).isValid();
    }

    public JwtValidationResult validateTokenWithDetails(String authToken) {
        try {
            Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(authToken);
            return JwtValidationResult.success();

        } catch (ExpiredJwtException ex) {
            logger.error("❌ Expired JWT token: {}", ex.getMessage());
            return JwtValidationResult.failure(
                    ErrorCode.TOKEN_EXPIRED,
                    "Access token has expired. Please refresh your token or login again."
            );

        } catch (SignatureException ex) {
            logger.error("❌ Invalid JWT signature: {}", ex.getMessage());
            return JwtValidationResult.failure(
                    ErrorCode.TOKEN_INVALID,
                    "Invalid token signature. Token may have been tampered with."
            );

        } catch (MalformedJwtException ex) {
            logger.error("❌ Invalid JWT token: {}", ex.getMessage());
            return JwtValidationResult.failure(
                    ErrorCode.TOKEN_INVALID,
                    "Malformed token. Please provide a valid JWT token."
            );

        } catch (UnsupportedJwtException ex) {
            logger.error("❌ Unsupported JWT token: {}", ex.getMessage());
            return JwtValidationResult.failure(
                    ErrorCode.TOKEN_INVALID,
                    "Unsupported token format."
            );

        } catch (IllegalArgumentException ex) {
            logger.error("❌ JWT claims string is empty: {}", ex.getMessage());
            return JwtValidationResult.failure(
                    ErrorCode.TOKEN_INVALID,
                    "Token claims are empty or invalid."
            );
        }
    }

    /**
     * Get token expiration date
     */
    public Date getExpirationDateFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return claims.getExpiration();
    }

    /**
     * Check if token is expired
     */
    public boolean isTokenExpired(String token) {
        try {
            Date expiration = getExpirationDateFromToken(token);
            return expiration.before(new Date());
        } catch (ExpiredJwtException e) {
            return true;
        }
    }
}