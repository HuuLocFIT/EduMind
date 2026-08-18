package com.edumind.lms.modules.payment.gateway.impl;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

import java.math.BigDecimal;

/**
 * Configuration properties for SePay payment gateway.
 *
 * Required properties must be set before production deployment:
 * - apiKey: SePay API key for authentication
 * - bankCode: Bank code (e.g., MB, VCB, TCB)
 * - bankAccount: Bank account number for receiving payments
 * - accountName: Account holder name displayed in QR code
 *
 * Optional but strongly recommended:
 * - bankName: Human-readable bank name for the text (screen-reader accessible)
 *   alternative to the QR image
 */
@Data
@Component
@Validated
@ConfigurationProperties(prefix = "payment.sepay")
public class SepayGatewayProperties {

    @NotBlank(message = "SePay API key is required for production use")
    private String apiKey;

    private String merchantId;
    private String secretKey;
    private String baseUrl = "https://my.sepay.vn";
    private String webhookSecret;

    // Bank account info for QR code generation
    @NotBlank(message = "Bank code is required (e.g., MB, VCB, TCB)")
    private String bankCode;

    @NotBlank(message = "Bank account number is required")
    private String bankAccount;

    @NotBlank(message = "Account holder name is required")
    private String accountName;

    // Human-readable bank name shown to users who cannot scan the QR code
    // (e.g. "MB Bank"). Falls back to bankCode when blank.
    private String bankName;

    // Optional settings
    @Min(value = 1, message = "QR expiration must be at least 1 minute")
    @Max(value = 60, message = "QR expiration cannot exceed 60 minutes")
    private int qrExpireMinutes = 15;

    private String template = "compact2";

    // Exchange rate settings
    // Default USD to VND rate - should be updated regularly via config or external service
    private BigDecimal usdToVndRate = new BigDecimal("25000");

    // Maximum allowed amount variance in VND for payment matching (for bank fees)
    @Min(value = 0, message = "Amount variance cannot be negative")
    private long maxAmountVarianceVnd = 1000;

    // HTTP client timeout settings
    @Min(value = 1000, message = "Connect timeout must be at least 1000ms")
    @Max(value = 30000, message = "Connect timeout cannot exceed 30000ms")
    private int connectTimeoutMs = 5000;  // 5 seconds

    @Min(value = 1000, message = "Read timeout must be at least 1000ms")
    @Max(value = 60000, message = "Read timeout cannot exceed 60000ms")
    private int readTimeoutMs = 30000;    // 30 seconds

    // Transaction query limit
    @Min(value = 10, message = "Transaction query limit must be at least 10")
    @Max(value = 500, message = "Transaction query limit cannot exceed 500")
    private int transactionQueryLimit = 100;  // Increased from 20 for high-volume periods

    private String transferContentPrefix = "EDUMIND";

    // Maximum transfer content length (banks typically truncate at 50-70 chars)
    @Min(value = 20, message = "Max transfer content length must be at least 20")
    @Max(value = 70, message = "Max transfer content length should not exceed 70")
    private int maxTransferContentLength = 50;
}
