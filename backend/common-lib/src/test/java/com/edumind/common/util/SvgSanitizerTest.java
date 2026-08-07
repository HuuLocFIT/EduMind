package com.edumind.common.util;

import com.edumind.common.exception.FileUploadException;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SvgSanitizerTest {

    @Test
    void cleanSvgPassesThroughWithVisibleContentIntact() {
        String svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\">"
                + "<circle cx=\"12\" cy=\"12\" r=\"10\" fill=\"#123456\"/>"
                + "</svg>";

        String result = sanitize(svg);

        assertThat(result).contains("circle");
        assertThat(result).contains("#123456");
    }

    @Test
    void scriptElementIsStripped() {
        String svg = "<svg xmlns=\"http://www.w3.org/2000/svg\">"
                + "<script>alert(1)</script>"
                + "<circle cx=\"1\" cy=\"1\" r=\"1\"/>"
                + "</svg>";

        String result = sanitize(svg);

        assertThat(result).doesNotContain("script");
        assertThat(result).doesNotContain("alert");
    }

    @Test
    void onloadAttributeIsStripped() {
        String svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" onload=\"alert(1)\">"
                + "<circle cx=\"1\" cy=\"1\" r=\"1\"/>"
                + "</svg>";

        String result = sanitize(svg);

        assertThat(result).doesNotContain("onload");
        assertThat(result).doesNotContain("alert(1)");
    }

    @Test
    void externalHrefIsStrippedButLocalFragmentHrefSurvives() {
        String svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\">"
                + "<defs><linearGradient id=\"localGradient\"/></defs>"
                + "<use xlink:href=\"http://evil.com/x\"/>"
                + "<rect href=\"#localGradient\" width=\"1\" height=\"1\"/>"
                + "</svg>";

        String result = sanitize(svg);

        assertThat(result).doesNotContain("evil.com");
        assertThat(result).contains("href=\"#localGradient\"");
    }

    @Test
    void doctypeWithExternalEntityThrows() {
        String svg = "<?xml version=\"1.0\"?>"
                + "<!DOCTYPE svg [<!ENTITY xxe SYSTEM \"file:///etc/passwd\">]>"
                + "<svg xmlns=\"http://www.w3.org/2000/svg\"><text>&xxe;</text></svg>";

        assertThatThrownBy(() -> SvgSanitizer.sanitize(svg.getBytes(StandardCharsets.UTF_8)))
                .isInstanceOf(FileUploadException.class);
    }

    @Test
    void namespacePrefixedScriptElementIsStripped() {
        String svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:s=\"http://www.w3.org/2000/svg\">"
                + "<s:script>alert(1)</s:script>"
                + "<circle cx=\"1\" cy=\"1\" r=\"1\"/>"
                + "</svg>";

        String result = sanitize(svg);

        assertThat(result).doesNotContain("script");
        assertThat(result).doesNotContain("alert");
    }

    @Test
    void namespacePrefixedForeignObjectIsStripped() {
        String svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:s=\"http://www.w3.org/2000/svg\">"
                + "<s:foreignObject><div xmlns=\"http://www.w3.org/1999/xhtml\">hi</div></s:foreignObject>"
                + "<circle cx=\"1\" cy=\"1\" r=\"1\"/>"
                + "</svg>";

        String result = sanitize(svg);

        assertThat(result).doesNotContain("foreignObject");
        assertThat(result).doesNotContain("div");
    }

    @Test
    void foreignNamespaceElementIsStripped() {
        String svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:h=\"http://www.w3.org/1999/xhtml\">"
                + "<h:div>hi</h:div>"
                + "<circle cx=\"1\" cy=\"1\" r=\"1\"/>"
                + "</svg>";

        String result = sanitize(svg);

        assertThat(result).doesNotContain("div");
        assertThat(result).contains("circle");
    }

    @Test
    void remappedXlinkPrefixHrefIsStillSanitized() {
        String svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xl=\"http://www.w3.org/1999/xlink\">"
                + "<defs><linearGradient id=\"g1\"/></defs>"
                + "<use xl:href=\"http://evil.com/x\"/>"
                + "</svg>";

        String result = sanitize(svg);

        assertThat(result).doesNotContain("evil.com");
    }

    @Test
    void unprefixedHrefStillHonorsLocalFragmentRule() {
        String svg = "<svg xmlns=\"http://www.w3.org/2000/svg\">"
                + "<defs><linearGradient id=\"localGradient\"/></defs>"
                + "<rect href=\"#localGradient\" width=\"1\" height=\"1\"/>"
                + "<rect href=\"http://evil.com/x\" width=\"1\" height=\"1\"/>"
                + "</svg>";

        String result = sanitize(svg);

        assertThat(result).contains("href=\"#localGradient\"");
        assertThat(result).doesNotContain("evil.com");
    }

    @Test
    void unknownSvgNamespaceElementIsStripped() {
        String svg = "<svg xmlns=\"http://www.w3.org/2000/svg\">"
                + "<madeUpElement/>"
                + "<circle cx=\"1\" cy=\"1\" r=\"1\"/>"
                + "</svg>";

        String result = sanitize(svg);

        assertThat(result).doesNotContain("madeUpElement");
        assertThat(result).contains("circle");
    }

    private static String sanitize(String svg) {
        byte[] sanitized = SvgSanitizer.sanitize(svg.getBytes(StandardCharsets.UTF_8));
        return new String(sanitized, StandardCharsets.UTF_8);
    }
}
