package com.edumind.lms.modules.payment.controller;

import com.edumind.common.response.ApiResponse;
import com.edumind.common.response.PagedResponse;
import com.edumind.lms.modules.payment.dto.response.OrderResponse;
import com.edumind.lms.modules.payment.dto.response.OrderSummaryResponse;
import com.edumind.lms.modules.payment.dto.response.OrderCountResponse;
import com.edumind.lms.modules.payment.enums.OrderStatus;
import com.edumind.lms.modules.payment.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/orders")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("@teacherSecurity.isActiveTeacherOrStudent(authentication.principal.userId)")
public class OrderController {

    private final OrderService orderService;

    // ==================== Order List ====================

    /**
     * Get current user's orders (paginated)
     * GET /orders
     */
    @GetMapping
    public ResponseEntity<PagedResponse<OrderSummaryResponse>> getMyOrders(
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortOrder,
            Authentication authentication) {

        Long userId = extractUserId(authentication);
        log.debug("User {} fetching orders, status filter: {}", userId, status);

        Sort sort = sortOrder.equalsIgnoreCase("asc")
                ? Sort.by(sortBy).ascending()
                : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<OrderSummaryResponse> orders;
        if (status != null) {
            orders = orderService.getOrdersByUserAndStatus(userId, status, pageable);
        } else {
            orders = orderService.getOrdersByUser(userId, pageable);
        }

        return ResponseEntity.ok(PagedResponse.of(
                orders.getContent(),
                orders.getNumber(),
                orders.getSize(),
                orders.getTotalElements(),
                orders.getTotalPages()));
    }

    // ==================== Order Details ====================

    /**
     * Get order detail by ID
     * GET /orders/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrderById(
            @PathVariable Long id,
            Authentication authentication) {

        Long userId = extractUserId(authentication);
        log.debug("User {} fetching order {}", userId, id);

        OrderResponse order = orderService.getOrderByIdAndUser(id, userId);

        return ResponseEntity.ok(ApiResponse.success(order));
    }

    /**
     * Get order detail by order number
     * GET /orders/number/{orderNumber}
     */
    @GetMapping("/number/{orderNumber}")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrderByNumber(
            @PathVariable String orderNumber,
            Authentication authentication) {

        Long userId = extractUserId(authentication);
        log.debug("User {} fetching order by number {}", userId, orderNumber);

        OrderResponse order = orderService.getOrderByNumberAndUser(orderNumber, userId);

        return ResponseEntity.ok(ApiResponse.success(order));
    }

    // ==================== Order Actions ====================

    /**
     * Cancel a pending order
     * Only orders with status PENDING can be cancelled
     * POST /orders/{id}/cancel
     */
    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<OrderResponse>> cancelOrder(
            @PathVariable Long id,
            Authentication authentication) {

        Long userId = extractUserId(authentication);
        log.info("User {} cancelling order {}", userId, id);

        OrderResponse order = orderService.cancelOrder(id, userId);

        return ResponseEntity.ok(ApiResponse.success("Order cancelled successfully", order));
    }

    /**
     * Request refund for a completed order
     * Only orders with status COMPLETED can be refunded (within refund window)
     * POST /orders/{id}/refund
     */
    @PostMapping("/{id}/refund")
    public ResponseEntity<ApiResponse<OrderResponse>> requestRefund(
            @PathVariable Long id,
            @RequestParam(required = false) String reason,
            Authentication authentication) {

        Long userId = extractUserId(authentication);
        log.info("User {} requesting refund for order {}, reason: {}", userId, id, reason);

        OrderResponse order = orderService.requestRefund(id, userId, reason);

        return ResponseEntity.ok(ApiResponse.success("Refund request submitted", order));
    }

    // ==================== Order Statistics ====================

    /**
     * Get order count by status
     * GET /orders/count
     */
    @GetMapping("/count")
    public ResponseEntity<ApiResponse<OrderCountResponse>> getOrderCounts(
            Authentication authentication) {

        Long userId = extractUserId(authentication);
        OrderCountResponse counts = orderService.getOrderCountsByUser(userId);

        return ResponseEntity.ok(ApiResponse.success(counts));
    }

    // ==================== Helper Methods ====================

    private Long extractUserId(Authentication authentication) {
        return Long.valueOf(authentication.getPrincipal().toString());
    }


}
