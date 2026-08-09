package com.edumind.common.util;

import org.w3c.dom.Document;
import org.w3c.dom.Element;

public final class FileTypeSniffer {

    private static final byte[] PNG_MAGIC = {
            (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
    };
    private static final byte[] JPEG_MAGIC = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] RIFF = "RIFF".getBytes(java.nio.charset.StandardCharsets.US_ASCII);
    private static final byte[] WEBP = "WEBP".getBytes(java.nio.charset.StandardCharsets.US_ASCII);

    private FileTypeSniffer() {
    }

    /**
     * Sniffs the real content type of the given bytes, ignoring any client-supplied
     * Content-Type header, since that header is fully attacker-controlled.
     */
    public static String sniff(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            return null;
        }

        if (startsWith(bytes, PNG_MAGIC, 0)) {
            return "image/png";
        }

        if (startsWith(bytes, JPEG_MAGIC, 0)) {
            return "image/jpeg";
        }

        if (bytes.length >= 12 && startsWith(bytes, RIFF, 0) && startsWith(bytes, WEBP, 8)) {
            return "image/webp";
        }

        if (isSvg(bytes)) {
            return "image/svg+xml";
        }

        return null;
    }

    private static boolean isSvg(byte[] bytes) {
        try {
            Document document = SvgSanitizer.parseSvgDocument(bytes);
            Element root = document.getDocumentElement();
            return root != null
                    && SvgSanitizer.SVG_NS.equals(root.getNamespaceURI())
                    && "svg".equals(root.getLocalName());
        } catch (RuntimeException e) {
            return false;
        }
    }

    private static boolean startsWith(byte[] bytes, byte[] prefix, int offset) {
        if (bytes.length < offset + prefix.length) {
            return false;
        }
        for (int i = 0; i < prefix.length; i++) {
            if (bytes[offset + i] != prefix[i]) {
                return false;
            }
        }
        return true;
    }
}
