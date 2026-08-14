package com.edumind.eureka.security;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import com.netflix.discovery.AbstractDiscoveryClientOptionalArgs;
import org.junit.jupiter.api.Test;

import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.cloud.netflix.eureka.config.DiscoveryClientOptionalArgsConfiguration;
import org.springframework.cloud.netflix.eureka.http.EurekaClientHttpRequestFactorySupplier;
import org.springframework.cloud.netflix.eureka.http.RestTemplateDiscoveryClientOptionalArgs;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * Verifies that Eureka client credentials are carried by an {@code Authorization} header, that the
 * auto-configuration defers to Spring Cloud and to user-defined beans, and that misconfiguration
 * fails at startup rather than silently sending unauthenticated registry calls.
 */
class EurekaClientSecurityAutoConfigurationTests {

	private final ApplicationContextRunner runner = new ApplicationContextRunner()
			.withConfiguration(AutoConfigurations.of(DiscoveryClientOptionalArgsConfiguration.class,
					EurekaClientSecurityAutoConfiguration.class));

	@Test
	void addsAuthorizationHeaderToTheEurekaBuilder() {
		runner.withPropertyValues("edumind.eureka.security.username=eureka",
						"edumind.eureka.security.password=eureka")
				.run(context -> {
					assertThat(context).hasSingleBean(AbstractDiscoveryClientOptionalArgs.class);
					assertThat(context).hasSingleBean(AuthenticatedRestTemplateDiscoveryClientOptionalArgs.class);

					assertRegistryCallCarriesHeader(context.getBean(
							AuthenticatedRestTemplateDiscoveryClientOptionalArgs.class), "eureka", "eureka");
				});
	}

	/**
	 * The reason credentials no longer live in the service URL: these characters break URI userinfo
	 * parsing, but survive header encoding untouched.
	 */
	@Test
	void supportsPasswordsWithUrlBreakingCharacters() {
		// Spring's relaxed binding trims trailing whitespace, so the sample stops short of one.
		String password = "p@ss:w/ord#%?&=+";

		runner.withPropertyValues("edumind.eureka.security.username=eureka",
						"edumind.eureka.security.password=" + password)
				.run(context -> assertRegistryCallCarriesHeader(context.getBean(
						AuthenticatedRestTemplateDiscoveryClientOptionalArgs.class), "eureka", password));
	}

	/**
	 * The header must be UTF-8, the charset Spring Security's {@code BasicAuthenticationConverter}
	 * decodes with. Under {@code encodeBasicAuth}'s ISO-8859-1 default these credentials would either
	 * decode to something else on the server — a silent {@code 401} — or fail to encode at all.
	 */
	@Test
	void supportsCredentialsOutsideLatin1() {
		String username = "quản-trị";
		String password = "mật-khẩu-123";

		runner.withPropertyValues("edumind.eureka.security.username=" + username,
						"edumind.eureka.security.password=" + password)
				.run(context -> {
					assertRegistryCallCarriesHeader(context.getBean(
							AuthenticatedRestTemplateDiscoveryClientOptionalArgs.class), username, password);

					// Spelled out as the server sees it: Base64 payload, decoded as UTF-8.
					String encoded = context.getBean(EurekaClientSecurityProperties.class)
							.authorizationHeaderValue()
							.substring("Basic ".length());
					assertThat(new String(Base64.getDecoder().decode(encoded), StandardCharsets.UTF_8))
							.isEqualTo(username + ":" + password);
				});
	}

	@Test
	void backsOffWhenNoUsernameIsConfigured() {
		runner.run(context -> {
			assertThat(context).doesNotHaveBean(AuthenticatedRestTemplateDiscoveryClientOptionalArgs.class);
			// Spring Cloud's own unauthenticated bean is used instead.
			assertThat(context).hasSingleBean(RestTemplateDiscoveryClientOptionalArgs.class);
		});
	}

