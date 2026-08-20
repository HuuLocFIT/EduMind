package com.edumind.common.util;

import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.assertj.core.api.Assertions.assertThat;

class DocumentTypeSnifferTest {

    @Test
    void detectsPdfMagicBytes() {
        byte[] pdf = "%PDF-1.4 rest of file".getBytes(StandardCharsets.US_ASCII);

        assertThat(DocumentTypeSniffer.sniff(pdf)).isEqualTo("application/pdf");
    }

    @Test
    void detectsDocxByZipEntry() throws IOException {
        byte[] docx = zipWithEntry("word/document.xml");

        assertThat(DocumentTypeSniffer.sniff(docx))
                .isEqualTo("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    }

    @Test
    void detectsPptxByZipEntry() throws IOException {
        byte[] pptx = zipWithEntry("ppt/presentation.xml");

        assertThat(DocumentTypeSniffer.sniff(pptx))
                .isEqualTo("application/vnd.openxmlformats-officedocument.presentationml.presentation");
    }

    @Test
    void detectsXlsxByZipEntry() throws IOException {
        byte[] xlsx = zipWithEntry("xl/workbook.xml");

        assertThat(DocumentTypeSniffer.sniff(xlsx))
                .isEqualTo("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    }

    @Test
    void detectsPlainZipWhenNoOoxmlEntryMatches() throws IOException {
        byte[] zip = zipWithEntry("some/unrelated/file.txt");

        assertThat(DocumentTypeSniffer.sniff(zip)).isEqualTo("application/zip");
    }

    @Test
    void returnsNullForGarbageBytes() {
        byte[] garbage = "not a real document".getBytes(StandardCharsets.UTF_8);

        assertThat(DocumentTypeSniffer.sniff(garbage)).isNull();
    }

    @Test
    void returnsNullForMalformedZipInsteadOfThrowing() {
        // Local file header with a name-length field far larger than the bytes present,
        // forcing an EOFException while ZipInputStream reads the (fake) entry name.
        ByteBuffer buf = ByteBuffer.allocate(30).order(ByteOrder.LITTLE_ENDIAN);
        buf.putInt(0x04034b50); // local file header signature
        buf.putShort((short) 0); // version needed
        buf.putShort((short) 0); // flags
        buf.putShort((short) 0); // compression method
        buf.putShort((short) 0); // mod time
        buf.putShort((short) 0); // mod date
        buf.putInt(0); // crc-32
        buf.putInt(0); // compressed size
        buf.putInt(0); // uncompressed size
        buf.putShort((short) 5000); // file name length (bogus, nothing follows)
        buf.putShort((short) 0); // extra field length
        byte[] malformed = buf.array();

        assertThat(DocumentTypeSniffer.sniff(malformed)).isNull();
    }

    @Test
    void returnsNullForEmptyOrNullBytes() {
        assertThat(DocumentTypeSniffer.sniff(new byte[0])).isNull();
        assertThat(DocumentTypeSniffer.sniff(null)).isNull();
    }

    private static byte[] zipWithEntry(String entryName) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(out)) {
            zos.putNextEntry(new ZipEntry(entryName));
            zos.write("content".getBytes(StandardCharsets.UTF_8));
            zos.closeEntry();
        }
        return out.toByteArray();
    }
}
