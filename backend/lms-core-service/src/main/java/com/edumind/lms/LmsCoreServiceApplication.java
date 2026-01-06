package com.edumind.lms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication(scanBasePackages = {
		"com.edumind.lms",
		"com.edumind.common"
})
@EnableDiscoveryClient
@EnableFeignClients(basePackages = {
		"com.edumind.lms.shared.client"
})
@EnableAsync
public class LmsCoreServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(LmsCoreServiceApplication.class, args);
	}

}
