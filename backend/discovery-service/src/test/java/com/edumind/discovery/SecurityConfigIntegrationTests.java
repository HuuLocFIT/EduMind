package com.edumind.discovery;

import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Locks down the registry's access rules: the container health check must stay open, everything
 * else must require credentials, and Eureka's own write calls must not be blocked by CSRF.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
		properties = { "eureka.client.register-with-eureka=false", "eureka.client.fetch-registry=false" })
class SecurityConfigIntegrationTests {

	private static final String USERNAME = "eureka";

	private static final String PASSWORD = "eureka";

	@LocalServerPort
	private int port;

	@Autowired
	private TestRestTemplate restTemplate;

	@Test
	void healthIsReachableWithoutCredentials() {
		ResponseEntity<String> response = get("/actuator/health");

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(response.getBody()).contains("\"status\":\"UP\"");
	}

	@Test
	void healthHidesDetailsFromAnonymousCallers() {
		assertThat(get("/actuator/health").getBody()).doesNotContain("components");
	}

	@Test
	void healthExposesDetailsToAuthenticatedCallers() {
		assertThat(getAuthenticated("/actuator/health").getBody()).contains("components");
	}

	@Test
	void registryRequiresCredentials() {
		assertThat(get("/eureka/apps").getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
		assertThat(getAuthenticated("/eureka/apps").getStatusCode()).isEqualTo(HttpStatus.OK);
	}

	@Test
	void dashboardRequiresCredentials() {
		assertThat(get("/").getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
		assertThat(getAuthenticated("/").getStatusCode()).isEqualTo(HttpStatus.OK);
	}

	@Test
	void otherActuatorEndpointsRequireCredentials() {
		assertThat(get("/actuator/metrics").getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
		assertThat(getAuthenticated("/actuator/metrics").getStatusCode()).isEqualTo(HttpStatus.OK);
	}

	@Test
	void deregistrationIsRejectedWithoutCredentials() {
		ResponseEntity<String> response = restTemplate.exchange(url("/eureka/apps/AUTH-SERVICE/auth-service:8081"),
				HttpMethod.DELETE, null, String.class);

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
	}

	/**
	 * Eureka clients send no CSRF token. A 403 here would mean registration is broken for every
	 * service in the platform.
	 */
	@Test
	void authenticatedRegistrationIsNotBlockedByCsrf() {
		String body = """
				{
				  "instance": {
				    "instanceId": "csrf-probe:9999",
				    "hostName": "127.0.0.1",
				    "app": "CSRF-PROBE",
				    "ipAddr": "127.0.0.1",
				    "status": "UP",
				    "port": {"$": 9999, "@enabled": true},
				    "dataCenterInfo": {
				      "@class": "com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo",
				      "name": "MyOwn"
				    }
				  }
				}
				""";

		HttpHeaders headers = new HttpHeaders();
		headers.setContentType(MediaType.APPLICATION_JSON);

		ResponseEntity<String> response = restTemplate.withBasicAuth(USERNAME, PASSWORD)
				.postForEntity(url("/eureka/apps/CSRF-PROBE"), new HttpEntity<>(body, headers), String.class);

		assertThat(response.getStatusCode()).isNotEqualTo(HttpStatus.FORBIDDEN);
		assertThat(response.getStatusCode().is2xxSuccessful()).isTrue();
	}

	@Test
	void wrongCredentialsAreRejected() {
		ResponseEntity<String> response = restTemplate.withBasicAuth(USERNAME, "wrong-password")
				.getForEntity(url("/eureka/apps"), String.class);

		assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
	}

	private ResponseEntity<String> get(String path) {
		return restTemplate.getForEntity(url(path), String.class);
	}

	private ResponseEntity<String> getAuthenticated(String path) {
		return restTemplate.withBasicAuth(USERNAME, PASSWORD).getForEntity(url(path), String.class);
	}

	private String url(String path) {
		return "http://localhost:" + port + path;
	}
}
