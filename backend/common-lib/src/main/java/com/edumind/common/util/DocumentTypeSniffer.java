package com.edumind.common.util;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

public final class DocumentTypeSniffer {

    private static final byte[] PDF_MAGIC = {0x25, 0x50, 0x44, 0x46};
    private static final byte[] ZIP_MAGIC = {0x50, 0x4B, 0x03, 0x04};
    private static final int MAX_ZIP_ENTRIES_SCANNED = 50;

    private DocumentTypeSniffer() {
    }

    /**
     * Sniffs the real content type of the given bytes, ignoring any client-supplied
     * Content-Type header, since that header is fully attacker-controlled.
     */
    public static String sniff(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            return null;
        }

        if (startsWith(bytes, PDF_MAGIC)) {
            return "application/pdf";
        }

        if (startsWith(bytes, ZIP_MAGIC)) {
            return sniffZipEntries(bytes);
        }

        return null;
    }

    private static String sniffZipEntries(byte[] bytes) {
        try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(bytes))) {
            int scanned = 0;
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null && scanned < MAX_ZIP_ENTRIES_SCANNED) {
                String name = entry.getName();
                if ("word/document.xml".equals(name)) {
                    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                }
                if ("ppt/presentation.xml".equals(name)) {
                    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
                }
                if ("xl/workbook.xml".equals(name)) {
                    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                }
                scanned++;
            }
            return "application/zip";
        } catch (IOException e) {
            return null;
        }
    }

    private static boolean startsWith(byte[] bytes, byte[] prefix) {
        if (bytes.length < prefix.length) {
            return false;
        }
        for (int i = 0; i < prefix.length; i++) {
            if (bytes[i] != prefix[i]) {
                return false;
            }
        }
        return true;
    }
}
