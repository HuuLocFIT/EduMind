package com.edumind.discovery;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.netflix.eureka.server.EnableEurekaServer;
import org.springframework.context.ConfigurableApplicationContext;

@SpringBootApplication
@EnableEurekaServer
public class DiscoveryServiceApplication {
	private static final Logger logger = LoggerFactory.getLogger(DiscoveryServiceApplication.class);

	public static void main(String[] args) {
		logger.info("🚀 Starting Discovery Service (Eureka Server)...");
		ConfigurableApplicationContext context = SpringApplication.run(DiscoveryServiceApplication.class, args);
		String port = context.getEnvironment().getProperty("local.server.port", "8761");
		logger.info("✅ Service Discovery started successfully on port {}", port);
		logger.info("🌐 Dashboard: http://localhost:{}", port);
	}

}
