package com.edumind.auth.service;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class EmailTemplateRenderTest {
    private static final String FRONTEND_URL = "https://app.example.test";
    private static final String ACTION_URL = FRONTEND_URL + "/action?token=secret-token";
    private static final String SUPPORT_EMAIL = "support@example.test";
    private static final String[] TEMPLATES = {
            "welcome-verification", "email-verification", "password-reset", "password-changed",
            "application-received", "application-approved", "application-rejected",
            "trial-expiry-reminder", "trial-expired", "account-deletion"
    };
    private static final String[] FORBIDDEN_CLAIMS = {
            "live classes", "mobile app", "thousands of", "personalized recommendation", "temporarily disabled"
    };

    private static TemplateEngine htmlEngine;
    private static TemplateEngine textEngine;

    @BeforeAll
    static void configureEngines() {
        ClassLoaderTemplateResolver htmlResolver = new ClassLoaderTemplateResolver();
        htmlResolver.setPrefix("templates/");
        htmlResolver.setSuffix(".html");
        htmlResolver.setTemplateMode(TemplateMode.HTML);
        htmlResolver.setCharacterEncoding("UTF-8");
        htmlResolver.setCacheable(false);
        htmlEngine = new SpringTemplateEngine();
        htmlEngine.setTemplateResolver(htmlResolver);

        ClassLoaderTemplateResolver textResolver = new ClassLoaderTemplateResolver();
        textResolver.setPrefix("templates/email/text/");
        textResolver.setSuffix(".txt");
        textResolver.setTemplateMode(TemplateMode.TEXT);
        textResolver.setCharacterEncoding("UTF-8");
        textResolver.setCacheable(false);
        textEngine = new SpringTemplateEngine();
        textEngine.setTemplateResolver(textResolver);
    }

    @Test
    @DisplayName("All production email templates render safely with consistent branding and actions")
    void allTemplatesRenderSafely() {
        for (String template : TEMPLATES) {
            Context context = context();
            String html = htmlEngine.process("email/" + template, context);
            String text = textEngine.process(template, context);
            String normalizedHtml = html.toLowerCase(Locale.ROOT);
            String normalizedText = text.toLowerCase(Locale.ROOT);

            assertAll(template,
                    () -> assertTrue(normalizedHtml.contains("lang=\"en\""), "missing lang=en"),
                    () -> assertTrue(html.contains("data-email-preheader=\"true\""), "missing preheader"),
                    () -> assertTrue(html.contains("data-email-wordmark=\"true\""), "missing HTML wordmark"),
                    () -> assertEquals(1, occurrences(normalizedHtml, "<h1"), "must contain one h1"),
                    () -> assertTrue(html.contains("mobile-button"), "missing primary CTA"),
                    () -> assertFalse(html.contains("${"), "unresolved expression"),
                    () -> assertFalse(html.contains(" th:"), "unresolved Thymeleaf attribute"),
                    () -> assertFalse(normalizedHtml.contains("localhost"), "localhost leaked into output"),
                    () -> assertFalse(normalizedHtml.contains("href=\"#\""), "dead link"),
                    () -> assertFalse(normalizedHtml.contains(">null<"), "literal null"),
                    () -> assertFalse(normalizedHtml.contains("<script"), "unsafe user content was not escaped"),
                    () -> assertTrue(html.contains("&lt;Admin &amp; User&gt;"), "name was not HTML-escaped"),
                    () -> assertFalse(normalizedHtml.contains("<img"), "external/image-dependent brand asset"),
                    () -> assertFalse(text.contains("${"), "unresolved text expression"),
                    () -> assertFalse(normalizedText.contains("localhost"), "localhost leaked into text")
            );

            for (String forbidden : FORBIDDEN_CLAIMS) {
                assertFalse(normalizedHtml.contains(forbidden), template + " contains unsupported claim: " + forbidden);
                assertFalse(normalizedText.contains(forbidden), template + " text contains unsupported claim: " + forbidden);
            }
        }
    }

    @Test
    @DisplayName("Security templates expose the complete fallback action URL")
    void securityTemplatesContainFallbackUrl() {
        for (String template : new String[]{"welcome-verification", "email-verification", "password-reset"}) {
            String html = htmlEngine.process("email/" + template, context());
            String text = textEngine.process(template, context());
            assertTrue(html.contains(ACTION_URL.replace("&", "&amp;")), template + " HTML fallback URL missing");
            assertTrue(text.contains(ACTION_URL), template + " text URL missing");
        }
    }

    @Test
    @DisplayName("Admin supplied rejection reason is escaped")
    void rejectionReasonIsEscaped() {
        String html = htmlEngine.process("email/application-rejected", context());
        assertTrue(html.contains("Needs &lt;strong&gt;review&lt;/strong&gt; &amp; care"));
        assertFalse(html.contains("Needs <strong>review</strong>"));
    }

    private Context context() {
        Context context = new Context(Locale.ENGLISH);
        Map<String, Object> variables = new LinkedHashMap<>();
        variables.put("name", "<Admin & User>");
        variables.put("frontendUrl", FRONTEND_URL);
        variables.put("supportEmail", SUPPORT_EMAIL);
        variables.put("year", 2026);
        variables.put("actionUrl", ACTION_URL);
        variables.put("isTrial", true);
        variables.put("trialEndDate", "31/08/2026");
        variables.put("daysRemaining", 5);
        variables.put("subject", "Computer Science & Engineering");
        variables.put("experienceYears", 4);
        variables.put("reason", "Needs <strong>review</strong> & care");
        context.setVariables(variables);
        return context;
    }

    private static int occurrences(String value, String needle) {
        int count = 0;
        int index = 0;
        while ((index = value.indexOf(needle, index)) >= 0) {
            count++;
            index += needle.length();
        }
        return count;
    }
}
