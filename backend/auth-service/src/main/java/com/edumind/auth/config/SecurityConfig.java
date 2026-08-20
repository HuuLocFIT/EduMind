package com.edumind.auth.config;

import com.edumind.auth.security.JwtAccessDeniedHandler;
import com.edumind.auth.security.JwtAuthenticationEntryPoint;
import com.edumind.auth.security.JwtAuthenticationFilter;
import com.edumind.auth.security.OAuth2AuthenticationFailureHandler;
import com.edumind.auth.security.OAuth2AuthenticationSuccessHandler;
import com.edumind.auth.security.UserDetailsServiceImpl;
import com.edumind.auth.service.CustomOAuth2UserService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
// CORS imports commented out - CORS is handled by API Gateway
// import org.springframework.web.cors.CorsConfiguration;
// import org.springframework.web.cors.CorsConfigurationSource;
// import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
// import java.util.Arrays;
// import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true, securedEnabled = true)
public class SecurityConfig {
    private final UserDetailsServiceImpl userDetailsService;
    private final JwtAuthenticationEntryPoint unauthorizedHandler;
    private final JwtAccessDeniedHandler accessDeniedHandler;
    private final CustomOAuth2UserService customOAuth2UserService;
    private final OAuth2AuthenticationSuccessHandler oAuth2AuthenticationSuccessHandler;
    private final OAuth2AuthenticationFailureHandler oAuth2AuthenticationFailureHandler;

    /**
     * Constructor injection with @Lazy to break circular dependency
     *
     * Circular dependency chain:
     * SecurityConfig → CustomOAuth2UserService → AuthService → AuthenticationManager (from SecurityConfig)
     *
     * Solution: @Lazy on CustomOAuth2UserService
     */
    @Autowired
    public SecurityConfig(
            UserDetailsServiceImpl userDetailsService,
            JwtAuthenticationEntryPoint unauthorizedHandler,
            JwtAccessDeniedHandler accessDeniedHandler,
            @Lazy CustomOAuth2UserService customOAuth2UserService,
            OAuth2AuthenticationSuccessHandler oAuth2AuthenticationSuccessHandler,
            OAuth2AuthenticationFailureHandler oAuth2AuthenticationFailureHandler) {
        this.userDetailsService = userDetailsService;
        this.unauthorizedHandler = unauthorizedHandler;
        this.accessDeniedHandler = accessDeniedHandler;
        this.customOAuth2UserService = customOAuth2UserService;
        this.oAuth2AuthenticationSuccessHandler = oAuth2AuthenticationSuccessHandler;
        this.oAuth2AuthenticationFailureHandler = oAuth2AuthenticationFailureHandler;
    }

    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter() {
        return new JwtAuthenticationFilter();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
    
    /**
     * Custom OAuth2AuthorizationRequestResolver to fix redirect URI issue
     * Forces OAuth2 to use configured gateway URL instead of private IP
     * Gateway URL is configured via app.gateway.url (can be overridden with GATEWAY_URL env var)
     */
    @Bean
    public OAuth2AuthorizationRequestResolver authorizationRequestResolver(
            ClientRegistrationRepository clientRegistrationRepository,
            @Value("${app.gateway.url}") String gatewayUrl) {
        return new com.edumind.auth.config.CustomOAuth2AuthorizationRequestResolver(
                clientRegistrationRepository,
                gatewayUrl
        );
    }

    @Bean
    public SecurityFilterChain filterChain(
            HttpSecurity http,
            ClientRegistrationRepository clientRegistrationRepository,
            @Value("${app.gateway.url}") String gatewayUrl) throws Exception {
        http.csrf(csrf -> csrf.disable())
                // CORS is handled by API Gateway, no need to configure here
                // .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint(unauthorizedHandler)
                        .accessDeniedHandler(accessDeniedHandler))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth ->
                        auth.requestMatchers("/auth/signup", "/auth/login", "/auth/refresh", "/auth/login/2fa").permitAll()
                                .requestMatchers("/auth/verify-email").permitAll()
                                .requestMatchers("/auth/resend-verification").permitAll()
                                .requestMatchers("/auth/password/forgot").permitAll()
                                .requestMatchers("/auth/password/validate-token").permitAll()
                                .requestMatchers("/auth/password/reset").permitAll()
                                .requestMatchers("/users/*/public-profile").permitAll()
                                .requestMatchers("/oauth2/**").permitAll()
                                .requestMatchers("/login/oauth2/**").permitAll()
                                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                                .requestMatchers("/actuator/**").hasRole("ADMIN")
                                .requestMatchers("/teacher-application/submit").hasRole("STUDENT")
                                .requestMatchers("/teacher-application/my-application").authenticated()
                                .requestMatchers("/teacher-application/trial-status").hasRole("TEACHER_TRIAL")
                                .requestMatchers("/upload/**").authenticated()
                                .requestMatchers("/admin/**").hasRole("ADMIN")
                                .requestMatchers("/teacher/**").hasAnyRole("TEACHER", "ADMIN", "TEACHER_TRIAL")
                                .requestMatchers("/student/**").hasAnyRole("STUDENT", "TEACHER", "ADMIN", "TEACHER_TRIAL")
                                .anyRequest().authenticated()
                )
                .oauth2Login(oauth2 -> oauth2
                        .authorizationEndpoint(authorization -> authorization
                                .authorizationRequestResolver(authorizationRequestResolver(clientRegistrationRepository, gatewayUrl))
                        )
                        .userInfoEndpoint(userInfo -> userInfo
                                .userService(customOAuth2UserService)
                        )
                        .successHandler(oAuth2AuthenticationSuccessHandler)
                        .failureHandler(oAuth2AuthenticationFailureHandler)
                );

        http.authenticationProvider(authenticationProvider());
        http.addFilterBefore(jwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // CORS is handled by API Gateway, no need to configure here
    // If you need to access auth-service directly (bypassing gateway), uncomment this
    /*
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList("http://localhost:3000", "http://localhost:4200"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
    */
}
