package com.edumind.eureka.security;

import java.util.function.Supplier;

import org.springframework.cloud.netflix.eureka.http.EurekaClientHttpRequestFactorySupplier;
import org.springframework.cloud.netflix.eureka.http.RestClientDiscoveryClientOptionalArgs;
import org.springframework.web.client.RestClient;

/**
 * {@link RestClientDiscoveryClientOptionalArgs} whose builder carries a pre-set
 * {@code Authorization} header. Used when {@code eureka.client.restclient.enabled=true}.
 */
public class AuthenticatedRestClientDiscoveryClientOptionalArgs extends RestClientDiscoveryClientOptionalArgs {

	private final Supplier<RestClient.Builder> builderSupplier;

	public AuthenticatedRestClientDiscoveryClientOptionalArgs(
			EurekaClientHttpRequestFactorySupplier requestFactorySupplier,
			Supplier<RestClient.Builder> builderSupplier) {
		super(requestFactorySupplier, builderSupplier);
		this.builderSupplier = builderSupplier;
	}

	/** The Eureka-only builder, exposed for verification in tests. */
	public Supplier<RestClient.Builder> getBuilderSupplier() {
		return builderSupplier;
	}
}
