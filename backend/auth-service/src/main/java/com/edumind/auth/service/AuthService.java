package com.edumind.auth.service;

import com.edumind.auth.dto.model.OAuth2UserInfo;
import com.edumind.auth.dto.request.LoginRequest;
import com.edumind.auth.dto.request.SignupRequest;
import com.edumind.auth.dto.request.TwoFactorLoginRequest;
import com.edumind.auth.dto.response.JwtResponse;
import com.edumind.auth.dto.response.TwoFactorRequiredResponse;
import com.edumind.auth.dto.response.UserResponse;
import com.edumind.auth.entity.RefreshToken;
import com.edumind.auth.entity.Role;
import com.edumind.auth.enums.AuthProvider;
import com.edumind.auth.enums.RoleName;
import com.edumind.auth.entity.User;
import com.edumind.auth.repository.RefreshTokenRepository;
import com.edumind.auth.repository.RoleRepository;
import com.edumind.auth.repository.UserRepository;
import com.edumind.auth.security.JwtTokenProvider;
import com.edumind.auth.security.UserDetailsImpl;
import com.edumind.auth.util.UserMapper;
import com.edumind.common.constants.ResponseStatus;
import com.edumind.common.exception.BadRequestException;
import com.edumind.common.exception.EmailNotVerifiedException;
import com.edumind.common.exception.ResourceNotFoundException;
import com.edumind.common.exception.TokenRefreshException;
import com.edumind.common.response.MessageResponse;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;
import java.util.HashSet;

@Service
public class AuthService {
    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    private static final String REFRESH_TOKEN_COOKIE_NAME = "refreshToken";
    private static final int REFRESH_TOKEN_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

    private final AuthenticationManager authenticationManager;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private EmailVerificationService emailVerificationService;

    @Autowired
    private TwoFactorAuthService twoFactorAuthService;

    @Value("${jwt.refresh-expiration}")
    private long refreshExpirationMs;

    @Value("${app.cookie.secure:true}")
    private boolean cookieSecure;

    @Value("${app.cookie.same-site:Lax}")
    private String cookieSameSite;

    @Value("${app.auth.enforce-email-verification:true}")
    private boolean enforceEmailVerification;

    @Autowired
    public AuthService(@Lazy AuthenticationManager authenticationManager) {
        this.authenticationManager = authenticationManager;
    }

    // ==================== AUTHENTICATION ====================

    /**
     * Authenticate user with username/email and password
     * Sets refresh token in HTTP-Only cookie
     */
    @Transactional
    public Object authenticateUser(LoginRequest loginRequest, HttpServletResponse response) {
        logger.info("🔐 Authenticating user: {}", loginRequest.getUsernameOrEmail());

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getUsernameOrEmail(),
                        loginRequest.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        requireVerifiedEmail(user);

        if (Boolean.TRUE.equals(user.getIs2faEnabled())) {
            logger.info("🔐 2FA required for user: {}", user.getEmail());
            return new TwoFactorRequiredResponse(
                    user.getEmail(),
                    "Two-factor authentication required. Please provide your 2FA code.");
        }

        return generateAuthResponse(authentication, user, response);
    }

    /**
     * Verify 2FA code and complete login
     * Sets refresh token in HTTP-Only cookie
     */
    @Transactional
    public JwtResponse verify2FAAndLogin(TwoFactorLoginRequest request, HttpServletResponse response) {
        logger.info("🔐 Verifying 2FA for user: {}", request.getUsernameOrEmail());

        User user = userRepository.findByUsername(request.getUsernameOrEmail())
                .or(() -> userRepository.findByEmail(request.getUsernameOrEmail()))
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        boolean isValid = twoFactorAuthService.verifyCodeForLogin(user, request.getCode());

        if (!isValid) {
            logger.warn("❌ Invalid 2FA code for user: {}", user.getEmail());
            throw new BadRequestException("Invalid 2FA code");
        }

        requireVerifiedEmail(user);

        logger.info("✅ 2FA verified successfully for user: {}", user.getEmail());

        UserDetailsImpl userDetails = UserDetailsImpl.build(user);
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities());

        SecurityContextHolder.getContext().setAuthentication(authentication);

