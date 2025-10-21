package com.edumind.discovery;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.netflix.eureka.server.EnableEurekaServer;

@SpringBootApplication
@EnableEurekaServer
public class DiscoveryServiceApplication {
	private static final Logger logger = LoggerFactory.getLogger(DiscoveryServiceApplication.class);

	public static void main(String[] args) {
		logger.info("🚀 Starting Discovery Service (Eureka Server)...");
		SpringApplication.run(DiscoveryServiceApplication.class, args);
		logger.info("✅ Service Discovery started successfully on port 8761");
		logger.info("🌐 Dashboard: http://localhost:8761");
	}

}
