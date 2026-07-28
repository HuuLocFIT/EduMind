package com.edumind.lms.modules.course.service;

import com.edumind.lms.modules.course.entity.Enrollment;
import com.itextpdf.io.font.PdfEncodings;
import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.TextAlignment;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import com.edumind.lms.modules.course.config.CertificateConstants;
import org.springframework.web.util.UriComponentsBuilder;
import java.time.format.DateTimeFormatter;

@Slf4j
@Component
public class CertificatePdfGenerator {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("MMMM dd, yyyy");

    private static final String FONT_REGULAR = "/fonts/NotoSans-Regular.ttf";
    private static final String FONT_BOLD = "/fonts/NotoSans-Bold.ttf";

    /**
     * Generates a certificate of completion PDF for the given enrollment.
     *
     * @param enrollment          the completed enrollment
     * @param studentName         the student's display name
     * @param totalHours          total course hours (rounded to 1 decimal)
     * @param verificationBaseUrl base URL for certificate verification
     * @return PDF bytes
     */
    public byte[] generate(Enrollment enrollment, String studentName, double totalHours, String verificationBaseUrl) {
        try {
            return createPdf(enrollment, studentName, totalHours, verificationBaseUrl);
        } catch (IOException e) {
            log.error("Failed to generate certificate PDF for enrollment {}: {}",
                    enrollment.getId(), e.getMessage(), e);
            throw new RuntimeException("Failed to generate certificate PDF: " + e.getMessage(), e);
        }
    }

    private byte[] createPdf(Enrollment enrollment, String studentName, double totalHours,
                             String verificationBaseUrl) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (PdfWriter writer = new PdfWriter(baos);
             PdfDocument pdfDoc = new PdfDocument(writer);
             Document document = new Document(pdfDoc)) {

            PdfFont fontBold = loadFont(FONT_BOLD, StandardFonts.HELVETICA_BOLD);
            PdfFont fontNormal = loadFont(FONT_REGULAR, StandardFonts.HELVETICA);

            // --- Header: EduMind Branding ---
            Paragraph branding = new Paragraph("EDUMIND")
                    .setFont(fontBold)
                    .setFontSize(28)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontColor(ColorConstants.DARK_GRAY)
                    .setMarginBottom(4);
            document.add(branding);

            // Horizontal rule
            Paragraph hr = new Paragraph("____________________________________________________")
                    .setFont(fontNormal)
                    .setFontSize(10)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontColor(ColorConstants.LIGHT_GRAY)
                    .setMarginBottom(20);
            document.add(hr);

            // --- Title ---
            Paragraph title = new Paragraph("Certificate of Completion")
                    .setFont(fontBold)
                    .setFontSize(24)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(30);
            document.add(title);

            // --- Body ---
            Paragraph certify = new Paragraph("This is to certify that")
                    .setFont(fontNormal)
                    .setFontSize(14)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(10);
            document.add(certify);

            // Student name
            Paragraph namePara = new Paragraph(studentName)
                    .setFont(fontBold)
                    .setFontSize(22)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(10);
            document.add(namePara);

            Paragraph completed = new Paragraph("has successfully completed the course")
                    .setFont(fontNormal)
                    .setFontSize(14)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(10);
            document.add(completed);

            // Course title
            Paragraph courseTitle = new Paragraph(enrollment.getCourse().getTitle())
                    .setFont(fontBold)
                    .setFontSize(18)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(30);
            document.add(courseTitle);

            // --- Details Section ---
            String completionDate = enrollment.getCompletedAt() != null
                    ? enrollment.getCompletedAt().format(DATE_FORMATTER)
                    : "N/A";

            String hoursFormatted = totalHours > 0
                    ? String.format("%.1f hours", totalHours)
                    : "N/A";

            String reference = enrollment.getCertificateReference() != null
                    ? enrollment.getCertificateReference()
                    : "N/A";

            String verifyUrl = UriComponentsBuilder.fromUriString(verificationBaseUrl)
                    .path(CertificateConstants.VERIFICATION_BASE_PATH)
                    .path(reference)
                    .toUriString();

            // Instructor
            addDetailLine(document, fontBold, fontNormal, "Instructor: ",
                    enrollment.getCourse().getInstructorName());
            addDetailLine(document, fontBold, fontNormal, "Completion Date: ", completionDate);
            addDetailLine(document, fontBold, fontNormal, "Total Course Hours: ", hoursFormatted);
            document.add(new Paragraph(" ").setMarginBottom(10));

            // Certificate reference
            addDetailLine(document, fontBold, fontNormal, "Certificate Reference: ", reference);
            addDetailLine(document, fontBold, fontNormal, "Verify at: ", verifyUrl);

            // --- Footer Disclaimer ---
            document.add(new Paragraph(" ").setMarginBottom(20));
            Paragraph hr2 = new Paragraph("____________________________________________________")
                    .setFont(fontNormal)
                    .setFontSize(10)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontColor(ColorConstants.LIGHT_GRAY)
                    .setMarginBottom(15);
            document.add(hr2);

            Paragraph disclaimer = new Paragraph()
                    .setFont(fontNormal)
                    .setFontSize(8)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setFontColor(ColorConstants.GRAY)
                    .setMarginBottom(20);
            disclaimer.add(new Text("EduMind is not an accredited institution. This certificate of completion is not an official degree, diploma, or professional certification. It demonstrates skills and accomplishments in the stated course and cannot be used for formal academic or professional accreditation purposes."));
            document.add(disclaimer);
        }
        return baos.toByteArray();
    }

    private void addDetailLine(Document document, PdfFont fontBold, PdfFont fontNormal,
                               String label, String value) {
        Paragraph line = new Paragraph()
                .setFont(fontNormal)
                .setFontSize(12)
                .setMarginBottom(4);
        line.add(new Text(label).setFont(fontBold));
        line.add(new Text(value));
        document.add(line);
    }

    private PdfFont loadFont(String fontPath, String fallbackFont) {
        try {
            return PdfFontFactory.createFont(fontPath, PdfEncodings.IDENTITY_H, PdfFontFactory.EmbeddingStrategy.PREFER_EMBEDDED);
        } catch (IOException e) {
            log.warn("Failed to load font {}, falling back to {}", fontPath, fallbackFont);
            try {
                return PdfFontFactory.createFont(fallbackFont);
            } catch (IOException ex) {
                throw new RuntimeException("Failed to create fallback font: " + fallbackFont, ex);
            }
        }
    }
}