        return generateAuthResponse(authentication, user, response);
    }

    /** Require verification for local accounts when enforcement is enabled. */
    private void requireVerifiedEmail(User user) {
        if (!enforceEmailVerification) return;
        if (user.getProvider() != null && user.getProvider().isOAuth2()) return;
        if (!Boolean.TRUE.equals(user.getIsEmailVerified())) {
            throw new EmailNotVerifiedException("Please verify your email before signing in.");
        }
    }

    /**
     * Generate authentication response with access token.
     * Refresh token is set in HTTP-Only cookie (not returned in response body).
     */
    private JwtResponse generateAuthResponse(Authentication authentication, User user, HttpServletResponse response) {
        // Generate access token
        String accessToken = tokenProvider.generateAccessToken(authentication);

        // Create refresh token and save to DB
        RefreshToken refreshTokenEntity = createRefreshToken(user.getId());

        // Set refresh token in HTTP-Only cookie
        setRefreshTokenCookie(response, refreshTokenEntity.getToken());

        // Update last login
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        logger.info("✅ User authenticated successfully: {}", userDetails.getUsername());

        UserResponse userResponse = UserMapper.toUserResponse(user);

        // Return response WITHOUT refresh token (it's in cookie)
        return JwtResponse.builder()
                .accessToken(accessToken)
                .tokenType("Bearer")
                .user(userResponse)
                .build();
    }

    // ==================== TOKEN REFRESH ====================

    /**
     * Refresh access token using refresh token from cookie
     */
    @Transactional
    public JwtResponse refreshToken(String refreshTokenValue, HttpServletResponse response) {
        logger.info("🔄 Refreshing token");

        if (refreshTokenValue == null || refreshTokenValue.isBlank()) {
            logger.error("❌ Refresh token not found in cookie");
            throw new TokenRefreshException("Refresh token not found!");
        }

        RefreshToken refreshToken = refreshTokenRepository.findByToken(refreshTokenValue)
                .orElseThrow(() -> new TokenRefreshException("Refresh token not found!"));

        if (refreshToken.getRevoked()) {
            logger.error("❌ Refresh token is revoked");
            clearRefreshTokenCookie(response);
            throw new TokenRefreshException("Refresh token is revoked!");
        }

        if (refreshToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            refreshTokenRepository.delete(refreshToken);
            clearRefreshTokenCookie(response);
            logger.error("❌ Refresh token is expired");
            throw new TokenRefreshException("Refresh token is expired!");
        }

        User user = refreshToken.getUser();
        requireVerifiedEmail(user);
        UserDetailsImpl userDetails = UserDetailsImpl.build(user);
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities());

        String newAccessToken = tokenProvider.generateAccessToken(authentication);

        logger.info("✅ Token refreshed successfully for user: {}", user.getUsername());
        UserResponse userResponse = UserMapper.toUserResponse(user);

        // Return response WITHOUT refresh token (cookie remains unchanged)
        return JwtResponse.builder()
                .accessToken(newAccessToken)
                .tokenType("Bearer")
                .user(userResponse)
                .build();
    }

    // ==================== LOGOUT ====================

    /**
     * Logout user - revoke all refresh tokens and clear cookie
     */
    @Transactional
    public MessageResponse logout(HttpServletResponse response) {
        logger.info("👋 User logging out");

        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getPrincipal();

        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Revoke all refresh tokens in DB
        refreshTokenRepository.revokeAllUserTokens(user);

        // Clear the cookie
        clearRefreshTokenCookie(response);

        logger.info("✅ User logged out successfully: {}", user.getUsername());

        return MessageResponse.builder()
                .status(HttpStatus.OK.value())
                .success(true)
                .message(ResponseStatus.LOGOUT_SUCCESS)
                .build();
    }

    // ==================== COOKIE HELPERS ====================

    /**
     * Set refresh token in HTTP-Only cookie
     */
    private void setRefreshTokenCookie(HttpServletResponse response, String token) {
        Cookie cookie = new Cookie(REFRESH_TOKEN_COOKIE_NAME, token);
        cookie.setHttpOnly(true);
        cookie.setSecure(cookieSecure);
        cookie.setPath("/");
        cookie.setMaxAge(REFRESH_TOKEN_COOKIE_MAX_AGE);
        // Note: SameSite requires using ResponseCookie or setting header manually
        response.addCookie(cookie);

        // Set SameSite attribute via header (Cookie class doesn't support it directly)
        response.setHeader("Set-Cookie",
                String.format("%s=%s; Path=/; Max-Age=%d; HttpOnly; %s; SameSite=%s",
                        REFRESH_TOKEN_COOKIE_NAME,
                        token,
                        REFRESH_TOKEN_COOKIE_MAX_AGE,
                        cookieSecure ? "Secure" : "",
                        cookieSameSite));
    }

    /**
     * Clear refresh token cookie
     */
    private void clearRefreshTokenCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie(REFRESH_TOKEN_COOKIE_NAME, "");
        cookie.setHttpOnly(true);
        cookie.setSecure(cookieSecure);
        cookie.setPath("/");
        cookie.setMaxAge(0); // Delete cookie
        response.addCookie(cookie);
    }

    // ==================== REFRESH TOKEN MANAGEMENT ====================

    /**
     * Create and save refresh token to database
     * Used by both normal login and OAuth2 login
     */
    @Transactional
    public RefreshToken createRefreshToken(Long userId) {
        logger.info("🔄 Creating refresh token for user ID: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Revoke all existing refresh tokens for this user
        refreshTokenRepository.revokeAllUserTokens(user);

        // Generate new refresh token string
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                UserDetailsImpl.build(user), null, null);
        String tokenString = tokenProvider.generateRefreshToken(authentication);

        // Create and save refresh token entity
        RefreshToken refreshToken = RefreshToken.builder()
                .token(tokenString)
                .user(user)
                .expiryDate(LocalDateTime.now().plusSeconds(refreshExpirationMs / 1000))
                .revoked(false)
                .build();

        return refreshTokenRepository.save(refreshToken);
    }

    // ==================== REGISTRATION ====================

    @Transactional
    public MessageResponse registerUser(SignupRequest signupRequest) {
        logger.info("🔄 Processing user registration for: {}", signupRequest.getUsername());

        if (userRepository.existsByUsername(signupRequest.getUsername())) {
            logger.warn("❌ Username already exists: {}", signupRequest.getUsername());
            throw new BadRequestException("Username is already taken!");
        }

        if (userRepository.existsByEmail(signupRequest.getEmail())) {
            logger.warn("❌ Email already exists: {}", signupRequest.getEmail());
            throw new BadRequestException("Email is already in use!");
        }

        User user = User.builder()
                .username(signupRequest.getUsername())
                .email(signupRequest.getEmail())
                .password(passwordEncoder.encode(signupRequest.getPassword()))
                .isActive(true)
                .isEmailVerified(false)
                .provider(AuthProvider.LOCAL)
                .is2faEnabled(false)
                .build();

        Role studentRole = roleRepository.findByName(RoleName.ROLE_STUDENT)
                .orElseThrow(() -> new ResourceNotFoundException("Role STUDENT not found"));

        user.setRoles(new java.util.HashSet<>(Set.of(studentRole)));

        User savedUser = userRepository.save(user);
        logger.info("✅ User registered successfully: {} with role STUDENT", savedUser.getUsername());

        try {
            emailVerificationService.sendVerificationEmail(savedUser);
            logger.info("📧 Welcome + verification email sent to: {}", savedUser.getEmail());
        } catch (Exception e) {
            logger.error("❌ Failed to send verification email", e);
        }

        return MessageResponse.builder()
                .status(HttpStatus.CREATED.value())
                .success(true)
                .message(ResponseStatus.REGISTER_SUCCESS)
                .build();
    }

    // ==================== OAUTH2 ====================

    @Transactional
    public User processOAuth2User(String provider, OAuth2UserInfo oAuth2UserInfo) {
        logger.info("🔄 Processing OAuth2 user: {}", oAuth2UserInfo.getEmail());

        AuthProvider authProvider = AuthProvider.fromString(provider);

        Optional<User> userOptional = userRepository.findByProviderAndProviderUserId(
                authProvider,
                oAuth2UserInfo.getId());

        User user;

        if (userOptional.isPresent()) {
            user = userOptional.get();

            if (!user.getEmail().equals(oAuth2UserInfo.getEmail())) {
                logger.warn("⚠️ Email changed for user {} from {} to {}",
                        user.getUsername(),
                        user.getEmail(),
                        oAuth2UserInfo.getEmail());

                Optional<User> existingWithNewEmail = userRepository
                        .findByEmail(oAuth2UserInfo.getEmail());

                if (existingWithNewEmail.isPresent() &&
                        !existingWithNewEmail.get().getId().equals(user.getId())) {
                    throw new BadRequestException(
                            "Email " + oAuth2UserInfo.getEmail() +
                                    " is already registered with another account");
                }

                user.setEmail(oAuth2UserInfo.getEmail());
                user.setIsEmailVerified(true);
            }

            if (user.getProvider() != authProvider) {
                throw new BadRequestException(
                        "You're already signed up with " + user.getProvider() +
                                " account. Please use " + user.getProvider() + " login.");
            }

            return updateExistingUser(user, oAuth2UserInfo);

        } else {
            userOptional = userRepository.findByEmail(oAuth2UserInfo.getEmail());

            if (userOptional.isPresent()) {
                user = userOptional.get();

                if (user.getProvider() == AuthProvider.LOCAL) {
                    throw new BadRequestException(
                            "Email already registered. Please use email/password login.");
                }

                if (user.getProvider() != authProvider) {
                    throw new BadRequestException(
                            "You're already signed up with " + user.getProvider() +
                                    " account. Please use " + user.getProvider() + " login.");
                }

                if (user.getProviderUserId() == null) {
                    logger.info("📝 Migrating user - updating providerUserId");
                    user.setProviderUserId(oAuth2UserInfo.getId());
                    return updateExistingUser(user, oAuth2UserInfo);
                }

                throw new BadRequestException(
                        "Account configuration error. Please contact support.");
            }

            return registerNewUser(authProvider, oAuth2UserInfo);
        }
    }

    private User registerNewUser(AuthProvider provider, OAuth2UserInfo oAuth2UserInfo) {
        logger.info("📝 Registering new OAuth2 user: {}", oAuth2UserInfo.getEmail());

        User user = new User();

        user.setProvider(provider);
        user.setProviderUserId(oAuth2UserInfo.getId());
        user.setEmail(oAuth2UserInfo.getEmail());
        user.setIsEmailVerified(true);
        user.setAvatarUrl(oAuth2UserInfo.getImageUrl());

        String firstName = oAuth2UserInfo.getFirstName();
        String lastName = oAuth2UserInfo.getLastName();

        user.setFirstName(
                firstName != null && !firstName.isEmpty() ? firstName : oAuth2UserInfo.getEmail().split("@")[0]);
        user.setLastName(lastName != null ? lastName : "");

        String baseUsername = oAuth2UserInfo.getEmail().split("@")[0];
        String username = baseUsername;
        int counter = 1;

        while (userRepository.existsByUsername(username)) {
            username = baseUsername + counter;
            counter++;
        }
        user.setUsername(username);

        user.setPassword(null);
        user.setIsActive(true);

        Set<Role> roles = new HashSet<>();
        Role studentRole = roleRepository.findByName(RoleName.ROLE_STUDENT)
                .orElseThrow(() -> new ResourceNotFoundException("Role STUDENT not found"));
        roles.add(studentRole);
        user.setRoles(roles);

        User savedUser = userRepository.save(user);
        logger.info("✅ OAuth2 user registered successfully: {}", savedUser.getEmail());

        return savedUser;
    }

    private User updateExistingUser(User existingUser, OAuth2UserInfo oAuth2UserInfo) {
        logger.info("🔄 Updating existing OAuth2 user: {}", existingUser.getEmail());

        boolean updated = false;

        if (!Boolean.TRUE.equals(existingUser.getIsEmailVerified())) {
            existingUser.setIsEmailVerified(true);
            updated = true;
        }

        String newAvatarUrl = oAuth2UserInfo.getImageUrl();
        if (newAvatarUrl != null && !newAvatarUrl.equals(existingUser.getAvatarUrl())) {
            existingUser.setAvatarUrl(newAvatarUrl);
            updated = true;
        }

        String newFirstName = oAuth2UserInfo.getFirstName();
        String newLastName = oAuth2UserInfo.getLastName();

        if (newFirstName != null && !newFirstName.isEmpty() &&
                !newFirstName.equals(existingUser.getFirstName())) {
            existingUser.setFirstName(newFirstName);
            updated = true;
        }

        if (newLastName != null && !newLastName.equals(existingUser.getLastName())) {
            existingUser.setLastName(newLastName);
            updated = true;
        }

        if (updated) {
            existingUser = userRepository.save(existingUser);
            logger.info("✅ OAuth2 user updated: {}", existingUser.getEmail());
        } else {
            logger.info("ℹ️ No changes for OAuth2 user: {}", existingUser.getEmail());
        }

        return existingUser;
    }
}
