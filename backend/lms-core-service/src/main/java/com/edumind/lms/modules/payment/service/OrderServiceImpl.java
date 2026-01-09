package com.edumind.lms.modules.payment.service;

import com.edumind.common.response.ApiResponse;
import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.repository.CourseRepository;
import com.edumind.lms.modules.course.repository.EnrollmentRepository;
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
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final NumberGeneratorService numberGeneratorService;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;
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

    private Page<OrderSummaryResponse> buildOrderSummaryPage(Page<Order> ordersPage) {
        List<Long> orderIds = ordersPage.getContent().stream()
                .map(Order::getId)
                .collect(Collectors.toList());

        Map<Long, Integer> itemCounts = new java.util.HashMap<>();
        if (!orderIds.isEmpty()) {
            List<Object[]> counts = orderItemRepository.countItemsByOrderIds(orderIds);
            for (Object[] row : counts) {
                Long orderId = (Long) row[0];
                Long count = (Long) row[1];
                itemCounts.put(orderId, count.intValue());
            }
        }

        return ordersPage.map(order -> buildOrderSummary(order, itemCounts.getOrDefault(order.getId(), 0)));
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

        order.setStatus(OrderStatus.REFUNDED); // Or REFUND_REQUESTED if manual approval needed
        // For now simplifying to refunded state as per requirement or maybe PROCESSING_REFUND
        // Assuming immediate refund or request marking:
        order.setFailureReason("Refund requested: " + reason); // Using failure reason to store refund reason for now
        order.setUpdatedAt(LocalDateTime.now());

        orderRepository.save(order);
        
        log.info("Refund requested for order {} by user {}", order.getOrderNumber(), userId);
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

    @Override
    @Transactional
    public Order createOrderFromCart(Long userId, List<CartItem> cartItems, CheckoutRequest request) {
        log.debug("Creating order from cart for user: {}", userId);

        Order order = new Order();
        order.setOrderNumber(numberGeneratorService.generateOrderNumber());
        order.setUserId(userId);
        order.setStatus(OrderStatus.PENDING);
        order.setPaymentMethod(request.getPaymentMethod());
        order.setCurrency("USD");
        order.setCreatedAt(LocalDateTime.now());
        order.setUpdatedAt(LocalDateTime.now());

        // Customer info
        fillCustomerDetails(order, request.getCustomerName(), request.getCustomerEmail());
        order.setBillingAddress(request.getBillingAddress());

        order = orderRepository.save(order);

        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal totalDiscount = BigDecimal.ZERO;
        int validItemsCount = 0;

        List<Long> courseIds = cartItems.stream()
                .map(CartItem::getCourseId)
                .collect(Collectors.toList());

        Map<Long, Course> coursesMap = courseRepository.findAllById(courseIds).stream()
                .collect(Collectors.toMap(Course::getId, Function.identity()));

        Set<Long> enrolledCourseIds = new HashSet<>(
                enrollmentRepository.findEnrolledCourseIds(userId, courseIds));

        for (CartItem cartItem : cartItems) {
            Course course = coursesMap.get(cartItem.getCourseId());
            if (course == null || !course.isPublished()) continue;
            if (enrolledCourseIds.contains(course.getId())) continue;

            BigDecimal originalPrice = course.getOriginalPrice();
            BigDecimal finalPrice = course.getEffectivePrice();
            BigDecimal discount = originalPrice.subtract(finalPrice);

            OrderItem item = new OrderItem();
            item.setOrder(order);
            item.setCourseId(course.getId());
            item.setCourseTitle(course.getTitle());
            item.setCourseSlug(course.getSlug());
            item.setCourseThumbnailUrl(course.getThumbnailUrl());
            item.setInstructorId(course.getInstructorId());
            item.setInstructorName(course.getInstructorName());
            item.setFinalPrice(finalPrice);
            item.setOriginalPrice(originalPrice);
            item.setDiscountAmount(discount);
            item.setCurrency("USD");

            orderItemRepository.save(item);

            subtotal = subtotal.add(originalPrice);
            totalDiscount = totalDiscount.add(discount);
            validItemsCount++;
        }

        if (validItemsCount == 0) {
            throw new CartEmptyException("No valid items to checkout (Courses may have been unpublished or already purchased)");
        }

        order.setSubtotal(subtotal);
        order.setDiscountTotal(totalDiscount);
        order.setTotalAmount(subtotal.subtract(totalDiscount));

        return orderRepository.save(order);
    }

    @Override
    @Transactional
    public Order createOrderFromSingleCourse(Long userId, Course course, DirectCheckoutRequest request) {
        log.debug("Creating order from single course for user: {}, course: {}", userId, course.getId());

        Order order = new Order();
        order.setOrderNumber(numberGeneratorService.generateOrderNumber());
        order.setUserId(userId);
        order.setStatus(OrderStatus.PENDING);
        order.setPaymentMethod(request.getPaymentMethod());
        order.setCurrency("USD");
        order.setCreatedAt(LocalDateTime.now());
        order.setUpdatedAt(LocalDateTime.now());

        fillCustomerDetails(order, request.getCustomerName(), request.getCustomerEmail());

        order = orderRepository.save(order);

        BigDecimal originalPrice = course.getPrice() != null ? course.getPrice() : BigDecimal.ZERO;
        BigDecimal effectivePrice = course.getEffectivePrice() != null ? course.getEffectivePrice() : BigDecimal.ZERO;
        BigDecimal discount = originalPrice.subtract(effectivePrice);

        OrderItem item = new OrderItem();
        item.setOrder(order);
        item.setCourseId(course.getId());
        item.setCourseTitle(course.getTitle());
        item.setCourseSlug(course.getSlug());
        item.setCourseThumbnailUrl(course.getThumbnailUrl());
        item.setInstructorId(course.getInstructorId());
        item.setInstructorName(course.getInstructorName());
        item.setFinalPrice(effectivePrice);
        item.setOriginalPrice(originalPrice);
        item.setDiscountAmount(discount);
        item.setCurrency("USD");

        orderItemRepository.save(item);

        order.setSubtotal(originalPrice);
        order.setDiscountTotal(discount);
        order.setTotalAmount(effectivePrice);

        return orderRepository.save(order);
    }

    // ===== Private Helpers =====

    private OrderResponse buildOrderResponse(Order order) {
        // Use items from order if already loaded (via EntityGraph), otherwise fetch
        List<OrderItem> items = order.getItems() != null && !order.getItems().isEmpty()
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

    private OrderSummaryResponse buildOrderSummary(Order order, int itemCount) {
        return OrderSummaryResponse.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .status(order.getStatus())
                .itemCount(itemCount)
                .totalAmount(order.getTotalAmount())
                .currency(order.getCurrency())
                .createdAt(order.getCreatedAt())
                .completedAt(order.getCompletedAt())
                .build();
    }

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
        
        // Fallback if still null to prevent Invoice crash
        if (email == null) email = "unknown@edumind.com";
        if (name == null || name.isEmpty()) name = "Unknown User";

        order.setCustomerName(name);
        order.setCustomerEmail(email);
    }
}