	/**
	 * A present-but-blank username is how the opt-out is actually spelled in deployment —
	 * {@code username:} in YAML, or {@code EUREKA_USERNAME=} in the environment. It must back off
	 * like an absent one; {@code @ConditionalOnProperty} would have matched here and then failed the
	 * context on the missing password.
	 */
	@Test
	void backsOffWhenTheUsernameIsPresentButBlank() {
		runner.withPropertyValues("edumind.eureka.security.username=").run(context -> {
			assertThat(context).hasNotFailed();
			assertThat(context).doesNotHaveBean(AuthenticatedRestTemplateDiscoveryClientOptionalArgs.class);
			assertThat(context).hasSingleBean(RestTemplateDiscoveryClientOptionalArgs.class);
		});
	}

	@Test
	void backsOffWhenTheApplicationDefinesItsOwnOptionalArgs() {
		runner.withUserConfiguration(CustomOptionalArgsConfiguration.class)
				.withPropertyValues("edumind.eureka.security.username=eureka",
						"edumind.eureka.security.password=eureka")
				.run(context -> {
					assertThat(context).hasSingleBean(AbstractDiscoveryClientOptionalArgs.class);
					assertThat(context).doesNotHaveBean(AuthenticatedRestTemplateDiscoveryClientOptionalArgs.class);
				});
	}

	@Test
	void failsWhenUsernameIsSetWithoutPassword() {
		runner.withPropertyValues("edumind.eureka.security.username=eureka")
				.run(context -> assertThat(context).hasFailed()
						.getFailure()
						.rootCause()
						.hasMessageContaining("edumind.eureka.security.password must be set"));
	}

	@Test
	void failsWhenTheWebClientTransportWouldDropTheCredentials() {
		runner.withPropertyValues("edumind.eureka.security.username=eureka",
						"edumind.eureka.security.password=eureka", "eureka.client.webclient.enabled=true")
				.run(context -> assertThat(context).hasFailed()
						.getFailure()
						.rootCause()
						.hasMessageContaining("eureka.client.webclient.enabled=true is not supported"));
	}

	/**
	 * The builder must be created for Eureka alone, not shared with the application, so that
	 * application interceptors stay out of registry traffic and the credentials stay out of other
	 * HTTP clients.
	 */
	@Test
	void buildsADedicatedBuilderInstancePerCall() {
		runner.withPropertyValues("edumind.eureka.security.username=eureka",
						"edumind.eureka.security.password=eureka")
				.run(context -> {
					AuthenticatedRestTemplateDiscoveryClientOptionalArgs args = context
							.getBean(AuthenticatedRestTemplateDiscoveryClientOptionalArgs.class);
					RestTemplateBuilder first = args.getBuilderSupplier().get();
					RestTemplateBuilder second = args.getBuilderSupplier().get();

					assertThat(first).isNotSameAs(second);
					assertThat(context.getBeanNamesForType(RestTemplateBuilder.class)).isEmpty();
				});
	}

	private void assertRegistryCallCarriesHeader(AuthenticatedRestTemplateDiscoveryClientOptionalArgs args,
			String username, String password) {
		RestTemplate restTemplate = args.getBuilderSupplier().get().build();
		// UTF-8, matching what Spring Security's BasicAuthenticationConverter decodes with.
		String expected = "Basic " + Base64.getEncoder()
				.encodeToString((username + ":" + password).getBytes(StandardCharsets.UTF_8));

		MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
		server.expect(requestTo("http://eureka.test/eureka/apps"))
				.andExpect(header(HttpHeaders.AUTHORIZATION, expected))
				.andRespond(withSuccess());

		restTemplate.getForEntity("http://eureka.test/eureka/apps", String.class);
		server.verify();
	}

	@Configuration(proxyBeanMethods = false)
	static class CustomOptionalArgsConfiguration {

		@Bean
		RestTemplateDiscoveryClientOptionalArgs customOptionalArgs(
				EurekaClientHttpRequestFactorySupplier requestFactorySupplier) {
			return new RestTemplateDiscoveryClientOptionalArgs(requestFactorySupplier);
		}
	}
}
