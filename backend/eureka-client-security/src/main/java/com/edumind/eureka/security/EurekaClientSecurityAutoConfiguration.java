package com.edumind.eureka.security;

import java.io.IOException;
import java.security.GeneralSecurityException;

import com.netflix.discovery.AbstractDiscoveryClientOptionalArgs;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.cloud.configuration.TlsProperties;
import org.springframework.cloud.netflix.eureka.config.DiscoveryClientOptionalArgsConfiguration;
import org.springframework.cloud.netflix.eureka.http.EurekaClientHttpRequestFactorySupplier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Conditional;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestTemplate;

/**
 * Authenticates this service against a secured Eureka Server with an {@code Authorization} header
 * instead of credentials embedded in {@code eureka.client.service-url.defaultZone}.
 *
 * <p>Activates only when {@code edumind.eureka.security.username} holds text — set but blank counts
 * as absent, see {@link OnEurekaUsernameCondition}. It replaces Spring
 * Cloud's {@code AbstractDiscoveryClientOptionalArgs} bean, which is declared
 * {@code @ConditionalOnMissingBean(AbstractDiscoveryClientOptionalArgs.class)} and therefore backs
 * off cleanly; the transport factories that Spring Cloud builds on top pick up the bean defined
 * here.
 *
 * <p>Two properties of the replacement matter:
 *
 * <ul>
 *   <li><b>TLS is preserved.</b> The {@link EurekaClientHttpRequestFactorySupplier} bean created by
 *       Spring Cloud is injected as-is, and {@link DiscoveryClientOptionalArgsConfiguration#setupTLS}
 *       applies {@code eureka.client.tls.*} exactly as upstream does.
 *   <li><b>The builder is Eureka-only.</b> A fresh builder instance is created here rather than the
 *       application's shared {@code RestTemplateBuilder}/{@code RestClient.Builder} bean, so no
 *       application interceptor — in particular {@code @LoadBalanced}, which would need the registry
 *       that is still being fetched — leaks into registry traffic, and the credentials never leak
 *       out into other HTTP clients.
 * </ul>
 */
@AutoConfiguration(before = DiscoveryClientOptionalArgsConfiguration.class)
@ConditionalOnClass({ AbstractDiscoveryClientOptionalArgs.class, EurekaClientHttpRequestFactorySupplier.class })
@Conditional(OnEurekaUsernameCondition.class)
@EnableConfigurationProperties(EurekaClientSecurityProperties.class)
public class EurekaClientSecurityAutoConfiguration {

	private static final Logger logger = LoggerFactory.getLogger(EurekaClientSecurityAutoConfiguration.class);

	/**
	 * Used when {@code eureka.client.restclient.enabled=true}.
	 */
	@Configuration(proxyBeanMethods = false)
	@ConditionalOnClass(RestClient.class)
	@ConditionalOnProperty(prefix = "eureka.client.restclient", name = "enabled", havingValue = "true")
	static class RestClientConfiguration {

		@Bean
		@ConditionalOnMissingBean(AbstractDiscoveryClientOptionalArgs.class)
		AuthenticatedRestClientDiscoveryClientOptionalArgs authenticatedRestClientDiscoveryClientOptionalArgs(
				TlsProperties tlsProperties, EurekaClientHttpRequestFactorySupplier requestFactorySupplier,
				EurekaClientSecurityProperties properties) throws GeneralSecurityException, IOException {

			String authorization = properties.authorizationHeaderValue();
			AuthenticatedRestClientDiscoveryClientOptionalArgs args =
					new AuthenticatedRestClientDiscoveryClientOptionalArgs(requestFactorySupplier,
							() -> RestClient.builder().defaultHeader(HttpHeaders.AUTHORIZATION, authorization));
			DiscoveryClientOptionalArgsConfiguration.setupTLS(args, tlsProperties);
			logAuthenticationEnabled("RestClient", properties.getUsername());
			return args;
		}
	}

	/**
	 * The default path: Spring Cloud uses {@code RestTemplate} unless another client is enabled.
	 */
	@Configuration(proxyBeanMethods = false)
	@ConditionalOnClass(RestTemplate.class)
	@ConditionalOnProperty(prefix = "eureka.client.restclient", name = "enabled", havingValue = "false",
			matchIfMissing = true)
	static class RestTemplateConfiguration {

		@Bean
		@ConditionalOnMissingBean(AbstractDiscoveryClientOptionalArgs.class)
		AuthenticatedRestTemplateDiscoveryClientOptionalArgs authenticatedRestTemplateDiscoveryClientOptionalArgs(
				TlsProperties tlsProperties, EurekaClientHttpRequestFactorySupplier requestFactorySupplier,
				EurekaClientSecurityProperties properties) throws GeneralSecurityException, IOException {

			String authorization = properties.authorizationHeaderValue();
			AuthenticatedRestTemplateDiscoveryClientOptionalArgs args =
					new AuthenticatedRestTemplateDiscoveryClientOptionalArgs(requestFactorySupplier,
							() -> new RestTemplateBuilder().defaultHeader(HttpHeaders.AUTHORIZATION, authorization));
			DiscoveryClientOptionalArgsConfiguration.setupTLS(args, tlsProperties);
			logAuthenticationEnabled("RestTemplate", properties.getUsername());
			return args;
		}
	}

	/**
	 * Fails fast instead of silently dropping the credentials: with the WebClient transport, Spring
	 * Cloud builds its client from a {@code WebClient.Builder} this auto-configuration does not
	 * control, so registry calls would go out unauthenticated.
	 */
	@Configuration(proxyBeanMethods = false)
	@ConditionalOnProperty(prefix = "eureka.client.webclient", name = "enabled", havingValue = "true")
	static class WebClientNotSupportedConfiguration {

		WebClientNotSupportedConfiguration() {
			throw new IllegalStateException("eureka.client.webclient.enabled=true is not supported together with "
					+ EurekaClientSecurityProperties.PREFIX + ".username: the WebClient transport would send "
					+ "unauthenticated requests to the Eureka Server. Use the RestTemplate or RestClient transport.");
		}
	}

	private static void logAuthenticationEnabled(String transport, String username) {
		logger.info("Eureka client authenticates as '{}' via an Authorization header ({} transport)", username,
				transport);
	}
}
