package com.edumind.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication(scanBasePackages = "com.edumind")
@EnableDiscoveryClient
public class AuthServiceApplication {
	private static final Logger logger = LoggerFactory.getLogger(AuthServiceApplication.class);

	public static void main(String[] args) {
		logger.info("🚀 Starting Auth Service...");
		SpringApplication.run(AuthServiceApplication.class, args);
		logger.info("✅ Auth Service started successfully on port 8081");
		logger.info("📚 API Docs: http://localhost:8081/");
		logger.info("👤 Demo Users:");
		logger.info("   - Admin:   admin@edumind.com / password123");
		logger.info("   - Teacher: teacher@edumind.com / password123");
		logger.info("   - Student: student@edumind.com / password123");
		logger.info("   - Guest:   guest@edumind.com / password123");
	}
}
