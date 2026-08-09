package com.edumind.common.util;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class FileTypeSnifferTest {

    @Test
    void detectsPngMagicBytes() {
        byte[] png = new byte[]{
                (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00
        };

        assertThat(FileTypeSniffer.sniff(png)).isEqualTo("image/png");
    }

    @Test
    void detectsJpegMagicBytes() {
        byte[] jpeg = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x00, 0x00};

        assertThat(FileTypeSniffer.sniff(jpeg)).isEqualTo("image/jpeg");
    }

    @Test
    void detectsWebpMagicBytes() {
        byte[] webp = "RIFF0000WEBPVP8 ".getBytes(StandardCharsets.US_ASCII);

        assertThat(FileTypeSniffer.sniff(webp)).isEqualTo("image/webp");
    }

    @Test
    void detectsSvgContentRegardlessOfDeclaredType() {
        String svg = "<svg xmlns=\"http://www.w3.org/2000/svg\"><circle cx=\"1\" cy=\"1\" r=\"1\"/></svg>";

        assertThat(FileTypeSniffer.sniff(svg.getBytes(StandardCharsets.UTF_8))).isEqualTo("image/svg+xml");
    }

    @Test
    void returnsNullForUnrecognizedBytes() {
        byte[] garbage = "not a real file".getBytes(StandardCharsets.UTF_8);

        assertThat(FileTypeSniffer.sniff(garbage)).isNull();
    }

    @Test
    void returnsNullForEmptyBytes() {
        assertThat(FileTypeSniffer.sniff(new byte[0])).isNull();
        assertThat(FileTypeSniffer.sniff(null)).isNull();
    }
}
