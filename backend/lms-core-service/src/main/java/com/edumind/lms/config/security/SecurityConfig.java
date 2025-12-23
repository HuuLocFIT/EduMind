package com.edumind.lms.config.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationEntryPoint authenticationEntryPoint;
    private final JwtAccessDeniedHandler accessDeniedHandler;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Actuator endpoints
                        .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                        .requestMatchers("/actuator/**").hasRole("ADMIN")

                        // Public course browsing
                        .requestMatchers(HttpMethod.GET, "/courses/search").permitAll()
                        .requestMatchers(HttpMethod.GET, "/courses/filter").permitAll()
                        .requestMatchers(HttpMethod.GET, "/courses/category/{categoryId}").permitAll()
                        .requestMatchers(HttpMethod.GET, "/courses/top-rated").permitAll()
                        .requestMatchers(HttpMethod.GET, "/courses/most-popular").permitAll()
                        .requestMatchers(HttpMethod.GET, "/courses/newest").permitAll()
                        .requestMatchers(HttpMethod.GET, "/courses/free").permitAll()

                        // Course detail
                        .requestMatchers(HttpMethod.GET, "/courses/{id}").permitAll()
                        .requestMatchers(HttpMethod.GET, "/courses/slug/{slug}").permitAll()

                        // Categories - public
                        .requestMatchers(HttpMethod.GET, "/categories/**").permitAll()

                        // Reviews
                        .requestMatchers(HttpMethod.GET, "/reviews/courses/{courseId}").permitAll()
                        .requestMatchers(HttpMethod.GET, "/reviews/{reviewId}").permitAll()
                        .requestMatchers(HttpMethod.GET, "/reviews/courses/{courseId}/rating-distribution").permitAll()
                        .requestMatchers(HttpMethod.GET, "/reviews/config/auto-approve-enabled").permitAll()

                        // Preview lessons only - public
                        .requestMatchers(HttpMethod.GET, "/lessons/courses/{courseId}/preview").permitAll()

                        .anyRequest().authenticated()
                );

        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    /**
     * Provided to satisfy Spring Security requirements when no other encoder exists.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}

