package com.edumind.eureka.security;

import java.util.function.Supplier;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.cloud.netflix.eureka.http.EurekaClientHttpRequestFactorySupplier;
import org.springframework.cloud.netflix.eureka.http.RestTemplateDiscoveryClientOptionalArgs;

/**
 * {@link RestTemplateDiscoveryClientOptionalArgs} whose builder carries a pre-set
 * {@code Authorization} header. Exists as a distinct type so tests and logs can tell it apart from
 * Spring Cloud's unauthenticated default.
 */
public class AuthenticatedRestTemplateDiscoveryClientOptionalArgs extends RestTemplateDiscoveryClientOptionalArgs {

	private final Supplier<RestTemplateBuilder> builderSupplier;

	public AuthenticatedRestTemplateDiscoveryClientOptionalArgs(
			EurekaClientHttpRequestFactorySupplier requestFactorySupplier,
			Supplier<RestTemplateBuilder> builderSupplier) {
		super(requestFactorySupplier, builderSupplier);
		this.builderSupplier = builderSupplier;
	}

	/** The Eureka-only builder, exposed for verification in tests. */
	public Supplier<RestTemplateBuilder> getBuilderSupplier() {
		return builderSupplier;
	}
}
