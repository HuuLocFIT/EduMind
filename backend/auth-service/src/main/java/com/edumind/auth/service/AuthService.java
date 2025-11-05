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
import com.edumind.common.exception.BadRequestException;
import com.edumind.common.exception.ResourceNotFoundException;
import com.edumind.common.exception.TokenRefreshException;
import com.edumind.common.response.MessageResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    @Autowired
    private AuthenticationManager authenticationManager;

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

    @Value("${jwt.refresh-expiration}")
    private long refreshExpirationMs;

    @Transactional
    public MessageResponse registerUser(SignupRequest signUpRequest) {
        logger.info("📝 Registering new user: {}", signUpRequest.getUsername());

        // Check if username exists
        if (userRepository.existsByUsername(signUpRequest.getUsername())) {
            logger.error("❌ Username already taken: {}", signUpRequest.getUsername());
            throw new BadRequestException("Username is already taken!");
        }

        // Check if email exists
        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            logger.error("❌ Email already in use: {}", signUpRequest.getEmail());
            throw new BadRequestException("Email is already in use!");
        }

        // Create new user
        User user = User.builder()
                .username(signUpRequest.getUsername())
                .email(signUpRequest.getEmail())
                .password(passwordEncoder.encode(signUpRequest.getPassword()))
                .firstName(signUpRequest.getFirstName())
                .lastName(signUpRequest.getLastName())
                .phoneNumber(signUpRequest.getPhoneNumber())
                .isActive(true)
                .isEmailVerified(false)
                .build();

        // Set roles
        Set<Role> roles = new HashSet<>();
        if (signUpRequest.getRoles() == null || signUpRequest.getRoles().isEmpty()) {
            // Default role is STUDENT
            Role studentRole = roleRepository.findByName(RoleName.ROLE_STUDENT)
                    .orElseThrow(() -> new ResourceNotFoundException("Role STUDENT not found"));
            roles.add(studentRole);
        } else {
            for (String roleName : signUpRequest.getRoles()) {
                try {
                    RoleName roleEnum = RoleName.valueOf(roleName);
                    Role role = roleRepository.findByName(roleEnum)
                            .orElseThrow(() -> new ResourceNotFoundException("Role " + roleName + " not found"));
                    roles.add(role);
                } catch (IllegalArgumentException e) {
                    logger.error("❌ Invalid role: {}", roleName);
                    throw new BadRequestException("Invalid role: " + roleName);
                }
            }
        }

        user.setRoles(roles);
        userRepository.save(user);

        logger.info("✅ User registered successfully: {}", user.getUsername());
        return MessageResponse.created("User registered successfully!");
    }

    @Transactional
    public JwtResponse authenticateUser(LoginRequest loginRequest) {
        logger.info("🔐 Authenticating user: {}", loginRequest.getUsernameOrEmail());

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getUsernameOrEmail(),
                        loginRequest.getPassword()
                )
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);

        // Generate tokens
        String accessToken = tokenProvider.generateAccessToken(authentication);
        String refreshToken = tokenProvider.generateRefreshToken(authentication);

        // Save refresh token
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

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
                .roles(roles)
                .build();
    }

    @Transactional
    public JwtResponse refreshToken(RefreshTokenRequest request) {
        logger.info("🔄 Refreshing token");

        String requestRefreshToken = request.getRefreshToken();

        // Validate refresh token
        RefreshToken refreshToken = refreshTokenRepository.findByToken(requestRefreshToken)
                .orElseThrow(() -> new TokenRefreshException("Refresh token not found!"));

        // Check if revoked
        if (refreshToken.getRevoked()) {
            logger.error("❌ Refresh token is revoked");
            throw new TokenRefreshException("Refresh token is revoked!");
        }

        // Check if expired
        if (refreshToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            refreshTokenRepository.delete(refreshToken);
            logger.error("❌ Refresh token is expired");
            throw new TokenRefreshException("Refresh token is expired!");
        }

        // Generate new access token
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
                .roles(roles)
                .build();
    }

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
        return MessageResponse.success("Logged out successfully!");
    }
}
