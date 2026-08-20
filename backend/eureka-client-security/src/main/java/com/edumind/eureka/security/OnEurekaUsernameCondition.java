package com.edumind.eureka.security;

import org.springframework.boot.autoconfigure.condition.ConditionOutcome;
import org.springframework.boot.autoconfigure.condition.SpringBootCondition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.core.type.AnnotatedTypeMetadata;
import org.springframework.util.StringUtils;

/**
 * Matches only when {@code edumind.eureka.security.username} holds actual text.
 *
 * <p>{@code @ConditionalOnProperty} cannot express this. Without a {@code havingValue} it matches on
 * any value that is not literally {@code false}, and an empty value still counts as present — a bare
 * {@code username:} in YAML binds to {@code ""}, and so does {@code EUREKA_USERNAME=} in the
 * environment. The auto-configuration would then activate on a blank credential and fail at startup
 * on the missing password, instead of backing off and leaving Spring Cloud's defaults in place as
 * documented.
 */
class OnEurekaUsernameCondition extends SpringBootCondition {

	private static final String PROPERTY = EurekaClientSecurityProperties.PREFIX + ".username";

	@Override
	public ConditionOutcome getMatchOutcome(ConditionContext context, AnnotatedTypeMetadata metadata) {
		String username = context.getEnvironment().getProperty(PROPERTY);

		if (StringUtils.hasText(username)) {
			return ConditionOutcome.match(PROPERTY + " has text");
		}
		return ConditionOutcome.noMatch(username == null ? PROPERTY + " is not set" : PROPERTY + " is empty");
	}
}
