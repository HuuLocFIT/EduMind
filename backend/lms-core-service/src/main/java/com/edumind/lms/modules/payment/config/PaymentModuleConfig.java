package com.edumind.lms.modules.payment.config;

import org.springframework.context.annotation.Configuration;

@Configuration
public class PaymentModuleConfig {
    // Payment module specific beans can be defined here
    // JPA repositories are scanned by the main application config
    // Do NOT add @EnableJpaRepositories here - it will override global config
}
