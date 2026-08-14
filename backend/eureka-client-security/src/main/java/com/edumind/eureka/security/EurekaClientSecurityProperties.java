package com.edumind.eureka.security;

import java.nio.charset.StandardCharsets;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.http.HttpHeaders;
import org.springframework.util.StringUtils;

/**
 * Credentials the Eureka client presents to a secured Eureka Server.
 *
 * <p>Binding them as properties keeps the password out of {@code eureka.client.service-url}, where
 * any {@code @}, {@code :}, {@code /}, or {@code %} would corrupt URI parsing and where the value
 * would leak into logs and {@code docker inspect} output.
 */
@ConfigurationProperties(prefix = EurekaClientSecurityProperties.PREFIX)
public class EurekaClientSecurityProperties {

	public static final String PREFIX = "edumind.eureka.security";

	/**
	 * Username for HTTP Basic authentication against the Eureka Server. When empty, the
	 * auto-configuration backs off entirely and Spring Cloud's defaults apply.
	 */
	private String username;

	/** Password for HTTP Basic authentication against the Eureka Server. */
	private String password;

	public String getUsername() {
		return username;
	}

	public void setUsername(String username) {
		this.username = username;
	}

	public String getPassword() {
		return password;
	}

	public void setPassword(String password) {
		this.password = password;
	}

	/**
	 * Builds the {@code Authorization} header value.
	 *
	 * <p>Encoding is delegated to {@link HttpHeaders#encodeBasicAuth}, which rejects a username
	 * containing {@code :}. Any credential it accepts round-trips exactly, whatever punctuation it
	 * contains.
	 *
	 * <p>The charset is UTF-8 and must stay that way: Spring Security's
	 * {@code BasicAuthenticationConverter} — the decoder on the Discovery Service side — defaults to
	 * UTF-8, and RFC 7617 names it the charset for Basic credentials. Passing {@code null} here would
	 * fall back to {@code encodeBasicAuth}'s own ISO-8859-1 default, which agrees with the server only
	 * for ASCII credentials and either mis-decodes into a {@code 401} or refuses to encode at all once
	 * a credential leaves that range.
	 *
	 * @throws IllegalStateException when the password is missing
	 * @throws IllegalArgumentException when the credentials cannot be encoded
	 */
	public String authorizationHeaderValue() {
		if (!StringUtils.hasText(password)) {
			throw new IllegalStateException(
					PREFIX + ".password must be set when " + PREFIX + ".username is configured");
		}
		return "Basic " + HttpHeaders.encodeBasicAuth(username, password, StandardCharsets.UTF_8);
	}
}
