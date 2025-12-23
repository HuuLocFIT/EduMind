package com.edumind.auth.security;

import com.edumind.common.constants.ErrorCode;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.util.Collection;
import java.util.Date;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtTokenProviderTest {

    private JwtTokenProvider tokenProvider;

    @Mock
    private Authentication authentication;

    @Mock
    private UserDetailsImpl userDetails;

    private final String JWT_SECRET = "testSecretKey12345678901234567890123456789032bits"; // >256 bits
    private final long JWT_EXPIRATION = 3600000; // 1 hour
    private final long REFRESH_EXPIRATION = 86400000; // 24 hours

    @BeforeEach
    void setUp() {
        tokenProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(tokenProvider, "jwtSecret", JWT_SECRET);
        ReflectionTestUtils.setField(tokenProvider, "jwtExpirationMs", JWT_EXPIRATION);
        ReflectionTestUtils.setField(tokenProvider, "refreshExpirationMs", REFRESH_EXPIRATION);
    }

    @Test
    @DisplayName("Should generate valid access token")
    void generateAccessToken_ShouldReturnValidToken() {
        // Given
        when(authentication.getPrincipal()).thenReturn(userDetails);
        when(userDetails.getUsername()).thenReturn("testuser");
        when(userDetails.getId()).thenReturn(1L);
        when(userDetails.getEmail()).thenReturn("test@example.com");
        
        Collection authorities = List.of(new SimpleGrantedAuthority("ROLE_USER"));
        // Unchecked cast warning is expected with raw Collection, but safe here for mock
        when(userDetails.getAuthorities()).thenReturn(authorities);

        // When
        String token = tokenProvider.generateAccessToken(authentication);

        // Then
        assertNotNull(token);
        assertTrue(tokenProvider.validateToken(token));
        assertEquals("testuser", tokenProvider.getUsernameFromToken(token));
        assertEquals(1L, tokenProvider.getUserIdFromToken(token));
    }

    @Test
    @DisplayName("Should generate valid refresh token")
    void generateRefreshToken_ShouldReturnValidToken() {
        // Given
        when(authentication.getPrincipal()).thenReturn(userDetails);
        when(userDetails.getUsername()).thenReturn("testuser");
        when(userDetails.getId()).thenReturn(1L);

        // When
        String token = tokenProvider.generateRefreshToken(authentication);

        // Then
        assertNotNull(token);
        assertTrue(tokenProvider.validateToken(token));
        assertEquals("testuser", tokenProvider.getUsernameFromToken(token));
    }

    @Test
    @DisplayName("Should returning valid result for valid token")
    void validateToken_WithValidToken_ShouldReturnTrue() {
        // Generate a real token manually to test validation
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + JWT_EXPIRATION);
        
        String token = Jwts.builder()
                .subject("testuser")
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(Keys.hmacShaKeyFor(JWT_SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact();

        // Check boolean validation
        assertTrue(tokenProvider.validateToken(token));
        
        // Check detailed validation
        JwtValidationResult result = tokenProvider.validateTokenWithDetails(token);
        assertTrue(result.isValid());
        assertNull(result.getErrorType());
    }

    @Test
    @DisplayName("Should detect expired token")
    void validateToken_WithExpiredToken_ShouldReturnExpiredError() {
        // Generate expired token
        Date now = new Date();
        Date pastDate = new Date(now.getTime() - 10000); // 10s ago
        
        String token = Jwts.builder()
                .subject("testuser")
                .issuedAt(new Date(now.getTime() - 20000))
                .expiration(pastDate)
                .signWith(Keys.hmacShaKeyFor(JWT_SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact();

        // Check boolean validation
        assertFalse(tokenProvider.validateToken(token));
        
        // Check detailed validation
        JwtValidationResult result = tokenProvider.validateTokenWithDetails(token);
        assertFalse(result.isValid());
        assertEquals(ErrorCode.TOKEN_EXPIRED, result.getErrorType());
    }

    @Test
    @DisplayName("Should detect malformed token")
    void validateToken_WithMalformedToken_ShouldReturnInvalidError() {
        String token = "malformed.token.string";

        assertFalse(tokenProvider.validateToken(token));
        
        JwtValidationResult result = tokenProvider.validateTokenWithDetails(token);
        assertFalse(result.isValid());
        assertEquals(ErrorCode.TOKEN_INVALID, result.getErrorType());
    }

    @Test
    @DisplayName("Should detect invalid signature")
    void validateToken_WithInvalidSignature_ShouldReturnInvalidError() {
        // Token signed with different key
        String differentSecret = "differentSecretKey12345678901234567890";
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + JWT_EXPIRATION);
        
        String token = Jwts.builder()
                .subject("testuser")
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(Keys.hmacShaKeyFor(differentSecret.getBytes(StandardCharsets.UTF_8)))
                .compact();

        assertFalse(tokenProvider.validateToken(token));
        
        JwtValidationResult result = tokenProvider.validateTokenWithDetails(token);
        assertFalse(result.isValid());
        assertEquals(ErrorCode.TOKEN_INVALID, result.getErrorType());
    }

    @Test
    @DisplayName("Should check token expiration correctly")
    void isTokenExpired_ShouldReturnTrueForExpiredToken() {
        Date now = new Date();
        Date pastDate = new Date(now.getTime() - 10000);
        
        String token = Jwts.builder()
                .subject("testuser")
                .issuedAt(new Date(now.getTime() - 20000))
                .expiration(pastDate)
                .signWith(Keys.hmacShaKeyFor(JWT_SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact();

        assertTrue(tokenProvider.isTokenExpired(token));
    }
}
