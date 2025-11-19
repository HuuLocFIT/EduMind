package com.edumind.auth.service;

import com.edumind.auth.dto.*;
import com.edumind.auth.entity.RefreshToken;
import com.edumind.auth.entity.Role;
import com.edumind.auth.entity.RoleName;
import com.edumind.auth.entity.User;
import com.edumind.auth.repository.RefreshTokenRepository;
import com.edumind.auth.repository.RoleRepository;
import com.edumind.auth.repository.UserRepository;
import com.edumind.auth.security.JwtTokenProvider;
import com.edumind.auth.security.UserDetailsImpl;
import com.edumind.common.constants.ResponseStatus;
import com.edumind.common.exception.BadRequestException;
import com.edumind.common.exception.ResourceNotFoundException;
import com.edumind.common.exception.TokenRefreshException;
import com.edumind.common.response.MessageResponse;
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
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AuthService {
    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

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

    /**
     * Constructor injection with @Lazy to break circular dependency
     */
    @Autowired
    public AuthService(@Lazy AuthenticationManager authenticationManager) {
        this.authenticationManager = authenticationManager;
    }

    /**
     * Register new STUDENT (public signup)
     */
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
                .firstName(signupRequest.getFirstName())
                .lastName(signupRequest.getLastName())
                .phoneNumber(signupRequest.getPhoneNumber())
                .isActive(true)
                .isEmailVerified(false)
                .provider("LOCAL")
                .is2faEnabled(false)
                .build();

        Role studentRole = roleRepository.findByName(RoleName.ROLE_STUDENT)
                .orElseThrow(() -> new ResourceNotFoundException("Role STUDENT not found"));

        user.setRoles(Set.of(studentRole));

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

    /**
     * Authenticate user (Phase 3: với 2FA check)
     * Returns different response based on 2FA status
     */
    @Transactional
    public Object authenticateUser(LoginRequest loginRequest) {
        logger.info("🔐 Authenticating user: {}", loginRequest.getUsernameOrEmail());

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getUsernameOrEmail(),
                        loginRequest.getPassword()
                )
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Phase 3: Check if 2FA is enabled
        if (Boolean.TRUE.equals(user.getIs2faEnabled())) {
            logger.info("🔐 2FA required for user: {}", user.getEmail());

            // Return 2FA required response - DON'T generate tokens yet
            return new TwoFactorRequiredResponse(
                    user.getEmail(),
                    "Two-factor authentication required. Please provide your 2FA code."
            );
        }

        // No 2FA - proceed with normal token generation
        return generateAuthResponse(authentication, user);
    }

    /**
     * Phase 3: Verify 2FA code and complete login
     */
    @Transactional
    public JwtResponse verify2FAAndLogin(TwoFactorLoginRequest request) {
        logger.info("🔐 Verifying 2FA for user: {}", request.getUsernameOrEmail());

        // Find user by username or email
        User user = userRepository.findByUsername(request.getUsernameOrEmail())
                .or(() -> userRepository.findByEmail(request.getUsernameOrEmail()))
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Verify 2FA code
        boolean isValid = twoFactorAuthService.verifyCodeForLogin(user, request.getCode());

        if (!isValid) {
            logger.warn("❌ Invalid 2FA code for user: {}", user.getEmail());
            throw new BadRequestException("Invalid 2FA code");
        }

        logger.info("✅ 2FA verified successfully for user: {}", user.getEmail());

        // Create authentication
        UserDetailsImpl userDetails = UserDetailsImpl.build(user);
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities());

        SecurityContextHolder.getContext().setAuthentication(authentication);

        // Generate tokens
        return generateAuthResponse(authentication, user);
    }

    /**
     * Helper method to generate authentication response with tokens
     * Used by both normal login and 2FA login
     */
    private JwtResponse generateAuthResponse(Authentication authentication, User user) {
        // Generate tokens
        String accessToken = tokenProvider.generateAccessToken(authentication);
        String refreshToken = tokenProvider.generateRefreshToken(authentication);

        // Revoke old refresh tokens
        refreshTokenRepository.revokeAllUserTokens(user);

        // Create new refresh token
        RefreshToken refreshTokenEntity = RefreshToken.builder()
                .token(refreshToken)
                .user(user)
                .expiryDate(LocalDateTime.now().plusSeconds(refreshExpirationMs / 1000))
                .revoked(false)
                .build();
        refreshTokenRepository.save(refreshTokenEntity);

        // Update last login
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Set<String> roles = userDetails.getAuthorities().stream()
                .map(item -> item.getAuthority())
                .collect(Collectors.toSet());

        logger.info("✅ User authenticated successfully: {}", userDetails.getUsername());

        return JwtResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .userId(userDetails.getId())
                .username(userDetails.getUsername())
                .email(userDetails.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .roles(roles)
                .build();
    }

    /**
     * Phase 4: Process OAuth2 user (called by CustomOAuth2UserService)
     * Creates new user or updates existing user
     */
    @Transactional
    public User processOAuth2User(String provider, OAuth2UserInfo oAuth2UserInfo) {
        logger.info("🔄 Processing OAuth2 user from {}: {}", provider, oAuth2UserInfo.getEmail());

        // Check if user exists by email
        User existingUser = userRepository.findByEmail(oAuth2UserInfo.getEmail())
                .orElse(null);

        if (existingUser != null) {
            // User exists - check if provider matches
            if (!provider.equals(existingUser.getProvider())) {
                logger.warn("⚠️ User {} already registered with {} provider",
                        existingUser.getEmail(), existingUser.getProvider());
                throw new BadRequestException(
                        "Email already registered with " + existingUser.getProvider() +
                                " provider. Please use " + existingUser.getProvider() + " login.");
            }

            // Update OAuth2 info
            existingUser.setProviderUserId(oAuth2UserInfo.getId());
            existingUser.setAvatarUrl(oAuth2UserInfo.getImageUrl());
            existingUser.setFirstName(oAuth2UserInfo.getFirstName());
            existingUser.setLastName(oAuth2UserInfo.getLastName());
            existingUser.setLastLoginAt(LocalDateTime.now());

            logger.info("✅ Updated existing OAuth2 user: {}", existingUser.getEmail());
            return userRepository.save(existingUser);
        }

        // Create new OAuth2 user
        User newUser = User.builder()
                .username(generateUniqueUsername(oAuth2UserInfo.getEmail()))
                .email(oAuth2UserInfo.getEmail())
                .firstName(oAuth2UserInfo.getFirstName())
                .lastName(oAuth2UserInfo.getLastName())
                .password(null) // No password for OAuth2 users
                .provider(provider)
                .providerUserId(oAuth2UserInfo.getId())
                .avatarUrl(oAuth2UserInfo.getImageUrl())
                .isActive(true)
                .isEmailVerified(true) // OAuth2 emails are pre-verified
                .is2faEnabled(false)
                .build();

        // Assign STUDENT role by default
        Role studentRole = roleRepository.findByName(RoleName.ROLE_STUDENT)
                .orElseThrow(() -> new ResourceNotFoundException("Role STUDENT not found"));

        newUser.setRoles(Set.of(studentRole));

        User savedUser = userRepository.save(newUser);
        logger.info("✅ Created new OAuth2 user: {} from {}", savedUser.getEmail(), provider);

        return savedUser;
    }

    /**
     * Generate unique username from email
     */
    private String generateUniqueUsername(String email) {
        String baseUsername = email.split("@")[0];
        String username = baseUsername;
        int counter = 1;

        while (userRepository.existsByUsername(username)) {
            username = baseUsername + counter;
            counter++;
        }

        return username;
    }

    /**
     * Refresh access token using refresh token
     */
    @Transactional
    public JwtResponse refreshToken(RefreshTokenRequest request) {
        logger.info("🔄 Refreshing token");

        String requestRefreshToken = request.getRefreshToken();

        RefreshToken refreshToken = refreshTokenRepository.findByToken(requestRefreshToken)
                .orElseThrow(() -> new TokenRefreshException("Refresh token not found!"));

        if (refreshToken.getRevoked()) {
            logger.error("❌ Refresh token is revoked");
            throw new TokenRefreshException("Refresh token is revoked!");
        }

        if (refreshToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            refreshTokenRepository.delete(refreshToken);
            logger.error("❌ Refresh token is expired");
            throw new TokenRefreshException("Refresh token is expired!");
        }

        User user = refreshToken.getUser();
        UserDetailsImpl userDetails = UserDetailsImpl.build(user);
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities());

        String newAccessToken = tokenProvider.generateAccessToken(authentication);

        Set<String> roles = userDetails.getAuthorities().stream()
                .map(item -> item.getAuthority())
                .collect(Collectors.toSet());

        logger.info("✅ Token refreshed successfully for user: {}", user.getUsername());

        return JwtResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(requestRefreshToken)
                .tokenType("Bearer")
                .userId(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .roles(roles)
                .build();
    }

    /**
     * Logout user - revoke all refresh tokens
     */
    @Transactional
    public MessageResponse logout() {
        logger.info("👋 User logging out");

        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getPrincipal();

        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        refreshTokenRepository.revokeAllUserTokens(user);

        logger.info("✅ User logged out successfully: {}", user.getUsername());

        return MessageResponse.builder()
                .status(HttpStatus.OK.value())
                .success(true)
                .message(ResponseStatus.LOGOUT_SUCCESS)
                .build();
    }
}