package com.edumind.gateway;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableDiscoveryClient
public class ApiGatewayApplication {
	private static final Logger logger = LoggerFactory.getLogger(ApiGatewayApplication.class);

	public static void main(String[] args) {
		logger.info("🚀 Starting API Gateway...");
		SpringApplication.run(ApiGatewayApplication.class, args);
		logger.info("✅ API Gateway started successfully on port 8080");
		logger.info("🌐 Gateway URL: http://localhost:8080");
	}

}
