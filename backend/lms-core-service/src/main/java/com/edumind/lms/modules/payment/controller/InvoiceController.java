package com.edumind.lms.modules.payment.controller;

import com.edumind.common.response.ApiResponse;
import com.edumind.lms.modules.payment.dto.response.InvoiceResponse;
import com.edumind.lms.modules.payment.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/invoices")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasAnyRole('STUDENT', 'TEACHER')")
public class InvoiceController {

    private final InvoiceService invoiceService;

    // ==================== Invoice List ====================

    /**
     * Get current user's invoices (paginated)
     * GET /invoices
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<InvoiceResponse>>> getMyInvoices(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortOrder,
            Authentication authentication) {

        Long userId = extractUserId(authentication);
        log.debug("User {} fetching invoices", userId);

        Sort sort = sortOrder.equalsIgnoreCase("asc")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<InvoiceResponse> invoices = invoiceService.getUserInvoices(userId, pageable);

        return ResponseEntity.ok(ApiResponse.success(invoices));
    }

    // ==================== Invoice Details ====================

    /**
     * Get invoice detail by ID
     * GET /invoices/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<InvoiceResponse>> getInvoiceById(
            @PathVariable Long id,
            Authentication authentication) {

        Long userId = extractUserId(authentication);
        log.debug("User {} fetching invoice {}", userId, id);

        InvoiceResponse invoice = invoiceService.getInvoiceByIdAndUser(id, userId);

        return ResponseEntity.ok(ApiResponse.success(invoice));
    }

    /**
     * Get invoice by invoice number
     * GET /invoices/number/{invoiceNumber}
     */
    @GetMapping("/number/{invoiceNumber}")
    public ResponseEntity<ApiResponse<InvoiceResponse>> getInvoiceByNumber(
            @PathVariable String invoiceNumber,
            Authentication authentication) {

        Long userId = extractUserId(authentication);
        log.debug("User {} fetching invoice by number {}", userId, invoiceNumber);

        InvoiceResponse invoice = invoiceService.getInvoiceByNumberAndUser(invoiceNumber, userId);

        return ResponseEntity.ok(ApiResponse.success(invoice));
    }

    /**
     * Get invoice by order ID
     * GET /invoices/order/{orderId}
     */
    @GetMapping("/order/{orderId}")
    public ResponseEntity<ApiResponse<InvoiceResponse>> getInvoiceByOrderId(
            @PathVariable Long orderId,
            Authentication authentication) {

        Long userId = extractUserId(authentication);
        log.debug("User {} fetching invoice for order {}", userId, orderId);

        InvoiceResponse invoice = invoiceService.getInvoiceByOrderIdAndUser(orderId, userId);

        return ResponseEntity.ok(ApiResponse.success(invoice));
    }

    // ==================== Invoice Download ====================

    /**
     * Download invoice as PDF
     * GET /invoices/{id}/download
     */
    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadInvoicePdf(
            @PathVariable Long id,
            Authentication authentication) {

        Long userId = extractUserId(authentication);
        log.info("User {} downloading invoice {} as PDF", userId, id);

        // Get invoice to verify ownership and get invoice number
        InvoiceResponse invoice = invoiceService.getInvoiceByIdAndUser(id, userId);

        // Generate PDF
        byte[] pdfContent = invoiceService.generateInvoicePdfBytes(id);

        ByteArrayResource resource = new ByteArrayResource(pdfContent);

        String filename = String.format("%s.pdf", invoice.getInvoiceNumber());

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(pdfContent.length)
                .body(resource);
    }

    /**
     * View invoice PDF in browser
     * GET /invoices/{id}/view
     */
    @GetMapping("/{id}/view")
    public ResponseEntity<Resource> viewInvoicePdf(
            @PathVariable Long id,
            Authentication authentication) {

        Long userId = extractUserId(authentication);
        log.info("User {} viewing invoice {} as PDF", userId, id);

        // Get invoice to verify ownership
        InvoiceResponse invoice = invoiceService.getInvoiceByIdAndUser(id, userId);

        // Generate PDF
        byte[] pdfContent = invoiceService.generateInvoicePdfBytes(id);

        ByteArrayResource resource = new ByteArrayResource(pdfContent);

        String filename = String.format("%s.pdf", invoice.getInvoiceNumber());

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(pdfContent.length)
                .body(resource);
    }

    // ==================== Helper Methods ====================

    private Long extractUserId(Authentication authentication) {
        return Long.parseLong(authentication.getName());
    }
}