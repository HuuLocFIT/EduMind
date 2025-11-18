package com.edumind.auth.service;

import com.edumind.auth.dto.BackupCodesResponse;
import com.edumind.auth.dto.TwoFactorSetupResponse;
import com.edumind.auth.dto.TwoFactorStatusResponse;
import com.edumind.auth.entity.User;
import com.edumind.auth.repository.UserRepository;
import com.edumind.common.exception.BadRequestException;
import com.edumind.common.exception.ResourceNotFoundException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import dev.samstevens.totp.code.*;
import dev.samstevens.totp.qr.QrData;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.secret.SecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import dev.samstevens.totp.time.TimeProvider;
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
    private static final int BACKUP_CODES_COUNT = 10;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private final SecretGenerator secretGenerator = new DefaultSecretGenerator();
    private final TimeProvider timeProvider = new SystemTimeProvider();
    private final CodeGenerator codeGenerator = new DefaultCodeGenerator();
    private final CodeVerifier verifier = new DefaultCodeVerifier(codeGenerator, timeProvider);
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Generate 2FA setup (secret + QR code)
     */
    @Transactional
    public TwoFactorSetupResponse setup2FA() {
        logger.info("🔐 Setting up 2FA for user");

        User user = getCurrentUser();

        if (Boolean.TRUE.equals(user.getIs2faEnabled())) {
            throw new BadRequestException("2FA is already enabled. Disable it first to re-setup.");
        }

        // Generate secret
        String secret = secretGenerator.generate();

        // Generate QR code
        String qrCodeUrl = generateQRCodeDataUrl(user.getEmail(), secret);

        // Generate backup codes
        List<String> backupCodes = generateBackupCodes();

        logger.info("✅ 2FA setup generated for user: {}", user.getEmail());

        return new TwoFactorSetupResponse(
                secret,
                qrCodeUrl,
                secret, // Manual entry key is the same as secret
                backupCodes
        );
    }

    /**
     * Verify TOTP code and enable 2FA
     */
    @Transactional
    public TwoFactorStatusResponse verify2FA(String code, String secret) {
        logger.info("🔐 Verifying 2FA code");

        User user = getCurrentUser();

        if (Boolean.TRUE.equals(user.getIs2faEnabled())) {
            throw new BadRequestException("2FA is already enabled");
        }

        // Verify the code
        if (!verifyCode(secret, code)) {
            logger.error("❌ Invalid 2FA code");
            throw new BadRequestException("Invalid verification code");
        }

        // Generate and store backup codes
        List<String> backupCodes = generateBackupCodes();
        String backupCodesJson = convertBackupCodesToJson(backupCodes);

        // Enable 2FA
        user.setIs2faEnabled(true);
        user.setTwoFactorSecret(secret);
        user.setBackupCodes(backupCodesJson);
        userRepository.save(user);

        logger.info("✅ 2FA enabled successfully for user: {}", user.getEmail());

        return TwoFactorStatusResponse.enabled(backupCodes.size());
    }

    /**
     * Verify 2FA code (used by AuthService during login)
     */
    public boolean verifyCode(User user, String code) {
        logger.info("🔐 Verifying 2FA code for login");

        if (!Boolean.TRUE.equals(user.getIs2faEnabled())) {
            throw new BadRequestException("2FA is not enabled for this user");
        }

        // Try TOTP code first
        if (verifyCode(user.getTwoFactorSecret(), code)) {
            return true;
        }

        // Try backup code
        return verifyAndConsumeBackupCode(user, code);
    }

    /**
     * Verify 2FA code for login
     */
    public boolean verify2FAForLogin(User user, String code, boolean useBackupCode) {
        logger.info("🔐 Verifying 2FA for login: {}", user.getEmail());

        if (!Boolean.TRUE.equals(user.getIs2faEnabled())) {
            throw new BadRequestException("2FA is not enabled for this user");
        }

        if (useBackupCode) {
            return verifyAndConsumeBackupCode(user, code);
        } else {
            return verifyCode(user.getTwoFactorSecret(), code);
        }
    }

    /**
     * Disable 2FA
     */
    @Transactional
    public TwoFactorStatusResponse disable2FA(String password, String code) {
        logger.info("🔐 Disabling 2FA");

        User user = getCurrentUser();

        if (!Boolean.TRUE.equals(user.getIs2faEnabled())) {
            throw new BadRequestException("2FA is not enabled");
        }

        // Verify password
        if (!passwordEncoder.matches(password, user.getPassword())) {
            logger.error("❌ Invalid password");
            throw new BadRequestException("Invalid password");
        }

        // Verify 2FA code or backup code
        boolean verified = false;
        if (code != null && !code.isEmpty()) {
            if (code.length() == 6 && code.matches("^[0-9]{6}$")) {
                // TOTP code
                verified = verifyCode(user.getTwoFactorSecret(), code);
            } else {
                // Backup code
                verified = checkBackupCode(user, code);
            }
        }

        if (!verified) {
            logger.error("❌ Invalid 2FA code");
            throw new BadRequestException("Invalid 2FA code");
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

    /**
     * Regenerate backup codes
     */
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

        // Generate new backup codes
        List<String> backupCodes = generateBackupCodes();
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
            QrData data = new QrData.Builder()
                    .label(email)
                    .secret(secret)
                    .issuer(ISSUER)
                    .algorithm(HashingAlgorithm.SHA1)
                    .digits(6)
                    .period(30)
                    .build();

            String qrCodeText = String.format(
                    "otpauth://totp/%s:%s?secret=%s&issuer=%s",
                    ISSUER, email, secret, ISSUER
            );

            // Generate QR code using ZXing
            BitMatrix bitMatrix = new MultiFormatWriter().encode(
                    qrCodeText,
                    BarcodeFormat.QR_CODE,
                    300,
                    300
            );

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);
            byte[] qrCodeBytes = outputStream.toByteArray();

            // Convert to data URL
            String base64Image = Base64.getEncoder().encodeToString(qrCodeBytes);
            return "data:image/png;base64," + base64Image;

        } catch (WriterException | IOException e) {
            logger.error("❌ Failed to generate QR code", e);
            throw new RuntimeException("Failed to generate QR code", e);
        }
    }

    private List<String> generateBackupCodes() {
        SecureRandom random = new SecureRandom();
        List<String> codes = new ArrayList<>();

        for (int i = 0; i < BACKUP_CODES_COUNT; i++) {
            // Generate 8-character alphanumeric code
            String code = String.format("%08d", random.nextInt(100000000));
            codes.add(code);
        }

        return codes;
    }

    private String convertBackupCodesToJson(List<String> backupCodes) {
        try {
            // Hash backup codes before storing
            List<String> hashedCodes = backupCodes.stream()
                    .map(passwordEncoder::encode)
                    .collect(Collectors.toList());
            return objectMapper.writeValueAsString(hashedCodes);
        } catch (Exception e) {
            logger.error("❌ Failed to convert backup codes to JSON", e);
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

    private String convertBackupCodesToJsonFromHashed(List<String> hashedCodes) {
        try {
            return objectMapper.writeValueAsString(hashedCodes);
        } catch (Exception e) {
            logger.error("❌ Failed to convert backup codes to JSON", e);
            throw new RuntimeException("Failed to process backup codes", e);
        }
    }
}