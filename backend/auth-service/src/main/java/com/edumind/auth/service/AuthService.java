package com.edumind.auth.service;

import com.edumind.auth.dto.*;
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
import java.util.Optional;
import java.util.Set;
import java.util.HashSet;

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
                .provider(AuthProvider.LOCAL)
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
        RefreshToken refreshTokenEntity = createRefreshToken(user.getId());

        // Update last login
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        logger.info("✅ User authenticated successfully: {}", userDetails.getUsername());

        UserResponse userResponse = UserMapper.toUserResponse(user);

        return JwtResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshTokenEntity.getToken())
                .tokenType("Bearer")
                .user(userResponse)
                .build();
    }

    @Transactional
    public User processOAuth2User(String provider, OAuth2UserInfo oAuth2UserInfo) {
        logger.info("🔄 Processing OAuth2 user: {}", oAuth2UserInfo.getEmail());

        // Convert string to enum
        AuthProvider authProvider = AuthProvider.fromString(provider);

        Optional<User> userOptional = userRepository.findByProviderAndProviderUserId(
                authProvider,
                oAuth2UserInfo.getId() // Use getId() instead of getProviderId()
        );

        User user;

        if (userOptional.isPresent()) {
            // Existing user found by providerUserId
            user = userOptional.get();

            if (!user.getEmail().equals(oAuth2UserInfo.getEmail())) {
                logger.warn("⚠️ Email changed for user {} from {} to {}",
                        user.getUsername(),
                        user.getEmail(),
                        oAuth2UserInfo.getEmail()
                );

                // Check if new email already exists with different account
                Optional<User> existingWithNewEmail = userRepository
                        .findByEmail(oAuth2UserInfo.getEmail());

                if (existingWithNewEmail.isPresent() &&
                        !existingWithNewEmail.get().getId().equals(user.getId())) {
                    throw new BadRequestException(
                            "Email " + oAuth2UserInfo.getEmail() +
                                    " is already registered with another account"
                    );
                }

                user.setEmail(oAuth2UserInfo.getEmail());
            }

            // Check provider consistency
            if (user.getProvider() != authProvider) {
                throw new BadRequestException(
                        "You're already signed up with " + user.getProvider() +
                                " account. Please use " + user.getProvider() + " login."
                );
            }

            return updateExistingUser(user, oAuth2UserInfo);

        } else {
            userOptional = userRepository.findByEmail(oAuth2UserInfo.getEmail());

            if (userOptional.isPresent()) {
                user = userOptional.get();

                // Check if it's a local account
                if (user.getProvider() == AuthProvider.LOCAL) {
                    throw new BadRequestException(
                            "Email already registered. Please use email/password login."
                    );
                }

                // Check if it's different OAuth2 provider
                if (user.getProvider() != authProvider) {
                    throw new BadRequestException(
                            "You're already signed up with " + user.getProvider() +
                                    " account. Please use " + user.getProvider() + " login."
                    );
                }

                // Migration case - update providerUserId if missing
                if (user.getProviderUserId() == null) {
                    logger.info("📝 Migrating user - updating providerUserId");
                    user.setProviderUserId(oAuth2UserInfo.getId());
                    return updateExistingUser(user, oAuth2UserInfo);
                }

                // Should not reach here
                throw new BadRequestException(
                        "Account configuration error. Please contact support."
                );
            }

            // New user - register
            return registerNewUser(authProvider, oAuth2UserInfo);
        }
    }

    /**
     * Register new OAuth2 user
     */
    private User registerNewUser(AuthProvider provider, OAuth2UserInfo oAuth2UserInfo) {
        logger.info("📝 Registering new OAuth2 user: {}", oAuth2UserInfo.getEmail());

        User user = new User();

        // Provider info
        user.setProvider(provider);
        user.setProviderUserId(oAuth2UserInfo.getId());

        // Email (verified by OAuth2 provider)
        user.setEmail(oAuth2UserInfo.getEmail());
        user.setIsEmailVerified(true);

        // Avatar
        user.setAvatarUrl(oAuth2UserInfo.getImageUrl());

        // Name - use getFirstName() and getLastName()
        String firstName = oAuth2UserInfo.getFirstName();
        String lastName = oAuth2UserInfo.getLastName();

        user.setFirstName(firstName != null && !firstName.isEmpty() ?
                firstName : oAuth2UserInfo.getEmail().split("@")[0]);
        user.setLastName(lastName != null ? lastName : "");

        // Generate unique username from email
        String baseUsername = oAuth2UserInfo.getEmail().split("@")[0];
        String username = baseUsername;
        int counter = 1;

        while (userRepository.existsByUsername(username)) {
            username = baseUsername + counter;
            counter++;
        }
        user.setUsername(username);

        // No password for OAuth2 users
        user.setPassword(null);

        // Active by default
        user.setIsActive(true);

        // Set default role: STUDENT
        Set<Role> roles = new HashSet<>();
        Role studentRole = roleRepository.findByName(RoleName.ROLE_STUDENT)
                .orElseThrow(() -> new ResourceNotFoundException("Role STUDENT not found"));
        roles.add(studentRole);
        user.setRoles(roles);

        User savedUser = userRepository.save(user);
        logger.info("✅ OAuth2 user registered successfully: {}", savedUser.getEmail());

        return savedUser;
    }

    /**
     * Update existing OAuth2 user
     */
    private User updateExistingUser(User existingUser, OAuth2UserInfo oAuth2UserInfo) {
        logger.info("🔄 Updating existing OAuth2 user: {}", existingUser.getEmail());

        boolean updated = false;

        // Update avatar if changed
        String newAvatarUrl = oAuth2UserInfo.getImageUrl();
        if (newAvatarUrl != null && !newAvatarUrl.equals(existingUser.getAvatarUrl())) {
            existingUser.setAvatarUrl(newAvatarUrl);
            updated = true;
        }

        // Update name if changed - use getFirstName() and getLastName()
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

        logger.info("✅ Token refreshed successfully for user: {}", user.getUsername());
        UserResponse userResponse = UserMapper.toUserResponse(user);

        return JwtResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(requestRefreshToken)
                .tokenType("Bearer")
                .user(userResponse)
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