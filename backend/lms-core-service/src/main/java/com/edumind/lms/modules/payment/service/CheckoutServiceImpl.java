package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.repository.CourseRepository;
import com.edumind.lms.modules.course.repository.EnrollmentRepository;
import com.edumind.lms.modules.course.service.EnrollmentService;
import com.edumind.lms.modules.payment.dto.request.CheckoutRequest;
import com.edumind.lms.modules.payment.dto.request.DirectCheckoutRequest;
import com.edumind.lms.modules.payment.dto.response.*;
import com.edumind.lms.modules.payment.entity.*;
import com.edumind.lms.modules.payment.enums.OrderStatus;
import com.edumind.lms.modules.payment.enums.PaymentMethod;
import com.edumind.lms.modules.payment.event.OrderCompletedEvent;
import com.edumind.lms.modules.payment.event.PaymentFailedEvent;
import com.edumind.lms.modules.payment.exception.*;
import com.edumind.lms.modules.payment.gateway.*;
import com.edumind.lms.modules.payment.gateway.config.PaymentGatewayRegistry;
import com.edumind.lms.modules.payment.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CheckoutServiceImpl implements CheckoutService {

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final CourseRepository courseRepository;
    private final EnrollmentRepository enrollmentRepository;

    private final CartService cartService;
    private final OrderService orderService;
    private final TransactionService transactionService;
    private final EarningService earningService;
    private final InvoiceService invoiceService;
    private final EnrollmentService enrollmentService;

    private final PaymentGatewayRegistry gatewayRegistry;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    @Transactional(readOnly = true)
    public CheckoutPreviewResponse previewCheckout(Long userId) {
        log.info("Previewing checkout for user: {}", userId);

        Cart cart = cartRepository.findByUserId(userId)
                .orElseThrow(() -> new CartEmptyException());

        List<CartItem> items = cartItemRepository.findByCartId(cart.getId());

        if (items.isEmpty()) {
            throw new CartEmptyException();
        }

        List<CheckoutItemPreview> itemPreviews = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal totalDiscount = BigDecimal.ZERO;
        List<String> warnings = new ArrayList<>();

        List<Long> courseIds = items.stream()
                .map(CartItem::getCourseId)
                .collect(Collectors.toList());

        Map<Long, Course> coursesMap = courseRepository.findAllById(courseIds).stream()
                .collect(Collectors.toMap(Course::getId, Function.identity()));

        Set<Long> enrolledCourseIds = new java.util.HashSet<>(
                enrollmentRepository.findEnrolledCourseIds(userId, courseIds));

        for (CartItem item : items) {
            Course course = coursesMap.get(item.getCourseId());

            if (course == null) {
                warnings.add("Course not found: " + item.getCourseId());
                continue;
            }

            if (!course.isPublished()) {
                warnings.add("Course no longer available: " + course.getTitle());
                continue;
            }

            if (enrolledCourseIds.contains(course.getId())) {
                warnings.add("Already enrolled in: " + course.getTitle());
                continue;
            }

            BigDecimal originalPrice = course.getPrice() != null ? course.getPrice() : BigDecimal.ZERO;
            BigDecimal finalPrice = course.getEffectivePrice() != null ? course.getEffectivePrice() : BigDecimal.ZERO;
            BigDecimal discount = originalPrice.subtract(finalPrice);

            CheckoutItemPreview preview = CheckoutItemPreview.builder()
                    .courseId(course.getId())
                    .courseTitle(course.getTitle())
                    .courseSlug(course.getSlug())
                    .courseThumbnailUrl(course.getThumbnailUrl())
                    .instructorId(course.getInstructorId())
                    .instructorName(course.getInstructorName())
                    .effectivePrice(finalPrice)
                    .originalPrice(originalPrice)
                    .discountAmount(discount)
                    .currency(course.getCurrency() != null ? course.getCurrency() : "USD")
                    .isFree(finalPrice.compareTo(BigDecimal.ZERO) == 0)
                    .build();

            itemPreviews.add(preview);
            subtotal = subtotal.add(originalPrice);
            totalDiscount = totalDiscount.add(discount);
        }

        if (itemPreviews.isEmpty()) {
            throw new CartEmptyException("No valid items in cart");
        }

        BigDecimal totalAmount = subtotal.subtract(totalDiscount);
        boolean allFree = totalAmount.compareTo(BigDecimal.ZERO) == 0;

        return CheckoutPreviewResponse.builder()
                .items(itemPreviews)
                .itemCount(itemPreviews.size())
                .subtotal(subtotal)
                .discountTotal(totalDiscount)
                .totalAmount(totalAmount)
                .currency("USD")
                .isFreeCheckout(allFree)
                .requiresPayment(!allFree)
                .warnings(warnings.isEmpty() ? null : warnings)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public CheckoutPreviewResponse previewDirectCheckout(Long userId, Long courseId) {
        log.info("Previewing direct checkout for user: {}, course: {}", userId, courseId);

        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new CourseNotAvailableException(courseId));

        if (!course.isPublished()) {
            throw new CourseNotAvailableException(courseId, "Course is not published");
        }

        List<String> warnings = new ArrayList<>();
        // Use existsByCourseIdAndStudentId which is more efficient (uses indexed columns directly)
        if (enrollmentRepository.existsByCourseIdAndStudentId(course.getId(), userId)) {
            warnings.add("Already enrolled in: " + course.getTitle());
        }

        BigDecimal originalPrice = course.getPrice() != null ? course.getPrice() : BigDecimal.ZERO;
        BigDecimal finalPrice = course.getEffectivePrice() != null ? course.getEffectivePrice() : BigDecimal.ZERO;
        BigDecimal discount = originalPrice.subtract(finalPrice);

        CheckoutItemPreview preview = CheckoutItemPreview.builder()
                .courseId(course.getId())
                .courseTitle(course.getTitle())
                .courseSlug(course.getSlug())
                .courseThumbnailUrl(course.getThumbnailUrl())
                .instructorId(course.getInstructorId())
                .instructorName(course.getInstructorName())
                .effectivePrice(finalPrice)
                .originalPrice(originalPrice)
                .discountAmount(discount)
                .currency(course.getCurrency() != null ? course.getCurrency() : "USD")
                .isFree(finalPrice.compareTo(BigDecimal.ZERO) == 0)
                .build();

        List<CheckoutItemPreview> items = List.of(preview);
        boolean isFree = finalPrice.compareTo(BigDecimal.ZERO) == 0;

        return CheckoutPreviewResponse.builder()
                .items(items)
                .itemCount(1)
                .subtotal(originalPrice)
                .discountTotal(discount)
                .totalAmount(finalPrice)
                .currency("USD")
                .isFreeCheckout(isFree)
                .requiresPayment(!isFree)
                .warnings(warnings.isEmpty() ? null : warnings)
                .build();
    }

    @Override
    public CheckoutResultResponse checkout(Long userId, CheckoutRequest request) {
        log.info("Processing checkout for user: {}", userId);

        // 1. Validate cart
        Cart cart = cartRepository.findByUserId(userId)
                .orElseThrow(() -> new CartEmptyException());

        List<CartItem> cartItems = cartItemRepository.findByCartId(cart.getId());
        if (cartItems.isEmpty()) {
            throw new CartEmptyException();
        }

        // 2. Build order (inside transaction via OrderService)
        Order order = orderService.createOrderFromCart(userId, cartItems, request);

        // 3. Check if payment required
        if (order.getTotalAmount().compareTo(BigDecimal.ZERO) == 0) {
            // Free order - complete immediately
            return completeFreeOrder(order, userId);
        }

        // 4. Process payment (outside transaction to avoid holding DB connection during network call)
        return processPayment(order, request);
    }

    @Override
    public CheckoutResultResponse directCheckout(Long userId, DirectCheckoutRequest request) {
        log.info("Processing direct checkout for user: {}, course: {}", userId, request.getCourseId());

        // Validate course
        Course course = courseRepository.findById(request.getCourseId())
                .orElseThrow(() -> new CourseNotAvailableException(request.getCourseId()));

        if (!course.isPublished()) {
            throw new CourseNotAvailableException(request.getCourseId(), "Course is not published");
        }

        // Use existsByCourseIdAndStudentId which is more efficient (uses indexed columns directly)
        if (enrollmentRepository.existsByCourseIdAndStudentId(request.getCourseId(), userId)) {
            throw new CourseAlreadyPurchasedException(request.getCourseId());
        }

        // Create order with single item (inside transaction via OrderService)
        Order order = orderService.createOrderFromSingleCourse(userId, course, request);

        // Check if free
        if (order.getTotalAmount().compareTo(BigDecimal.ZERO) == 0) {
            return completeFreeOrder(order, userId);
        }

        // Process payment (outside transaction to avoid holding DB connection during network call)
        CheckoutRequest checkoutRequest = CheckoutRequest.builder()
                .paymentMethod(request.getPaymentMethod())
                .cardNumber(request.getCardNumber())
                .cardHolderName(request.getCardHolderName())
                .expiryDate(request.getExpiryDate())
                .cvv(request.getCvv())
                .customerEmail(request.getCustomerEmail())
                .customerName(request.getCustomerName())
                .build();

        return processPayment(order, checkoutRequest);
    }

    @Override
    @Transactional
    public void handlePaymentCallback(String gatewayTransactionId, String status, String rawPayload) {
        log.info("Handling payment callback: {} - {}", gatewayTransactionId, status);

        // TODO: Implement callback handling
        // 1. Verify callback signature
        // 2. Update transaction status
        // 3. If success, complete order
        // 4. If failed, fail order
    }

    @Override
    public CheckoutResultResponse retryPayment(Long userId, Long orderId, CheckoutRequest request) {
        log.info("Retrying payment for order: {}", orderId);

        Order order = resetOrderForRetry(userId, orderId);

        // Process payment (outside transaction to avoid holding DB connection during network call)
        return processPayment(order, request);
    }

    @Transactional
    private Order resetOrderForRetry(Long userId, Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));

        // Verify user owns the order
        if (!order.getUserId().equals(userId)) {
            throw new OrderNotFoundException(orderId);
        }

        // Can only retry pending/failed orders
        if (order.getStatus() != OrderStatus.PENDING && order.getStatus() != OrderStatus.FAILED) {
            throw new InvalidOrderStateException(orderId, order.getStatus(), "retry payment");
        }

        // Reset order status
        order.setStatus(OrderStatus.PENDING);
        order.setFailureReason(null);
        return orderRepository.save(order);
    }

    // ===== Private Helpers =====

    @Transactional
    private CheckoutResultResponse completeFreeOrder(Order order, Long userId) {
        log.info("Completing free order: {}", order.getOrderNumber());

        // Complete order
        order.setStatus(OrderStatus.COMPLETED);
        order.setPaymentMethod(PaymentMethod.FREE);
        order.setCompletedAt(LocalDateTime.now());
        orderRepository.save(order);

        // Create enrollments
        createEnrollmentsForOrder(order);

        // Clear cart
        cartService.clearCart(userId);

        // Generate invoice
        InvoiceResponse invoice = invoiceService.generateInvoice(order);

        // Publish event
        eventPublisher.publishEvent(new OrderCompletedEvent(this, order));

        log.info("Free order completed: {}", order.getOrderNumber());

        return CheckoutResultResponse.builder()
                .success(true)
                .orderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .status(OrderStatus.COMPLETED)
                .message("Enrollment successful! You can now access your courses.")
                .invoiceNumber(invoice.getInvoiceNumber())
                .build();
    }

    private CheckoutResultResponse processPayment(Order order, CheckoutRequest request) {
        log.info("Processing payment for order: {}", order.getOrderNumber());

        PaymentGateway gateway = gatewayRegistry.getActiveGateway();

        // Build gateway request
        GatewayPaymentRequest gatewayRequest = GatewayPaymentRequest.builder()
                .orderNumber(order.getOrderNumber())
                .orderId(order.getId())
                .amount(order.getTotalAmount())
                .currency(order.getCurrency())
                .userId(order.getUserId())
                .customerEmail(request.getCustomerEmail())
                .customerName(request.getCustomerName())
                .cardNumber(request.getCardNumber())
                .cardHolderName(request.getCardHolderName())
                .expiryDate(request.getExpiryDate())
                .cvv(request.getCvv())
                .description("Payment for Order #" + order.getOrderNumber())
                .build();

        // Process payment
        GatewayPaymentResult result = gateway.processPayment(gatewayRequest);

        // Create transaction record
        Transaction transaction = transactionService.createTransaction(order, result);

        if (result.isSuccess()) {
            return handleSuccessfulPayment(order, transaction, request);
        } else if (result.isRequiresRedirect()) {
            return handlePendingPayment(order, transaction, result);
        } else {
            return handleFailedPayment(order, transaction, result);
        }
    }

    @Transactional
    private CheckoutResultResponse handleSuccessfulPayment(Order order, Transaction transaction,
                                                           CheckoutRequest request) {
        log.info("Payment successful for order: {}", order.getOrderNumber());

        // Complete order
        order.setStatus(OrderStatus.COMPLETED);
        order.setCompletedAt(LocalDateTime.now());
        orderRepository.save(order);

        // Create enrollments
        createEnrollmentsForOrder(order);

        // Create earnings
        earningService.createEarningsForOrder(order);

        // Clear cart (if from cart checkout)
        cartService.clearCart(order.getUserId());

        // Generate invoice
        InvoiceResponse invoice = invoiceService.generateInvoice(order);

        // Publish event
        eventPublisher.publishEvent(new OrderCompletedEvent(this, order));

        return CheckoutResultResponse.builder()
                .success(true)
                .orderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .transactionNumber(transaction.getTransactionNumber())
                .status(OrderStatus.COMPLETED)
                .message("Payment successful! You can now access your courses.")
                .invoiceNumber(invoice.getInvoiceNumber())
                .build();
    }

    @Transactional
    private CheckoutResultResponse handlePendingPayment(Order order, Transaction transaction,
                                                        GatewayPaymentResult result) {
        log.info("Payment pending for order: {} - redirect required", order.getOrderNumber());

        order.setStatus(OrderStatus.PROCESSING);
        orderRepository.save(order);

        return CheckoutResultResponse.builder()
                .success(false)
                .pending(true)
                .orderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .transactionNumber(transaction.getTransactionNumber())
                .status(OrderStatus.PROCESSING)
                .message("Please complete payment on the payment provider's page.")
                .redirectUrl(result.getRedirectUrl())
                .build();
    }

    @Transactional
    private CheckoutResultResponse handleFailedPayment(Order order, Transaction transaction,
                                                       GatewayPaymentResult result) {
        log.warn("Payment failed for order: {} - {}", order.getOrderNumber(), result.getErrorMessage());

        order.setStatus(OrderStatus.FAILED);
        order.setFailureReason(result.getErrorMessage());
        orderRepository.save(order);

        // Publish event
        eventPublisher.publishEvent(new PaymentFailedEvent(this, order, result.getErrorMessage()));

        return CheckoutResultResponse.builder()
                .success(false)
                .orderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .transactionNumber(transaction.getTransactionNumber())
                .status(OrderStatus.FAILED)
                .message("Payment failed: " + result.getErrorMessage())
                .errorCode(result.getErrorCode())
                .build();
    }

    private void createEnrollmentsForOrder(Order order) {
        List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());

        for (OrderItem item : items) {
            try {
                enrollmentService.enrollStudent(order.getUserId(), item.getCourseId());
                log.debug("Created enrollment for user {} in course {}",
                        order.getUserId(), item.getCourseId());
            } catch (Exception e) {
                log.error("Failed to create enrollment for course {}: {}",
                        item.getCourseId(), e.getMessage());
                throw new PaymentFailedException("Failed to activate enrollment: " + e.getMessage());
            }
        }
    }
}
