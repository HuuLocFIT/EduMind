package com.edumind.discovery.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Protects the Eureka registry and dashboard with HTTP Basic authentication.
 *
 * <p>Eureka clients register, renew, and cancel with POST/PUT/DELETE calls that carry no CSRF
 * token, so CSRF is disabled for {@code /eureka/**}. The container health check calls
 * {@code /actuator/health} without credentials, so that endpoint stays open; every other endpoint,
 * including the dashboard at {@code /}, requires the configured user.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

	@Bean
	public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		http
				.csrf(csrf -> csrf.ignoringRequestMatchers("/eureka/**"))
				.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
				.authorizeHttpRequests(requests -> requests
						.requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
						.anyRequest().authenticated())
				.httpBasic(Customizer.withDefaults());

		return http.build();
	}
}
