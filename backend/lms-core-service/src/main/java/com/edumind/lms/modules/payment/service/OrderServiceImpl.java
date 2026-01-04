package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.repository.CourseRepository;
import com.edumind.lms.modules.course.repository.EnrollmentRepository;
import com.edumind.lms.modules.payment.dto.request.CheckoutRequest;
import com.edumind.lms.modules.payment.dto.request.DirectCheckoutRequest;
import com.edumind.lms.modules.payment.dto.response.OrderItemResponse;
import com.edumind.lms.modules.payment.dto.response.OrderResponse;
import com.edumind.lms.modules.payment.dto.response.OrderSummaryResponse;
import com.edumind.lms.modules.payment.entity.CartItem;
import com.edumind.lms.modules.payment.entity.Order;
import com.edumind.lms.modules.payment.entity.OrderItem;
import com.edumind.lms.modules.payment.enums.OrderStatus;
import com.edumind.lms.modules.payment.exception.CartEmptyException;
import com.edumind.lms.modules.payment.exception.InvalidOrderStateException;
import com.edumind.lms.modules.payment.exception.OrderNotFoundException;
import com.edumind.lms.modules.payment.repository.OrderItemRepository;
import com.edumind.lms.modules.payment.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
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

    @Override
    @Transactional(readOnly = true)
    public OrderResponse getOrderById(Long orderId) {
        Order order = getOrderEntity(orderId);
        return buildOrderResponse(order);
    }

    @Override
    @Transactional(readOnly = true)
    public OrderResponse getOrderByNumber(String orderNumber) {
        Order order = orderRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new OrderNotFoundException(orderNumber));
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
    public Page<OrderSummaryResponse> getUserOrders(Long userId, Pageable pageable) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(this::buildOrderSummary);
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderSummaryResponse> getUserOrdersByStatus(Long userId, OrderStatus status) {
        return orderRepository.findByUserIdAndStatus(userId, status).stream()
                .map(this::buildOrderSummary)
                .collect(Collectors.toList());
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
    public void cancelOrder(Long orderId, Long userId) {
        Order order = getOrderEntity(orderId);

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
        order.setCustomerEmail(request.getCustomerEmail());
        order.setCustomerName(request.getCustomerName());
        order.setBillingAddress(request.getBillingAddress());

        order = orderRepository.save(order);

        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal totalDiscount = BigDecimal.ZERO;
        int validItemsCount = 0;

        for (CartItem cartItem : cartItems) {
            Course course = courseRepository.findById(cartItem.getCourseId()).orElse(null);
            if (course == null || !course.isPublished()) continue;
            if (enrollmentRepository.existsByUserIdAndCourseId(userId, course.getId())) continue;

            BigDecimal originalPrice = course.getPrice() != null ? course.getPrice() : BigDecimal.ZERO;
            BigDecimal finalPrice = course.getEffectivePrice() != null ? course.getEffectivePrice() : BigDecimal.ZERO;
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

        order.setCustomerEmail(request.getCustomerEmail());
        order.setCustomerName(request.getCustomerName());

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

        orderItemRepository.save(item);

        order.setSubtotal(originalPrice);
        order.setDiscountTotal(discount);
        order.setTotalAmount(effectivePrice);

        return orderRepository.save(order);
    }

    // ===== Private Helpers =====

    private OrderResponse buildOrderResponse(Order order) {
        List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());

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
                .build();
    }

    private OrderSummaryResponse buildOrderSummary(Order order) {
        int itemCount = orderItemRepository.countByOrderId(order.getId());

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
}
