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
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import jakarta.persistence.EntityNotFoundException;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
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

    private static final int MAX_PAYMENT_ATTEMPTS = 3;

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
    private final PaymentMethodPolicyService paymentMethodPolicyService;

    private final PaymentGatewayRegistry gatewayRegistry;
    private final ApplicationEventPublisher eventPublisher;
    private final PlatformTransactionManager transactionManager;

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

        String cartSignature = buildCartSignature(userId, itemPreviews, totalAmount);

        return CheckoutPreviewResponse.builder()
                .items(itemPreviews)
                .itemCount(itemPreviews.size())
                .subtotal(subtotal)
                .discountTotal(totalDiscount)
                .totalAmount(totalAmount)
                .currency("USD")
                .isFreeCheckout(allFree)
                .requiresPayment(!allFree)
                .cartSignature(cartSignature)
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

        String cartSignature = buildCartSignature(userId, items, finalPrice);

        return CheckoutPreviewResponse.builder()
                .items(items)
                .itemCount(1)
                .subtotal(originalPrice)
                .discountTotal(discount)
                .totalAmount(finalPrice)
                .currency("USD")
                .isFreeCheckout(isFree)
                .requiresPayment(!isFree)
                 .cartSignature(cartSignature)
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

        // Optional cart signature validation (only if client provided one)
        if (request.getCartSignature() != null) {
            CheckoutPreviewResponse currentPreview = previewCheckout(userId);
            if (!request.getCartSignature().equals(currentPreview.getCartSignature())) {
                log.warn("Cart signature mismatch for user {}. Expected: {}, Actual: {}",
                        userId, request.getCartSignature(), currentPreview.getCartSignature());
                return CheckoutResultResponse.builder()
                        .success(false)
                        .orderStatus(null)
                        .message("Your cart has changed since the last preview. Please review your cart and try again.")
                        .errorCode("CART_CHANGED")
                        .errorMessage("Cart changed between preview and checkout")
                        .build();
            }
        }

        // 2. Build order (inside transaction via OrderService)
        Order order;
        try {
            order = orderService.createOrderFromCart(userId, cartItems, request);
        } catch (DataIntegrityViolationException ex) {
            // Likely concurrent checkout hitting unique active-order constraint
            log.warn("Active checkout already exists for user {}. Blocking duplicate checkout.", userId, ex);
            return CheckoutResultResponse.builder()
                    .success(false)
                    .message("You already have a checkout in progress. Please complete it or wait a moment.")
                    .errorCode("CHECKOUT_IN_PROGRESS")
                    .errorMessage("Active checkout already exists for this user")
                    .build();
        }

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

        // Idempotency and status guards
        if (order.getStatus() == OrderStatus.COMPLETED) {
            log.info("Free order {} is already COMPLETED. Skipping duplicate completion.", order.getOrderNumber());
            List<OrderItem> existingItems = orderItemRepository.findByOrderId(order.getId());

            return CheckoutResultResponse.builder()
                    .success(true)
                    .orderId(order.getId())
                    .orderNumber(order.getOrderNumber())
                    .orderStatus(order.getStatus())
                    .totalAmount(order.getTotalAmount())
                    .currency(order.getCurrency())
                    .paymentMethod(order.getPaymentMethod())
                    .enrolledCourseIds(existingItems.stream()
                            .map(OrderItem::getCourseId)
                            .collect(Collectors.toList()))
                    .createdAt(order.getCreatedAt())
                    .completedAt(order.getCompletedAt())
                    .message("Order was already completed. No additional changes were applied.")
                    .build();
        }

        if (order.getStatus() == OrderStatus.PROCESSING) {
            log.info("Free order {} is in PROCESSING state. Treating as pending and not re-triggering side effects.",
                    order.getOrderNumber());
            List<OrderItem> existingItems = orderItemRepository.findByOrderId(order.getId());

            return CheckoutResultResponse.builder()
                    .success(false)
                    .pending(true)
                    .orderId(order.getId())
                    .orderNumber(order.getOrderNumber())
                    .orderStatus(order.getStatus())
                    .totalAmount(order.getTotalAmount())
                    .currency(order.getCurrency())
                    .paymentMethod(order.getPaymentMethod())
                    .enrolledCourseIds(existingItems.stream()
                            .map(OrderItem::getCourseId)
                            .collect(Collectors.toList()))
                    .createdAt(order.getCreatedAt())
                    .message("Free order is currently being processed.")
                    .build();
        }

        // Mark as processing during completion to reduce race risk
        order.setStatus(OrderStatus.PROCESSING);
        order.setPaymentMethod(PaymentMethod.FREE);
        orderRepository.save(order);

        // Create enrollments
        createEnrollmentsForOrder(order);

        // Load order items explicitly (lazy loading issue)
        List<OrderItem> orderItems = orderItemRepository.findByOrderId(order.getId());

        // Clear cart only if checkout was from cart
        if (isFromCart) {
            List<Long> courseIds = orderItems.stream()
                    .map(OrderItem::getCourseId)
                    .collect(Collectors.toList());
            cartService.removeItems(userId, courseIds);
        }

        // Generate invoice with limited retries
        InvoiceResponse invoice = generateInvoiceWithRetry(order, 3);

        // Publish event
        eventPublisher.publishEvent(new OrderCompletedEvent(this, order));

        log.info("Free order completed: {}", order.getOrderNumber());

        return CheckoutResultResponse.builder()
                .success(true)
                .orderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .orderStatus(order.getStatus())
                .totalAmount(order.getTotalAmount())
                .currency(order.getCurrency())
                .paymentMethod(order.getPaymentMethod())
                .invoiceNumber(invoice != null ? invoice.getInvoiceNumber() : null)
                .invoiceUrl(invoice != null ? invoice.getPdfUrl() : null)
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

        CheckoutResultResponse eligibilityResponse = validateProcessingEligibility(order);
        if (eligibilityResponse != null) {
            return eligibilityResponse;
        }

        CheckoutResultResponse retryResponse = checkRetryLimit(order);
        if (retryResponse != null) {
            return retryResponse;
        }

        updateRetryMetadata(order);

        // Validate payment method capabilities for this currency before contacting gateway
        if (order.getPaymentMethod() != null) {
            paymentMethodPolicyService.validatePaymentMethod(order.getPaymentMethod(), order.getCurrency());
        }

        PaymentGateway gateway = gatewayRegistry.getActiveGateway();

        // 1. Ensure we don't create duplicate PENDING transactions for the same order
        Transaction transaction = createOrReusePendingTransaction(order);

        log.info("Using PENDING transaction: {}", transaction.getTransactionNumber());

        GatewayPaymentRequest gatewayRequest = prepareGatewayRequest(order, request);

        // 2. Process payment (Call Gateway)
        GatewayPaymentResult result;
        try {
            result = gateway.processPayment(gatewayRequest);
        } catch (Exception e) {
            log.error("CRITICAL: Payment gateway threw exception for order {}", order.getOrderNumber(), e);
            transaction.setStatus(TransactionStatus.FAILED);
            transaction.setFailureCode("GATEWAY_ERROR");
            transaction.setFailureReason("Gateway system error: " + e.getMessage());
            transactionRepository.save(transaction);
            
            GatewayPaymentResult errorResult = GatewayPaymentResult.builder()
                    .success(false)
                    .errorCode("GATEWAY_ERROR")
                    .errorMessage("Payment service unavailable. Please try again later.")
                    .build();
                    
            return handleFailedPayment(order, transaction, errorResult);
        }

        CheckoutResultResponse validationResponse = handleGatewayResultValidation(order, transaction, result);
        if (validationResponse != null) {
            return validationResponse;
        }

        return finalizePaymentTransaction(order, transaction, result, isFromCart);
    }

    private CheckoutResultResponse validateProcessingEligibility(Order order) {
        // Expiration check (for pending/failed retries)
        if (order.getExpiresAt() != null && LocalDateTime.now().isAfter(order.getExpiresAt())
                && order.getStatus() != OrderStatus.COMPLETED) {
            log.warn("Order {} has expired. Current status: {}", order.getOrderNumber(), order.getStatus());
            order.setStatus(OrderStatus.FAILED);
            order.setFailureReason("Order expired before payment was completed.");
            orderRepository.save(order);

            return CheckoutResultResponse.builder()
                    .success(false)
                    .orderId(order.getId())
                    .orderNumber(order.getOrderNumber())
                    .orderStatus(order.getStatus())
                    .totalAmount(order.getTotalAmount())
                    .currency(order.getCurrency())
                    .paymentMethod(order.getPaymentMethod())
                    .createdAt(order.getCreatedAt())
                    .message("This order has expired. Please create a new checkout.")
                    .errorCode("ORDER_EXPIRED")
                    .errorMessage("Order expired before payment was completed.")
                    .build();
        }

        // Guard against invalid order status (idempotency / safety)
        if (order.getStatus() == OrderStatus.COMPLETED) {
            log.warn("Order {} is already COMPLETED. Skipping payment processing.", order.getOrderNumber());
            Transaction latestTx = transactionRepository.findFirstByOrderIdOrderByCreatedAtDesc(order.getId())
                    .orElse(null);
            List<OrderItem> orderItems = orderItemRepository.findByOrderId(order.getId());

            CheckoutResultResponse.CheckoutResultResponseBuilder builder = buildSuccessResponse(order, orderItems)
                    .toBuilder()
                    .message("Order already completed. No additional payment was processed.");

            if (latestTx != null) {
                builder
                        .transactionNumber(latestTx.getTransactionNumber())
                        .gatewayTransactionId(latestTx.getGatewayTransactionId());
            }

            return builder.build();
        }

        if (order.getStatus() == OrderStatus.PROCESSING) {
            log.warn("Order {} is currently PROCESSING. Skipping new payment request.", order.getOrderNumber());
            Transaction latestTx = transactionRepository.findFirstByOrderIdOrderByCreatedAtDesc(order.getId())
                    .orElse(null);

            CheckoutResultResponse.CheckoutResultResponseBuilder builder = CheckoutResultResponse.builder()
                    .success(false)
                    .pending(true)
                    .orderId(order.getId())
                    .orderNumber(order.getOrderNumber())
                    .orderStatus(order.getStatus())
                    .totalAmount(order.getTotalAmount())
                    .currency(order.getCurrency())
                    .paymentMethod(order.getPaymentMethod())
                    .createdAt(order.getCreatedAt())
                    .message("Payment is already being processed for this order.");

            if (latestTx != null) {
                builder
                        .transactionNumber(latestTx.getTransactionNumber())
                        .gatewayTransactionId(latestTx.getGatewayTransactionId())
                        .redirectUrl(latestTx.getRedirectUrl())
                        .requiresRedirect(latestTx.getRedirectUrl() != null);
            }

            return builder.build();
        }
        return null; // Eligible
    }

    private CheckoutResultResponse checkRetryLimit(Order order) {
        Integer currentRetryCount = order.getRetryCount() != null ? order.getRetryCount() : 0;
        if (currentRetryCount >= MAX_PAYMENT_ATTEMPTS) {
            log.warn("Order {} has reached max payment attempts ({})", order.getOrderNumber(), MAX_PAYMENT_ATTEMPTS);
            order.setStatus(OrderStatus.FAILED);
            order.setFailureReason("Maximum payment retry attempts exceeded.");
            orderRepository.save(order);

            return CheckoutResultResponse.builder()
                    .success(false)
                    .orderId(order.getId())
                    .orderNumber(order.getOrderNumber())
                    .orderStatus(order.getStatus())
                    .totalAmount(order.getTotalAmount())
                    .currency(order.getCurrency())
                    .paymentMethod(order.getPaymentMethod())
                    .createdAt(order.getCreatedAt())
                    .message("Maximum payment retry attempts exceeded. Please create a new checkout.")
                    .errorCode("RETRY_LIMIT_EXCEEDED")
                    .errorMessage("Maximum payment retry attempts exceeded.")
                    .build();
        }
        return null;
    }

    private void updateRetryMetadata(Order order) {
        TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager);
        transactionTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        
        transactionTemplate.execute(status -> {
            Integer currentRetryCount = order.getRetryCount() != null ? order.getRetryCount() : 0;
            order.setRetryCount(currentRetryCount + 1);
            order.setLastPaymentAttemptAt(LocalDateTime.now());
            return orderRepository.save(order);
        });
    }

    private GatewayPaymentRequest prepareGatewayRequest(Order order, CheckoutRequest request) {
        return GatewayPaymentRequest.builder()
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
    }

    private CheckoutResultResponse handleGatewayResultValidation(Order order, Transaction transaction, GatewayPaymentResult result) {
        // Basic gateway response validation
        if (result == null) {
            log.error("Payment gateway returned null result for order {}", order.getOrderNumber());
            transaction.setStatus(TransactionStatus.FAILED);
            transaction.setFailureCode("GATEWAY_NULL_RESPONSE");
            transaction.setFailureReason("Payment gateway returned an invalid response.");
            transactionRepository.save(transaction);

            GatewayPaymentResult safeResult = GatewayPaymentResult.builder()
                    .success(false)
                    .status(null)
                    .errorCode("GATEWAY_NULL_RESPONSE")
                    .errorMessage("Payment gateway returned an invalid response.")
                    .build();
            return handleFailedPayment(order, transaction, safeResult);
        }

        // Update Transaction with Result
        transaction.setGatewayTransactionId(result.getGatewayTransactionId());
        transaction.setGatewayResponse(result.getRawResponse());

        // Update local amount info if provided
        if (result.getLocalAmount() != null) {
            transaction.setLocalAmount(result.getLocalAmount());
            transaction.setLocalCurrency(result.getLocalCurrency());
            transaction.setExchangeRate(result.getExchangeRate());
        }

        validateFxData(order, result);

        // Validate that the processed amount matches the order amount
        if (result.getAmount() != null &&
                result.getAmount().compareTo(order.getTotalAmount()) != 0) {
            log.error("Payment amount mismatch for order {}: gateway charged {} {} but order total is {} {}",
                    order.getOrderNumber(),
                    result.getAmount(), result.getCurrency(),
                    order.getTotalAmount(), order.getCurrency());

            transaction.setStatus(TransactionStatus.FAILED);
            transaction.setFailureCode("AMOUNT_MISMATCH");
            transaction.setFailureReason("Gateway charged " + result.getAmount() + " " + result.getCurrency()
                    + " but order total is " + order.getTotalAmount() + " " + order.getCurrency());
            transactionRepository.save(transaction);

            return handleFailedPayment(order, transaction, result);
        }
        return null;
    }

    private void validateFxData(Order order, GatewayPaymentResult result) {
        try {
            if (result.getExchangeRate() != null && result.getExchangeRate().compareTo(BigDecimal.ZERO) <= 0) {
                log.warn("Order {} received non-positive exchange rate from gateway: {}",
                        order.getOrderNumber(), result.getExchangeRate());
            }
            if (result.getAmount() != null
                    && result.getLocalAmount() != null
                    && result.getExchangeRate() != null) {
                BigDecimal expectedLocal = result.getAmount().multiply(result.getExchangeRate());
                BigDecimal diff = expectedLocal.subtract(result.getLocalAmount()).abs();
                if (diff.compareTo(BigDecimal.ONE) > 0) { // allow small rounding differences
                    log.warn("Order {} FX mismatch: expected local {} but got {} (rate {}, base {})",
                            order.getOrderNumber(), expectedLocal, result.getLocalAmount(),
                            result.getExchangeRate(), result.getAmount());
                }
            }
        } catch (Exception fxEx) {
            log.warn("Order {} FX validation error: {}", order.getOrderNumber(), fxEx.getMessage());
        }
    }

    private CheckoutResultResponse finalizePaymentTransaction(Order order, Transaction transaction, GatewayPaymentResult result, boolean isFromCart) {
        if (result.isSuccess()) {
            transaction.setStatus(TransactionStatus.SUCCESS);
            transaction.setProcessedAt(LocalDateTime.now());
            transactionRepository.save(transaction);

            try {
                return handleSuccessfulPayment(order, transaction, isFromCart);
            } catch (org.springframework.dao.OptimisticLockingFailureException e) {
                log.warn("Optimistic locking failure in checkout for order {}. Checking if concurrently completed.", order.getOrderNumber());
                // Reload to check if it was completed by another thread (e.g. webhook)
                Order reloaded = orderRepository.findById(order.getId()).orElse(order);
                if (reloaded.getStatus() == OrderStatus.COMPLETED) {
                    log.info("Order {} was completed concurrently. Returning success.", order.getOrderNumber());

                    // Re-construct success response from reloaded entity
                    List<OrderItem> orderItems = orderItemRepository.findByOrderId(reloaded.getId());
                    
                    CheckoutResultResponse.CheckoutResultResponseBuilder responseBuilder = buildSuccessResponse(reloaded, orderItems).toBuilder()
                        .transactionNumber(transaction.getTransactionNumber())
                        .gatewayTransactionId(transaction.getGatewayTransactionId());

                    return responseBuilder.build();
                } else {
                    // Real concurrent modification failure that didn't complete the order?
                    throw e;
                }
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

    private CheckoutResultResponse buildSuccessResponse(Order order, List<OrderItem> orderItems) {
        Invoice existingInvoice = order.getInvoice();
        
        CheckoutResultResponse.CheckoutResultResponseBuilder responseBuilder = CheckoutResultResponse.builder()
                .success(true)
                .orderId(order.getId())
                .orderNumber(order.getOrderNumber())
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

        if (existingInvoice != null) {
            responseBuilder
                    .invoiceNumber(existingInvoice.getInvoiceNumber())
                    .invoiceUrl(existingInvoice.getPdfUrl());
        }
        
        return responseBuilder.build();
    }

    /**
     * Create or reuse a PENDING transaction for the order with a retry loop
     * to protect against rare transaction number collisions.
     */
    private Transaction createOrReusePendingTransaction(Order order) {
        return transactionRepository
                .findFirstByOrderIdAndStatusOrderByCreatedAtDesc(order.getId(), TransactionStatus.PENDING)
                .orElseGet(() -> {
                    final int maxAttempts = 3;
                    int attempt = 0;
                    while (true) {
                        attempt++;
                        try {
                            Transaction tx = new Transaction();
                            tx.setTransactionNumber(numberGeneratorService.generateTransactionNumber());
                            tx.setOrder(order);
                            tx.setGateway(order.getPaymentMethod());
                            tx.setAmount(order.getTotalAmount());
                            tx.setCurrency(order.getCurrency());
                            tx.setStatus(TransactionStatus.PENDING);
                            tx.setCreatedAt(LocalDateTime.now());
                            return transactionRepository.save(tx);
                        } catch (DataIntegrityViolationException ex) {
                            if (attempt >= maxAttempts) {
                                log.error("Failed to create transaction for order {} after {} attempts due to " +
                                                "transaction number collision or constraint violation",
                                        order.getOrderNumber(), maxAttempts, ex);
                                throw ex;
                            }
                            log.warn("Retrying transaction creation for order {} due to constraint violation (attempt {}/{})",
                                    order.getOrderNumber(), attempt, maxAttempts);
                        }
                    }
                });
    }

    @Transactional
    private CheckoutResultResponse handleSuccessfulPayment(Order order, Transaction transaction,
                                                           boolean isFromCart) {
        // Reload order to prevent StaleObjectStateException if webhook updated it concurrently
        Long orderId = order.getId();
        order = orderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("Order not found: " + orderId));

        log.info("Payment successful for order: {}", order.getOrderNumber());

        // Idempotency guard: if order is already completed, do not attempt to complete again
        if (order.getStatus() == OrderStatus.COMPLETED) {
            log.info("Order {} is already COMPLETED. Skipping duplicate completion.", order.getOrderNumber());

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
                    .message("Order was already completed. No additional changes were applied.");

            Invoice existingInvoice = order.getInvoice();
            if (existingInvoice != null) {
                responseBuilder
                        .invoiceNumber(existingInvoice.getInvoiceNumber())
                        .invoiceUrl(existingInvoice.getPdfUrl());
            }

            return responseBuilder.build();
        }

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

        // Load order items explicitly (lazy loading issue)
        List<OrderItem> orderItems = orderItemRepository.findByOrderId(order.getId());

        // 4. Clear cart (Non-Critical)
        if (isFromCart) {
            try {
                List<Long> courseIds = orderItems.stream()
                        .map(OrderItem::getCourseId)
                        .collect(Collectors.toList());
                cartService.removeItems(order.getUserId(), courseIds);
            } catch (Exception e) {
                log.error("Failed to clear cart for user: {}", order.getUserId(), e);
            }
        }

        // 5. Generate invoice with limited retries (Non-Critical)
        InvoiceResponse invoice = generateInvoiceWithRetry(order, 3);

        // 6. Publish event (Non-Critical)
        try {
            eventPublisher.publishEvent(new OrderCompletedEvent(this, order));
        } catch (Exception e) {
            log.error("Failed to publish OrderCompletedEvent for order: {}", order.getOrderNumber(), e);
        }

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
        // Reload order to prevent StaleObjectStateException if webhook updated it concurrently
        Long orderId = order.getId();
        order = orderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("Order not found: " + orderId));

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

    /**
     * Build a deterministic cart signature from user + items + total amount.
     * This is used to detect cart changes between preview and checkout.
     */
    private String buildCartSignature(Long userId, List<CheckoutItemPreview> items, BigDecimal totalAmount) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");

            StringBuilder sb = new StringBuilder();
            sb.append("user:").append(userId).append("|");
            // Sort items by courseId for deterministic ordering
            items.stream()
                    .sorted((a, b) -> a.getCourseId().compareTo(b.getCourseId()))
                    .forEach(item -> sb.append(item.getCourseId())
                            .append(":")
                            .append(item.getEffectivePrice())
                            .append(":")
                            .append(item.getCurrency())
                            .append("|"));
            sb.append("total:").append(totalAmount);

            byte[] hash = digest.digest(sb.toString().getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                String h = Integer.toHexString(0xff & b);
                if (h.length() == 1) {
                    hex.append('0');
                }
                hex.append(h);
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            // Fallback: return plain concatenated string (still usable for change detection)
            log.error("SHA-256 not available for cart signature. Falling back to raw string.", e);
            StringBuilder sb = new StringBuilder();
            sb.append("user:").append(userId).append("|");
            items.stream()
                    .sorted((a, b) -> a.getCourseId().compareTo(b.getCourseId()))
                    .forEach(item -> sb.append(item.getCourseId())
                            .append(":")
                            .append(item.getEffectivePrice())
                            .append(":")
                            .append(item.getCurrency())
                            .append("|"));
            sb.append("total:").append(totalAmount);
            return sb.toString();
        }
    }

    private void createEnrollmentsForOrder(Order order) {
        List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());

        for (OrderItem item : items) {
            try {
                // Re-validate enrollment to avoid duplicates in race conditions
                boolean alreadyEnrolled = enrollmentRepository.existsByCourseIdAndStudentIdAndStatusNot(
                        item.getCourseId(), order.getUserId(), EnrollmentStatus.DROPPED);

                if (alreadyEnrolled) {
                    log.debug("Skipping enrollment for user {} in course {} - already enrolled",
                            order.getUserId(), item.getCourseId());
                    continue;
                }

                enrollmentService.enrollStudent(item.getCourseId(), order.getUserId());
                log.debug("Created enrollment for user {} in course {}", order.getUserId(), item.getCourseId());
            } catch (Exception e) {
                log.error("Failed to create enrollment for course {}: {}",
                        item.getCourseId(), e.getMessage());
                throw new PaymentFailedException("Failed to activate enrollment: " + e.getMessage());
            }
        }
    }

    /**
     * Generate invoice with a limited number of retry attempts.
     * Non-critical: returns null if all attempts fail.
     */
    private InvoiceResponse generateInvoiceWithRetry(Order order, int maxAttempts) {
        InvoiceResponse invoice = null;
        int attempt = 0;
        while (attempt < maxAttempts) {
            attempt++;
            try {
                log.debug("Generating invoice for order {} (attempt {}/{})",
                        order.getOrderNumber(), attempt, maxAttempts);

                invoice = invoiceService.generateInvoice(order);

                // Generate PDF for invoice
                invoiceService.generateInvoicePdf(invoice.getId());

                // Reload invoice to get updated PDF URL
                invoice = invoiceService.getInvoiceById(invoice.getId());

                return invoice;
            } catch (Exception e) {
                log.error("Failed to generate invoice for order {} on attempt {}/{}: {}",
                        order.getOrderNumber(), attempt, maxAttempts, e.getMessage(), e);
            }
        }

        log.error("Giving up invoice generation for order {} after {} attempts",
                order.getOrderNumber(), maxAttempts);
        return null;
    }
}
