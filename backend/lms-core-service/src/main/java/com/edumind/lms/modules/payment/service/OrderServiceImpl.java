package com.edumind.lms.modules.payment.service;

import com.edumind.common.response.ApiResponse;
import com.edumind.lms.modules.course.api.CourseQueryService;
import com.edumind.lms.modules.course.api.EnrollmentQueryService;
import com.edumind.lms.modules.course.api.dto.CourseInfo;
import com.edumind.lms.modules.payment.dto.request.CheckoutRequest;
import com.edumind.lms.modules.payment.dto.request.DirectCheckoutRequest;
import com.edumind.lms.modules.payment.dto.response.OrderItemResponse;
import com.edumind.lms.modules.payment.dto.response.OrderResponse;
import com.edumind.lms.modules.payment.dto.response.OrderSummaryResponse;
import com.edumind.lms.modules.payment.dto.response.OrderCountResponse;
import com.edumind.lms.modules.payment.entity.CartItem;
import com.edumind.lms.modules.payment.entity.Order;
import com.edumind.lms.modules.payment.entity.OrderItem;
import com.edumind.lms.modules.payment.enums.OrderStatus;
import com.edumind.lms.modules.payment.exception.CartEmptyException;
import com.edumind.lms.modules.payment.exception.InvalidOrderStateException;
import com.edumind.lms.modules.payment.exception.OrderNotFoundException;
import com.edumind.lms.modules.payment.repository.OrderItemRepository;
import com.edumind.lms.modules.payment.repository.OrderRepository;
import com.edumind.lms.shared.client.UserClient;
import com.edumind.lms.shared.dto.UserResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final NumberGeneratorService numberGeneratorService;
    private final CourseQueryService courseQueryService;
    private final EnrollmentQueryService enrollmentQueryService;
    private final UserClient userClient; // Injected

    @Override
    @Transactional(readOnly = true)
    public OrderResponse getOrderByIdAndUser(Long orderId, Long userId) {
        // Use EntityGraph to fetch order with items in a single query
        Order order = orderRepository.findWithItemsById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));
        
        // Verify ownership
        if (!order.getUserId().equals(userId)) {
            throw new OrderNotFoundException(orderId);
        }
        
        return buildOrderResponse(order);
    }

    @Override
    @Transactional(readOnly = true)
    public OrderResponse getOrderByNumberAndUser(String orderNumber, Long userId) {
        // Use EntityGraph to fetch order with items in a single query
        Order order = orderRepository.findWithItemsByOrderNumber(orderNumber)
                .orElseThrow(() -> new OrderNotFoundException(orderNumber));
        
        // Verify ownership
        if (!order.getUserId().equals(userId)) {
             throw new OrderNotFoundException(orderNumber);
        }

        return buildOrderResponse(order);
    }

    @Override
    @Transactional(readOnly = true)
    public Order getOrderEntity(Long orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<OrderSummaryResponse> getOrdersByUser(Long userId, Pageable pageable) {
        Page<Order> ordersPage = orderRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        return buildOrderSummaryPage(ordersPage);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<OrderSummaryResponse> getOrdersByUserAndStatus(Long userId, OrderStatus status, Pageable pageable) {
        Page<Order> ordersPage = orderRepository.findByUserIdAndStatus(userId, status, pageable);
        return buildOrderSummaryPage(ordersPage);
    }

    /**
     * Build order summary page with item counts and first item info.
     * Fetch first items separately to avoid LazyInitializationException
     * when accessing order.getItems() on detached entities from pagination.
     */
    private Page<OrderSummaryResponse> buildOrderSummaryPage(Page<Order> ordersPage) {
        List<Long> orderIds = ordersPage.getContent().stream()
                .map(Order::getId)
                .collect(Collectors.toList());

        Map<Long, Integer> itemCounts = new java.util.HashMap<>();
        Map<Long, OrderItem> firstItems = new java.util.HashMap<>();

        if (!orderIds.isEmpty()) {
            // Fetch item counts
            List<Object[]> counts = orderItemRepository.countItemsByOrderIds(orderIds);
            for (Object[] row : counts) {
                Long orderId = (Long) row[0];
                Long count = (Long) row[1];
                itemCounts.put(orderId, count.intValue());
            }

            // Fetch first items separately to avoid LazyInitializationException
            List<OrderItem> firstItemsList = orderItemRepository.findFirstItemsByOrderIds(orderIds);
            for (OrderItem item : firstItemsList) {
                firstItems.put(item.getOrder().getId(), item);
            }
        }

        return ordersPage.map(order -> buildOrderSummary(order,
                itemCounts.getOrDefault(order.getId(), 0),
                firstItems.get(order.getId())));
    }

    @Override
    @Transactional
    public void updateOrderStatus(Long orderId, OrderStatus status) {
        Order order = getOrderEntity(orderId);
        OrderStatus oldStatus = order.getStatus();

        order.setStatus(status);
        order.setUpdatedAt(LocalDateTime.now());

        orderRepository.save(order);

        log.info("Order {} status changed: {} -> {}", order.getOrderNumber(), oldStatus, status);
    }

    @Override
    @Transactional
    public void completeOrder(Long orderId) {
        Order order = getOrderEntity(orderId);

        if (order.getStatus() != OrderStatus.PENDING &&
                order.getStatus() != OrderStatus.PROCESSING) {
            throw new InvalidOrderStateException(orderId, order.getStatus(), "complete");
        }

        order.setStatus(OrderStatus.COMPLETED);
        order.setCompletedAt(LocalDateTime.now());
        order.setUpdatedAt(LocalDateTime.now());

        orderRepository.save(order);

        log.info("Order {} completed", order.getOrderNumber());
    }

    @Override
    @Transactional
    public void failOrder(Long orderId, String reason) {
        Order order = getOrderEntity(orderId);

        order.setStatus(OrderStatus.FAILED);
        order.setFailureReason(reason);
        order.setUpdatedAt(LocalDateTime.now());

        orderRepository.save(order);

        log.info("Order {} failed: {}", order.getOrderNumber(), reason);
    }

    @Override
    @Transactional
    public OrderResponse cancelOrder(Long orderId, Long userId) {
        // Use EntityGraph to fetch order with items in a single query
        Order order = orderRepository.findWithItemsById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));

        // Verify user owns the order
        if (!order.getUserId().equals(userId)) {
            throw new OrderNotFoundException(orderId);
        }

        // Can only cancel pending orders
        if (order.getStatus() != OrderStatus.PENDING) {
            throw new InvalidOrderStateException(orderId, order.getStatus(), "cancel");
        }

        order.setStatus(OrderStatus.CANCELLED);
        order.setUpdatedAt(LocalDateTime.now());

        orderRepository.save(order);

        log.info("Order {} cancelled by user {}", order.getOrderNumber(), userId);
        return buildOrderResponse(order);
    }

    /**
     * Request refund for a completed order.
     * Use dedicated refund fields instead of misusing failureReason.
     * Note: This marks the order as REFUNDED immediately. In production,
     * you would integrate with payment gateway refund API and possibly
     * use a REFUND_REQUESTED status for manual approval workflow.
     */
    @Override
    @Transactional
    public OrderResponse requestRefund(Long orderId, Long userId, String reason) {
        // Use EntityGraph to fetch order with items in a single query
        Order order = orderRepository.findWithItemsById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));

        // Verify user owns the order
        if (!order.getUserId().equals(userId)) {
            throw new OrderNotFoundException(orderId);
        }

        // Can only refund completed orders
        if (order.getStatus() != OrderStatus.COMPLETED) {
            throw new InvalidOrderStateException(orderId, order.getStatus(), "refund");
        }

        // TODO: Check refund window logic (e.g. 30 days) if needed
        // TODO: Integrate with payment gateway refund API

        // Use the new markAsRefunded(reason) method with dedicated fields
        order.markAsRefunded(reason);
        order.setUpdatedAt(LocalDateTime.now());

        orderRepository.save(order);

        log.info("Refund requested for order {} by user {}. Reason: {}",
                order.getOrderNumber(), userId, reason);
        return buildOrderResponse(order);
    }

    @Override
    @Transactional(readOnly = true)
    public OrderCountResponse getOrderCountsByUser(Long userId) {
        int total = (int) orderRepository.countByUserId(userId);
        
        List<Object[]> statusCounts = orderRepository.countStatusByUserId(userId);
        
        int pending = 0;
        int completed = 0;
        int failed = 0;
        int refunded = 0;
        int cancelled = 0;

        for (Object[] row : statusCounts) {
            OrderStatus status = (OrderStatus) row[0];
            int count = ((Long) row[1]).intValue();
            
            switch (status) {
                case PENDING -> pending += count;
                case PROCESSING -> pending += count;
                case COMPLETED -> completed += count;
                case FAILED -> failed += count;
                case REFUNDED -> refunded += count;
                case CANCELLED -> cancelled += count;
            }
        }
        
        return OrderCountResponse.builder()
                .total(total)
                .pending(pending)
                .completed(completed)
                .failed(failed)
                .refunded(refunded)
                .cancelled(cancelled)
                .build();
    }

    /**
     * Create order from cart items.
     * Validate items BEFORE creating order to avoid orphan orders in database.
     */
    @Override
    @Transactional
    public Order createOrderFromCart(Long userId, List<CartItem> cartItems, CheckoutRequest request) {
        log.debug("Creating order from cart for user: {}", userId);

        // Validate items BEFORE creating order to avoid orphan orders in database.
        List<Long> courseIds = cartItems.stream()
                .map(CartItem::getCourseId)
                .collect(Collectors.toList());

        Map<Long, CourseInfo> coursesMap = courseQueryService.getCourseInfoBatch(courseIds);

        Set<Long> enrolledCourseIds = new HashSet<>(enrollmentQueryService.findEnrolledCourseIds(userId, courseIds));

        // Pre-validate: count valid items before creating order
        List<CartItem> validCartItems = cartItems.stream()
                .filter(cartItem -> {
                    CourseInfo course = coursesMap.get(cartItem.getCourseId());
                    return course != null
                            && course.isPublished()
                            && !enrolledCourseIds.contains(course.id());
                })
                .collect(Collectors.toList());

        if (validCartItems.isEmpty()) {
            throw new CartEmptyException("No valid items to checkout (Courses may have been unpublished or already purchased)");
        }

        // Now safe to create order
        Order order = new Order();
        order.setOrderNumber(numberGeneratorService.generateOrderNumber());
        order.setUserId(userId);
        order.setStatus(OrderStatus.PENDING);
        order.setPaymentMethod(request.getPaymentMethod());
        order.setCurrency("USD");
        order.setCreatedAt(LocalDateTime.now());
        order.setUpdatedAt(LocalDateTime.now());
        // Set a reasonable expiration window for payment (e.g., 30 minutes)
        order.setExpiresAt(LocalDateTime.now().plusMinutes(30));

        // Audit: client metadata
        order.setIpAddress(request.getIpAddress());
        order.setUserAgent(request.getUserAgent());

        // Customer info
        fillCustomerDetails(order, request.getCustomerName(), request.getCustomerEmail());
        order.setBillingAddress(request.getBillingAddress());

        // Set idempotency key if provided
        if (request.getIdempotencyKey() != null && !request.getIdempotencyKey().isBlank()) {
            order.setIdempotencyKey(request.getIdempotencyKey());
        }

        order = orderRepository.save(order);

        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal totalDiscount = BigDecimal.ZERO;

        for (CartItem cartItem : validCartItems) {
            CourseInfo course = coursesMap.get(cartItem.getCourseId());

            BigDecimal originalPrice = course.originalPrice() != null ? course.originalPrice() : BigDecimal.ZERO;
            BigDecimal finalPrice = course.effectivePrice() != null ? course.effectivePrice() : BigDecimal.ZERO;
            BigDecimal discount = originalPrice.subtract(finalPrice);

            OrderItem item = new OrderItem();
            item.setOrder(order);
            item.setCourseId(course.id());
            item.setCourseTitle(course.title());
            item.setCourseSlug(course.slug());
            item.setCourseThumbnailUrl(course.thumbnailUrl());
            item.setInstructorId(course.instructorId());
            item.setInstructorName(course.instructorName());
            item.setFinalPrice(finalPrice);
            item.setOriginalPrice(originalPrice);
            item.setDiscountAmount(discount);
            item.setCurrency(course.currency() != null ? course.currency() : "USD");

            orderItemRepository.save(item);

            subtotal = subtotal.add(originalPrice);
            totalDiscount = totalDiscount.add(discount);
        }

        order.setSubtotal(subtotal);
        order.setDiscountTotal(totalDiscount);
        order.setTotalAmount(subtotal.subtract(totalDiscount));

        return orderRepository.save(order);
    }

    /**
     * Create order from a single course (direct checkout).
     * Use getOriginalPrice() consistently with createOrderFromCart.
     */
    @Override
    @Transactional
    public Order createOrderFromSingleCourse(Long userId, CourseInfo course, DirectCheckoutRequest request) {
        log.debug("Creating order from single course for user: {}, course: {}", userId, course.id());

        Order order = new Order();
        order.setOrderNumber(numberGeneratorService.generateOrderNumber());
        order.setUserId(userId);
        order.setStatus(OrderStatus.PENDING);
        order.setPaymentMethod(request.getPaymentMethod());
        order.setCurrency("USD");
        order.setCreatedAt(LocalDateTime.now());
        order.setUpdatedAt(LocalDateTime.now());
        order.setExpiresAt(LocalDateTime.now().plusMinutes(30));

        // Audit: client metadata
        order.setIpAddress(request.getIpAddress());
        order.setUserAgent(request.getUserAgent());

        fillCustomerDetails(order, request.getCustomerName(), request.getCustomerEmail());

        order = orderRepository.save(order);

        // Use getOriginalPrice() consistently with createOrderFromCart
        BigDecimal originalPrice = course.originalPrice() != null ? course.originalPrice() : BigDecimal.ZERO;
        BigDecimal effectivePrice = course.effectivePrice() != null ? course.effectivePrice() : BigDecimal.ZERO;
        BigDecimal discount = originalPrice.subtract(effectivePrice);

        OrderItem item = new OrderItem();
        item.setOrder(order);
        item.setCourseId(course.id());
        item.setCourseTitle(course.title());
        item.setCourseSlug(course.slug());
        item.setCourseThumbnailUrl(course.thumbnailUrl());
        item.setInstructorId(course.instructorId());
        item.setInstructorName(course.instructorName());
        item.setFinalPrice(effectivePrice);
        item.setOriginalPrice(originalPrice);
        item.setDiscountAmount(discount);
        item.setCurrency(course.currency() != null ? course.currency() : "USD");

        orderItemRepository.save(item);

        order.setSubtotal(originalPrice);
        order.setDiscountTotal(discount);
        order.setTotalAmount(effectivePrice);

        return orderRepository.save(order);
    }

    // ===== Private Helpers =====

    private OrderResponse buildOrderResponse(Order order) {
        // Use items from order if already loaded (via EntityGraph), otherwise fetch
        Collection<OrderItem> items = order.getItems() != null && !order.getItems().isEmpty()
                ? order.getItems()
                : orderItemRepository.findByOrderId(order.getId());

        List<OrderItemResponse> itemResponses = items.stream()
                .map(this::buildOrderItemResponse)
                .collect(Collectors.toList());

        OrderResponse response = OrderResponse.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .userId(order.getUserId())
                .status(order.getStatus())
                .items(itemResponses)
                .itemCount(itemResponses.size())
                .subtotal(order.getSubtotal())
                .discountTotal(order.getDiscountTotal())
                .totalAmount(order.getTotalAmount())
                .currency(order.getCurrency())
                .paymentMethod(order.getPaymentMethod())
                .createdAt(order.getCreatedAt())
                .completedAt(order.getCompletedAt())
                .failureReason(order.getFailureReason())
                .build();
                
        return response;
    }

    private OrderItemResponse buildOrderItemResponse(OrderItem item) {
        return OrderItemResponse.builder()
                .id(item.getId())
                .courseId(item.getCourseId())
                .courseTitle(item.getCourseTitle())
                .courseSlug(item.getCourseSlug())
                .courseThumbnailUrl(item.getCourseThumbnailUrl())
                .instructorId(item.getInstructorId())
                .instructorName(item.getInstructorName())
                .finalPrice(item.getFinalPrice())
                .originalPrice(item.getOriginalPrice())
                .discountAmount(item.getDiscountAmount())
                .currency(item.getCurrency() != null ? item.getCurrency() : "USD")
                .createdAt(item.getCreatedAt())
                .build();
    }

    /**
     * Build order summary response.
     * Accept firstItem as parameter instead of accessing lazy collection.
     */
    private OrderSummaryResponse buildOrderSummary(Order order, int itemCount, OrderItem firstItem) {
        return OrderSummaryResponse.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .status(order.getStatus())
                .itemCount(itemCount)
                .totalAmount(order.getTotalAmount())
                .currency(order.getCurrency())
                .firstCourseTitle(firstItem != null ? firstItem.getCourseTitle() : null)
                .firstCourseThumbnail(firstItem != null ? firstItem.getCourseThumbnailUrl() : null)
                .createdAt(order.getCreatedAt())
                .completedAt(order.getCompletedAt())
                .build();
    }

    /**
     * Fill customer details from request or fetch from UserClient.
     * Don't use fake fallback email - log warning instead.
     * The order can still be created but invoicing may fail if email is invalid.
     */
    private void fillCustomerDetails(Order order, String reqName, String reqEmail) {
        String name = reqName;
        String email = reqEmail;

        if (name == null || email == null) {
            try {
                ApiResponse<UserResponse> userResponse = userClient.getCurrentUser();
                if (userResponse != null && userResponse.getData() != null) {
                    if (email == null) email = userResponse.getData().getEmail();
                    if (name == null) {
                        String first = userResponse.getData().getFirstName();
                        String last = userResponse.getData().getLastName();
                        name = (first != null ? first : "") + " " + (last != null ? last : "");
                        name = name.trim();
                        if (name.isEmpty()) name = userResponse.getData().getDisplayName();
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to fetch user details for order creation: {}", e.getMessage());
            }
        }

        // Log warning for missing email instead of using fake fallback
        // This preserves data integrity - better to have null than invalid email
        if (email == null || email.isBlank()) {
            log.warn("Order created without valid customer email. Invoice generation may fail.");
            // Still set a placeholder so order creation doesn't fail,
            // but mark it clearly as missing for admin attention
            email = null; // Keep as null - invoice service should handle this gracefully
        }

        if (name == null || name.isBlank()) {
            name = "Customer"; // Generic but not fake like "Unknown User"
        }

        order.setCustomerName(name);
        order.setCustomerEmail(email);
    }
}
