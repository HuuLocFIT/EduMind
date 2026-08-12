package com.edumind.auth.service;

import com.edumind.auth.dto.response.BackupCodesResponse;
import com.edumind.auth.dto.response.TwoFactorSetupResponse;
import com.edumind.auth.dto.response.TwoFactorStatusResponse;
import com.edumind.auth.entity.User;
import com.edumind.auth.repository.UserRepository;
import com.edumind.common.exception.BadRequestException;
import com.edumind.common.exception.ResourceNotFoundException;
import com.edumind.common.security.EncryptionService;
import com.edumind.common.security.RateLimitService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import dev.samstevens.totp.code.CodeVerifier;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.code.DefaultCodeVerifier;
import dev.samstevens.totp.code.HashingAlgorithm;
import dev.samstevens.totp.qr.QrData;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.security.SecureRandom;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TwoFactorAuthService {
    private static final Logger logger = LoggerFactory.getLogger(TwoFactorAuthService.class);

    private static final String ISSUER = "EduMind";
    private static final int BACKUP_CODES_COUNT = 5;
    private static final int BACKUP_CODE_LENGTH = 12;
    private static final String ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EncryptionService encryptionService;

    @Autowired
    private RateLimitService rateLimitService;

    private final DefaultSecretGenerator secretGenerator = new DefaultSecretGenerator();
    private final CodeVerifier verifier = new DefaultCodeVerifier(
            new DefaultCodeGenerator(),
            new SystemTimeProvider()
    );
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public TwoFactorSetupResponse setup2FA() {
        logger.info("🔐 Setting up 2FA");

        User user = getCurrentUser();

        if (Boolean.TRUE.equals(user.getIs2faEnabled())) {
            throw new BadRequestException("2FA is already enabled");
        }

        String secret = secretGenerator.generate();
        logger.info("✅ TOTP secret generated");

        List<String> backupCodes = generateAlphanumericBackupCodes();
        logger.info("✅ Backup codes generated (alphanumeric)");

        String backupCodesJson = convertBackupCodesToJson(backupCodes);
        user.setBackupCodes(backupCodesJson);

        String encryptedSecret = encryptionService.encrypt(secret);
        user.setTwoFactorSecret(encryptedSecret);

        userRepository.save(user);
        logger.info("✅ Secret (encrypted) and backup codes saved to DB");

        String qrCodeUrl = generateQRCodeDataUrl(user.getEmail(), secret);

        return new TwoFactorSetupResponse(
                secret,
                qrCodeUrl,
                secret,
                backupCodes
        );
    }

    @Transactional
    public TwoFactorStatusResponse verify2FA(String code) {
        logger.info("🔐 Verifying 2FA code");

        User user = getCurrentUser();

        rateLimitService.checkRateLimit(user.getId());

        if (Boolean.TRUE.equals(user.getIs2faEnabled())) {
            throw new BadRequestException("2FA is already enabled");
        }

        String encryptedSecret = user.getTwoFactorSecret();
        if (encryptedSecret == null || encryptedSecret.isEmpty()) {
            throw new BadRequestException("2FA setup has not been initiated");
        }
        String secret = encryptionService.decrypt(encryptedSecret);

        // Verify code against the secret stored in the database
        if (!verifyCode(secret, code)) {
            rateLimitService.recordFailedAttempt(user.getId());
            logger.error("❌ Invalid TOTP code");
            throw new BadRequestException("Invalid verification code");
        }

        rateLimitService.recordSuccessfulAttempt(user.getId());

        user.setIs2faEnabled(true);
        userRepository.save(user);

        logger.info("✅ Two-factor authentication enabled for user: {}", user.getEmail());

        int backupCodesRemaining = countRemainingBackupCodes(user);
        return TwoFactorStatusResponse.enabled(backupCodesRemaining);
    }

    public boolean verifyCodeForLogin(User user, String code) {
        logger.info("🔐 Verifying 2FA code for login");

        rateLimitService.checkRateLimit(user.getId());

        if (!Boolean.TRUE.equals(user.getIs2faEnabled())) {
            return false;
        }

        // Check if it's a backup code
        if (code.length() == BACKUP_CODE_LENGTH) {
            boolean valid = verifyAndConsumeBackupCode(user, code);
            if (valid) {
                rateLimitService.recordSuccessfulAttempt(user.getId());
                return true;
            }
            rateLimitService.recordFailedAttempt(user.getId());
            return false;
        }

        String encryptedSecret = user.getTwoFactorSecret();
        String secret = encryptionService.decrypt(encryptedSecret);

        boolean valid = verifyCode(secret, code);

        if (valid) {
            rateLimitService.recordSuccessfulAttempt(user.getId());
        } else {
            rateLimitService.recordFailedAttempt(user.getId());
        }

        return valid;
    }

    @Transactional
    public TwoFactorStatusResponse disable2FA(String password, String code) {
        logger.info("🔐 Disabling 2FA");

        User user = getCurrentUser();

        if (!Boolean.TRUE.equals(user.getIs2faEnabled())) {
            throw new BadRequestException("2FA is not enabled");
        }

        if (user.getPassword() == null || user.getPassword().isEmpty()) {
            // OAuth2 user - verify 2FA code ONLY
            logger.info("OAuth2 user disabling 2FA (no password verification)");

            if (code == null || code.isEmpty()) {
                throw new BadRequestException(
                        "2FA code is required to disable 2FA for OAuth2 accounts"
                );
            }

            rateLimitService.checkRateLimit(user.getId());

            boolean verified = false;

            if (code.length() == 6 && code.matches("^[0-9]{6}$")) {
                // TOTP code
                String encryptedSecret = user.getTwoFactorSecret();
                String secret = encryptionService.decrypt(encryptedSecret);
                verified = verifyCode(secret, code);
            } else if (code.length() == BACKUP_CODE_LENGTH) {
                // Backup code
                verified = checkBackupCode(user, code);
            }

            if (!verified) {
                rateLimitService.recordFailedAttempt(user.getId());
                logger.error("❌ Invalid 2FA code");
                throw new BadRequestException("Invalid 2FA code");
            }

            rateLimitService.recordSuccessfulAttempt(user.getId());

        } else {
            // Local user - verify password (REQUIRED)
            if (password == null || password.isEmpty()) {
                throw new BadRequestException("Password is required");
            }

            if (!passwordEncoder.matches(password, user.getPassword())) {
                logger.error("❌ Invalid password");
                throw new BadRequestException("Invalid password");
            }

            // Code is OPTIONAL for local users
            if (code != null && !code.isEmpty()) {
                rateLimitService.checkRateLimit(user.getId());

                boolean verified = false;

                if (code.length() == 6 && code.matches("^[0-9]{6}$")) {
                    String encryptedSecret = user.getTwoFactorSecret();
                    String secret = encryptionService.decrypt(encryptedSecret);
                    verified = verifyCode(secret, code);
                } else if (code.length() == BACKUP_CODE_LENGTH) {
                    verified = checkBackupCode(user, code);
                }

                if (!verified) {
                    rateLimitService.recordFailedAttempt(user.getId());
                    logger.error("❌ Invalid 2FA code");
                    throw new BadRequestException("Invalid 2FA code");
                }

                rateLimitService.recordSuccessfulAttempt(user.getId());
            }
        }

        // Disable 2FA
        user.setIs2faEnabled(false);
        user.setTwoFactorSecret(null);
        user.setBackupCodes(null);
        userRepository.save(user);

        logger.info("✅ 2FA disabled successfully for user: {}", user.getEmail());

        return TwoFactorStatusResponse.disabled();
    }

    /**
     * Get 2FA status
     */
    public TwoFactorStatusResponse get2FAStatus() {
        User user = getCurrentUser();

        if (Boolean.TRUE.equals(user.getIs2faEnabled())) {
            int backupCodesRemaining = countRemainingBackupCodes(user);
            return TwoFactorStatusResponse.enabled(backupCodesRemaining);
        } else {
            return TwoFactorStatusResponse.disabled();
        }
    }

    @Transactional
    public BackupCodesResponse regenerateBackupCodes(String password) {
        logger.info("🔐 Regenerating backup codes");

        User user = getCurrentUser();

        if (!Boolean.TRUE.equals(user.getIs2faEnabled())) {
            throw new BadRequestException("2FA is not enabled");
        }

        // Verify password
        if (!passwordEncoder.matches(password, user.getPassword())) {
            logger.error("❌ Invalid password");
            throw new BadRequestException("Invalid password");
        }

        List<String> backupCodes = generateAlphanumericBackupCodes();
        String backupCodesJson = convertBackupCodesToJson(backupCodes);

        user.setBackupCodes(backupCodesJson);
        userRepository.save(user);

        logger.info("✅ Backup codes regenerated for user: {}", user.getEmail());

        return new BackupCodesResponse(backupCodes);
    }

    // ============================================
    // PRIVATE HELPER METHODS
    // ============================================

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private boolean verifyCode(String secret, String code) {
        return verifier.isValidCode(secret, code);
    }

    private String generateQRCodeDataUrl(String email, String secret) {
        try {
            QrData qrData = new QrData.Builder()
                    .label(email)
                    .secret(secret)
                    .issuer(ISSUER)
                    .algorithm(HashingAlgorithm.SHA1)
                    .digits(6)
                    .period(30)
                    .build();

            // Use the proper URI from QrData
            String otpAuthUrl = qrData.getUri();

            // Generate QR code image
            BitMatrix bitMatrix = new MultiFormatWriter().encode(
                    otpAuthUrl,
                    BarcodeFormat.QR_CODE,
                    300,
                    300
            );

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);
            byte[] qrCodeBytes = outputStream.toByteArray();

            // Convert to base64 data URL
            String base64Image = Base64.getEncoder().encodeToString(qrCodeBytes);
            return "data:image/png;base64," + base64Image;

        } catch (WriterException | IOException e) {
            logger.error("❌ Failed to generate QR code", e);
            throw new RuntimeException("Failed to generate QR code", e);
        }
    }

    private List<String> generateAlphanumericBackupCodes() {
        SecureRandom random = new SecureRandom();
        List<String> codes = new ArrayList<>();

        for (int i = 0; i < BACKUP_CODES_COUNT; i++) {
            StringBuilder code = new StringBuilder(BACKUP_CODE_LENGTH);
            for (int j = 0; j < BACKUP_CODE_LENGTH; j++) {
                int index = random.nextInt(ALPHANUMERIC.length());
                code.append(ALPHANUMERIC.charAt(index));
            }
            codes.add(code.toString());
        }

        return codes;
    }

    private String convertBackupCodesToJson(List<String> backupCodes) {
        try {
            // Hash each backup code before storing
            List<String> hashedCodes = backupCodes.stream()
                    .map(passwordEncoder::encode)
                    .collect(Collectors.toList());

            return objectMapper.writeValueAsString(hashedCodes);
        } catch (Exception e) {
            logger.error("❌ Failed to convert backup codes to JSON", e);
            throw new RuntimeException("Failed to process backup codes", e);
        }
    }

    private String convertBackupCodesToJsonFromHashed(List<String> hashedCodes) {
        try {
            return objectMapper.writeValueAsString(hashedCodes);
        } catch (Exception e) {
            logger.error("❌ Failed to convert hashed codes to JSON", e);
            throw new RuntimeException("Failed to process backup codes", e);
        }
    }

    private List<String> parseBackupCodesFromJson(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            logger.error("❌ Failed to parse backup codes from JSON", e);
            return new ArrayList<>();
        }
    }

    @Transactional
    private boolean verifyAndConsumeBackupCode(User user, String code) {
        String backupCodesJson = user.getBackupCodes();
        if (backupCodesJson == null || backupCodesJson.isEmpty()) {
            return false;
        }

        List<String> hashedCodes = parseBackupCodesFromJson(backupCodesJson);

        for (Iterator<String> iterator = hashedCodes.iterator(); iterator.hasNext();) {
            String hashedCode = iterator.next();
            if (passwordEncoder.matches(code, hashedCode)) {
                // Remove used code
                iterator.remove();
                user.setBackupCodes(convertBackupCodesToJsonFromHashed(hashedCodes));
                userRepository.save(user);
                logger.info("✅ Backup code used for user: {}", user.getEmail());
                return true;
            }
        }

        return false;
    }

    private boolean checkBackupCode(User user, String code) {
        String backupCodesJson = user.getBackupCodes();
        if (backupCodesJson == null || backupCodesJson.isEmpty()) {
            return false;
        }

        List<String> hashedCodes = parseBackupCodesFromJson(backupCodesJson);

        for (String hashedCode : hashedCodes) {
            if (passwordEncoder.matches(code, hashedCode)) {
                return true;
            }
        }

        return false;
    }

    private int countRemainingBackupCodes(User user) {
        String backupCodesJson = user.getBackupCodes();
        if (backupCodesJson == null || backupCodesJson.isEmpty()) {
            return 0;
        }

        List<String> codes = parseBackupCodesFromJson(backupCodesJson);
        return codes.size();
    }
}