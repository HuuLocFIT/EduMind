package com.edumind.lms.modules.payment.service;

import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.enums.EnrollmentStatus;
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
import com.edumind.lms.modules.payment.enums.TransactionStatus;
import com.edumind.lms.modules.payment.gateway.*;
import com.edumind.lms.modules.payment.gateway.config.PaymentGatewayRegistry;
import com.edumind.lms.modules.payment.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityNotFoundException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
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
    private final TransactionRepository transactionRepository; // Added dependency

    private final CartService cartService;
    private final OrderService orderService;
    private final TransactionService transactionService;
    private final EarningService earningService;
    private final InvoiceService invoiceService;
    private final EnrollmentService enrollmentService;
    private final NumberGeneratorService numberGeneratorService; // Added dependency

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

        Set<Long> enrolledCourseIds = new HashSet<>(
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

            BigDecimal originalPrice = course.getOriginalPrice();
            BigDecimal finalPrice = course.getEffectivePrice();
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
        // Use existsByCourseIdAndStudentIdAndStatusNot to allow re-enrollment if DROPPED
        if (enrollmentRepository.existsByCourseIdAndStudentIdAndStatusNot(
                course.getId(), userId, EnrollmentStatus.DROPPED)) {
            warnings.add("Already enrolled in: " + course.getTitle());
        }

        BigDecimal originalPrice = course.getOriginalPrice();
        BigDecimal finalPrice = course.getEffectivePrice();
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
            return completeFreeOrder(order, userId, true);
        }

        // 4. Process payment (outside transaction to avoid holding DB connection during network call)
        return processPayment(order, request, true);
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

        // Use existsByCourseIdAndStudentIdAndStatusNot to allow re-enrollment if DROPPED
        if (enrollmentRepository.existsByCourseIdAndStudentIdAndStatusNot(
                request.getCourseId(), userId, com.edumind.lms.modules.course.enums.EnrollmentStatus.DROPPED)) {
            throw new CourseAlreadyPurchasedException(request.getCourseId());
        }

        // Create order with single item (inside transaction via OrderService)
        Order order = orderService.createOrderFromSingleCourse(userId, course, request);

        // Check if free
        if (order.getTotalAmount().compareTo(BigDecimal.ZERO) == 0) {
            return completeFreeOrder(order, userId, false);
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

        return processPayment(order, checkoutRequest, false);
    }

    @Override
    @Transactional
    public void handlePaymentCallback(String gatewayTransactionId, String status, String rawPayload) {
        log.info("Handling payment callback: {} - {}", gatewayTransactionId, status);

        // 1. Find Transaction
        Transaction transaction = transactionRepository.findByGatewayTransactionId(gatewayTransactionId)
                .orElseThrow(() -> new EntityNotFoundException("Transaction not found: " + gatewayTransactionId));

        if (transaction.getStatus() == TransactionStatus.SUCCESS) {
            log.info("Transaction {} already processed successfully", gatewayTransactionId);
            return;
        }

        // 2. Update transaction status
        transaction.setGatewayResponse(rawPayload);
        
        if ("SUCCESS".equalsIgnoreCase(status)) {
            transaction.setStatus(TransactionStatus.SUCCESS);
            transaction.setProcessedAt(LocalDateTime.now());
            transactionRepository.save(transaction);
            
            Order order = transaction.getOrder();
            if (!order.isCompleted()) {
                handleSuccessfulPayment(order, transaction, false); // Callback usually not from cart flow directly or cart already handled
            }
        } else {
            transaction.setStatus(TransactionStatus.FAILED);
            transaction.setFailureReason("Callback reported failure: " + status);
            transactionRepository.save(transaction);
            
            // Fail order
            Order order = transaction.getOrder();
            order.setStatus(OrderStatus.FAILED);
            order.setFailureReason("Payment failed (callback): " + status);
            orderRepository.save(order);
        }
    }

    @Override
    public CheckoutResultResponse retryPayment(Long userId, Long orderId, CheckoutRequest request) {
        log.info("Retrying payment for order: {}", orderId);

        Order order = resetOrderForRetry(userId, orderId);

        // Process payment (outside transaction to avoid holding DB connection during network call)
        // Note: retry payment clears cart since user might have added items before retrying
        return processPayment(order, request, true);
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
    private CheckoutResultResponse completeFreeOrder(Order order, Long userId, boolean isFromCart) {
        log.info("Completing free order: {}", order.getOrderNumber());

        // Complete order
        order.setStatus(OrderStatus.COMPLETED);
        order.setPaymentMethod(PaymentMethod.FREE);
        order.setCompletedAt(LocalDateTime.now());
        orderRepository.save(order);

        // Create enrollments
        createEnrollmentsForOrder(order);

        // Clear cart only if checkout was from cart
        if (isFromCart) {
            cartService.clearCart(userId);
        }

        // Generate invoice
        InvoiceResponse invoice = invoiceService.generateInvoice(order);
        
        // Generate PDF for invoice
        invoiceService.generateInvoicePdf(invoice.getId());
        
        // Reload invoice to get updated PDF URL
        invoice = invoiceService.getInvoiceById(invoice.getId());

        // Publish event
        eventPublisher.publishEvent(new OrderCompletedEvent(this, order));

        log.info("Free order completed: {}", order.getOrderNumber());

        // Load order items explicitly (lazy loading issue)
        List<OrderItem> orderItems = orderItemRepository.findByOrderId(order.getId());

        return CheckoutResultResponse.builder()
                .success(true)
                .orderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .orderStatus(order.getStatus())
                .totalAmount(order.getTotalAmount())
                .currency(order.getCurrency())
                .paymentMethod(order.getPaymentMethod())
                .invoiceNumber(invoice.getInvoiceNumber())
                .invoiceUrl(invoice.getPdfUrl())
                .enrolledCourseIds(orderItems.stream()
                        .map(OrderItem::getCourseId)
                        .collect(Collectors.toList()))
                .createdAt(order.getCreatedAt())
                .completedAt(order.getCompletedAt())
                .message("Enrollment successful! You can now access your courses.")
                .build();
    }

    private CheckoutResultResponse processPayment(Order order, CheckoutRequest request, boolean isFromCart) {
        log.info("Processing payment for order: {}", order.getOrderNumber());

        PaymentGateway gateway = gatewayRegistry.getActiveGateway();

        // 1. Create Transaction PENDING (Before Gateway Call)
        // This ensures we have a record even if the server crashes during/after gateway response
        Transaction transaction = new Transaction();
        transaction.setTransactionNumber(numberGeneratorService.generateTransactionNumber());
        transaction.setOrder(order);
        transaction.setGateway(order.getPaymentMethod());
        transaction.setAmount(order.getTotalAmount());
        transaction.setCurrency(order.getCurrency());
        transaction.setStatus(TransactionStatus.PENDING);
        transaction.setCreatedAt(LocalDateTime.now());
        
        transaction = transactionRepository.save(transaction);
        log.info("Created PENDING transaction: {}", transaction.getTransactionNumber());

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

        // 2. Process payment (Call Gateway)
        GatewayPaymentResult result = gateway.processPayment(gatewayRequest);

        // 3. Update Transaction with Result
        transaction.setGatewayTransactionId(result.getGatewayTransactionId());
        transaction.setGatewayResponse(result.getRawResponse());
        
        // Update local amount info if provided (e.g. SePay)
        if (result.getLocalAmount() != null) {
            transaction.setLocalAmount(result.getLocalAmount());
            transaction.setLocalCurrency(result.getLocalCurrency());
            transaction.setExchangeRate(result.getExchangeRate());
        }

        if (result.isSuccess()) {
            transaction.setStatus(TransactionStatus.SUCCESS);
            transaction.setProcessedAt(LocalDateTime.now());
            transactionRepository.save(transaction);
            
            try {
                return handleSuccessfulPayment(order, transaction, isFromCart);
            } catch (Exception e) {
                log.error("CRITICAL: Payment successful but order completion failed for Order: {}", order.getOrderNumber(), e);
                
                // We cannot rollback the payment gateway charge here.
                // We must mark the order in a state that indicates manual intervention is needed.
                order.setStatus(OrderStatus.FAILED);
                order.setFailureReason("CRITICAL: Payment Succeeded but Enrollment Failed: " + e.getMessage());
                orderRepository.save(order);
                
                return CheckoutResultResponse.builder()
                        .success(false)
                        .orderId(order.getId())
                        .orderNumber(order.getOrderNumber())
                        .transactionNumber(transaction.getTransactionNumber())
                        .message("Payment successful, but there was an error activating your course. Please contact support immediately.")
                        .errorCode("ENROLLMENT_ERROR")
                        .errorMessage(e.getMessage())
                        .build();
            }
            
        } else if (result.isRequiresRedirect()) {
            transaction.setRedirectUrl(result.getRedirectUrl());
            transactionRepository.save(transaction);
            
            return handlePendingPayment(order, transaction, result);
        } else {
            transaction.setStatus(TransactionStatus.FAILED);
            transaction.setFailureCode(result.getErrorCode());
            transaction.setFailureReason(result.getErrorMessage());
            transactionRepository.save(transaction);
            
            return handleFailedPayment(order, transaction, result);
        }
    }

    @Transactional
    private CheckoutResultResponse handleSuccessfulPayment(Order order, Transaction transaction,
                                                           boolean isFromCart) {
        log.info("Payment successful for order: {}", order.getOrderNumber());

        // 1. Complete order (CRITICAL)
        order.setStatus(OrderStatus.COMPLETED);
        order.setCompletedAt(LocalDateTime.now());
        orderRepository.save(order);

        // 2. Create enrollments (CRITICAL)
        createEnrollmentsForOrder(order);

        // 3. Create earnings (Non-Critical)
        try {
            earningService.createEarningsForOrder(order);
        } catch (Exception e) {
            log.error("Failed to create earnings for order: {}", order.getOrderNumber(), e);
            // Verify if we should throw or just log. For user experience, getting the course is priority.
            // internal accounting can be fixed later. Keeping it non-blocking.
        }

        // 4. Clear cart (Non-Critical)
        if (isFromCart) {
            try {
                cartService.clearCart(order.getUserId());
            } catch (Exception e) {
                log.error("Failed to clear cart for user: {}", order.getUserId(), e);
            }
        }

        InvoiceResponse invoice = null;
        try {
            // 5. Generate invoice (Non-Critical)
            invoice = invoiceService.generateInvoice(order);
            
            // Generate PDF for invoice
            invoiceService.generateInvoicePdf(invoice.getId());
            
            // Reload invoice to get updated PDF URL
            invoice = invoiceService.getInvoiceById(invoice.getId());
        } catch (Exception e) {
            log.error("Failed to generate invoice for order: {}", order.getOrderNumber(), e);
        }

        // 6. Publish event (Non-Critical)
        try {
            eventPublisher.publishEvent(new OrderCompletedEvent(this, order));
        } catch (Exception e) {
            log.error("Failed to publish OrderCompletedEvent for order: {}", order.getOrderNumber(), e);
        }

        // Load order items explicitly (lazy loading issue)
        List<OrderItem> orderItems = orderItemRepository.findByOrderId(order.getId());

        CheckoutResultResponse.CheckoutResultResponseBuilder responseBuilder = CheckoutResultResponse.builder()
                .success(true)
                .orderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .transactionNumber(transaction.getTransactionNumber())
                .gatewayTransactionId(transaction.getGatewayTransactionId())
                .orderStatus(order.getStatus())
                .totalAmount(order.getTotalAmount())
                .currency(order.getCurrency())
                .paymentMethod(order.getPaymentMethod())
                .enrolledCourseIds(orderItems.stream()
                        .map(OrderItem::getCourseId)
                        .collect(Collectors.toList()))
                .createdAt(order.getCreatedAt())
                .completedAt(order.getCompletedAt())
                .message("Payment successful! You can now access your courses.");

        if (invoice != null) {
            responseBuilder
                .invoiceNumber(invoice.getInvoiceNumber())
                .invoiceUrl(invoice.getPdfUrl());
        }
        
        return responseBuilder.build();


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
                .orderStatus(order.getStatus())
                .totalAmount(order.getTotalAmount())
                .currency(order.getCurrency())
                .paymentMethod(order.getPaymentMethod())
                .createdAt(order.getCreatedAt())
                .message("Please complete payment on the payment provider's page.")
                .redirectUrl(result.getRedirectUrl())
                .requiresRedirect(true)
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
                .orderStatus(order.getStatus())
                .totalAmount(order.getTotalAmount())
                .currency(order.getCurrency())
                .paymentMethod(order.getPaymentMethod())
                .createdAt(order.getCreatedAt())
                .message("Payment failed: " + result.getErrorMessage())
                .errorCode(result.getErrorCode())
                .errorMessage(result.getErrorMessage())
                .build();
    }

    private void createEnrollmentsForOrder(Order order) {
        List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());

        for (OrderItem item : items) {
            try {
                enrollmentService.enrollStudent(item.getCourseId(),order.getUserId());
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
