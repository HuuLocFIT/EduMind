package com.edumind.lms.modules.payment.config;

/**
 * Constants used throughout the Payment module
 */
public final class PaymentConstants {
    private PaymentConstants() {
        // Prevent instantiation
    }

    // Schema
    public static final String SCHEMA = "payment";

    // Config Keys (must match values in platform_config table)
    public static final String CONFIG_PLATFORM_FEE_PERCENT = "PLATFORM_FEE_PERCENT";
    public static final String CONFIG_MIN_COURSE_PRICE = "MIN_COURSE_PRICE";
    public static final String CONFIG_MAX_COURSE_PRICE = "MAX_COURSE_PRICE";
    public static final String CONFIG_DEFAULT_CURRENCY = "DEFAULT_CURRENCY";
    public static final String CONFIG_COMPANY_NAME = "COMPANY_NAME";
    public static final String CONFIG_COMPANY_ADDRESS = "COMPANY_ADDRESS";
    public static final String CONFIG_COMPANY_TAX_ID = "COMPANY_TAX_ID";
    public static final String CONFIG_COMPANY_EMAIL = "COMPANY_EMAIL";
    public static final String CONFIG_COMPANY_PHONE = "COMPANY_PHONE";

    // Default Values
    public static final String DEFAULT_CURRENCY = "USD";
    public static final int DEFAULT_PLATFORM_FEE_PERCENT = 20;
    public static final int DEFAULT_MIN_PRICE = 0;
    public static final int DEFAULT_MAX_PRICE = 500;

    // Number formats
    public static final String INVOICE_NUMBER_PREFIX = "INV";
    public static final String ORDER_NUMBER_PREFIX = "ORD";
    public static final String TRANSACTION_NUMBER_PREFIX = "TXN";

    // Cloudinary folders
    public static final String CLOUDINARY_INVOICE_FOLDER = "edumind/invoices";
}