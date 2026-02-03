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
import com.edumind.lms.modules.payment.gateway.impl.PayPalGatewayProperties;
import com.edumind.lms.modules.payment.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.PlatformTransactionManager;

import org.springframework.transaction.support.TransactionTemplate;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityNotFoundException;
import jakarta.persistence.PersistenceContext;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
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
    private final PayPalGatewayProperties payPalGatewayProperties;

    @PersistenceContext
    private EntityManager entityManager;

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

        // Check idempotency key - return existing order if already created
        if (request.getIdempotencyKey() != null && !request.getIdempotencyKey().isBlank()) {
            var existingOrder = orderRepository.findByIdempotencyKeyAndUserId(
                    request.getIdempotencyKey(), userId);
            if (existingOrder.isPresent()) {
                Order order = existingOrder.get();
                log.info("Found existing order {} for idempotency key {}",
                        order.getOrderNumber(), request.getIdempotencyKey());

                List<OrderItem> orderItems = orderItemRepository.findByOrderId(order.getId());
                return CheckoutResultResponse.builder()
                        .success(order.isCompleted())
                        .pending(order.getStatus() == OrderStatus.PENDING || order.getStatus() == OrderStatus.PROCESSING)
                        .orderId(order.getId())
                        .orderNumber(order.getOrderNumber())
                        .orderStatus(order.getStatus())
                        .totalAmount(order.getTotalAmount())
                        .currency(order.getCurrency())
                        .paymentMethod(order.getPaymentMethod())
                        .enrolledCourseIds(order.isCompleted() ? orderItems.stream()
                                .map(OrderItem::getCourseId).collect(Collectors.toList()) : null)
                        .createdAt(order.getCreatedAt())
                        .completedAt(order.getCompletedAt())
                        .message("Order already exists for this request.")
                        .build();
            }
        }

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

        // Check for existing active order and handle expiration BEFORE creating new order
        CheckoutResultResponse existingOrderResponse = handleExistingActiveOrder(userId);
        if (existingOrderResponse != null) {
            return existingOrderResponse;
        }

        // 2. Build order (inside transaction via OrderService)
        Order order;
        try {
            order = orderService.createOrderFromCart(userId, cartItems, request);
        } catch (DataIntegrityViolationException ex) {
            // Likely concurrent checkout hitting unique active-order constraint
            // This is a fallback - handleExistingActiveOrder should have caught this
            log.warn("Active checkout already exists for user {}. Blocking duplicate checkout.", userId, ex);

            // Try to find the existing order to return useful info
            Order existingOrder = orderRepository.findActiveOrderByUserId(userId).orElse(null);

            CheckoutResultResponse.CheckoutResultResponseBuilder responseBuilder = CheckoutResultResponse.builder()
                    .success(false)
                    .message("You already have a checkout in progress. Please complete it or cancel to start a new one.")
                    .errorCode("CHECKOUT_IN_PROGRESS")
                    .errorMessage("Active checkout already exists for this user")
                    .canRetry(false);

            if (existingOrder != null) {
                responseBuilder
                        .orderId(existingOrder.getId())
                        .orderNumber(existingOrder.getOrderNumber())
                        .orderStatus(existingOrder.getStatus())
                        .totalAmount(existingOrder.getTotalAmount())
                        .currency(existingOrder.getCurrency())
                        .paymentMethod(existingOrder.getPaymentMethod())
                        .createdAt(existingOrder.getCreatedAt());

                // If the order has a redirect URL from a pending transaction, include it
                transactionRepository.findFirstByOrderIdAndStatusOrderByCreatedAtDesc(
                        existingOrder.getId(), TransactionStatus.PENDING)
                        .ifPresent(tx -> {
                            if (tx.getRedirectUrl() != null) {
                                responseBuilder.redirectUrl(tx.getRedirectUrl());
                                responseBuilder.requiresRedirect(true);
                            }
                        });
            }

            return responseBuilder.build();
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

        // Check for existing active order before creating new one
        CheckoutResultResponse existingOrderResponse = handleExistingActiveOrder(userId);
        if (existingOrderResponse != null) {
            return existingOrderResponse;
        }

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

        // Ensure order is in persistence context and flushed before processPayment
        if (!entityManager.contains(order)) {
            order = entityManager.merge(order);
        }
        entityManager.flush();

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

    /**
     * Handle payment callback from payment gateway.
     * Reload order explicitly to avoid NPE/LazyInitializationException.
     */
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

        // Reload order explicitly to avoid NPE/LazyInitializationException
        Long orderId = transaction.getOrder().getId();
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("Order not found for transaction: " + gatewayTransactionId));

        // 2. Update transaction status
        transaction.setGatewayResponse(rawPayload);

        if ("SUCCESS".equalsIgnoreCase(status)) {
            transaction.setStatus(TransactionStatus.SUCCESS);
            transaction.setProcessedAt(LocalDateTime.now());
            transactionRepository.save(transaction);

            if (!order.isCompleted()) {
                handleSuccessfulPayment(order, transaction, false); // Callback - cart already handled in original checkout
            }
        } else {
            transaction.setStatus(TransactionStatus.FAILED);
            transaction.setFailureReason("Callback reported failure: " + status);
            transactionRepository.save(transaction);

            // Fail order
            order.setStatus(OrderStatus.FAILED);
            order.setFailureReason("Payment failed (callback): " + status);
            orderRepository.save(order);
        }
    }

    /**
     * Retry payment for a failed/pending order.
     * Don't clear cart on retry - user's current cart may have changed.
     * Retry should only process the order's existing items, not touch the cart.
     */
    @Override
    public CheckoutResultResponse retryPayment(Long userId, Long orderId, CheckoutRequest request) {
        log.info("Retrying payment for order: {}", orderId);

        Order order = resetOrderForRetry(userId, orderId);

        // Pass false for isFromCart - retry should NOT clear the user's cart
        // The user's current cart may have different items than the original order
        return processPayment(order, request, false);
    }

    @Override
    @Transactional
    public CheckoutResultResponse capturePayment(Long userId, String gatewayOrderId) {
        log.info("Capturing payment for gateway order: {}", gatewayOrderId);

        // 1. Find Transaction by Gateway Order ID with pessimistic lock to prevent race conditions
        // between this endpoint and potential webhook callbacks.
        // Use findByGatewayIdForUpdate which checks both gatewayTransactionId and gatewayOrderId
        // This handles retries where gatewayTransactionId was already updated to Capture ID
        Transaction transaction = transactionRepository.findByGatewayIdForUpdate(gatewayOrderId)
                .orElseThrow(() -> new EntityNotFoundException("Transaction not found for Gateway Order ID: " + gatewayOrderId));

        // Check if already processed (idempotency)
        if (transaction.getStatus() == TransactionStatus.SUCCESS) {
            log.info("Transaction {} already processed successfully", gatewayOrderId);
            Order order = transaction.getOrder();
            List<OrderItem> orderItems = orderItemRepository.findByOrderId(order.getId());
            return buildSuccessResponse(order, orderItems).toBuilder()
                    .transactionNumber(transaction.getTransactionNumber())
                    .gatewayTransactionId(transaction.getGatewayTransactionId())
                    .message("Payment already captured.")
                    .build();
        }

        Order order = transaction.getOrder();
        if (!order.getUserId().equals(userId)) {
            throw new PaymentFailedException("User does not own this order");
        }

        // Check if order is in valid state for capture
        if (order.getStatus() == OrderStatus.COMPLETED) {
            log.info("Order {} already completed", order.getOrderNumber());
            List<OrderItem> orderItems = orderItemRepository.findByOrderId(order.getId());
            return buildSuccessResponse(order, orderItems).toBuilder()
                    .transactionNumber(transaction.getTransactionNumber())
                    .gatewayTransactionId(transaction.getGatewayTransactionId())
                    .message("Order already completed.")
                    .build();
        }

        // For CANCELLED orders, reject capture
        if (order.getStatus() == OrderStatus.CANCELLED) {
            log.warn("Cannot capture payment for cancelled order {}", order.getOrderNumber());
            return CheckoutResultResponse.builder()
                    .success(false)
                    .orderId(order.getId())
                    .orderNumber(order.getOrderNumber())
                    .orderStatus(order.getStatus())
                    .message("Cannot capture payment for cancelled order.")
                    .errorCode("INVALID_ORDER_STATUS")
                    .build();
        }

        // For FAILED orders (e.g., expired), we'll still attempt capture
        // If the user completed payment on PayPal before expiration, we should honor it
        boolean wasFailedOrder = order.getStatus() == OrderStatus.FAILED;
        if (wasFailedOrder) {
            log.info("Attempting capture for failed order {} - user may have completed PayPal payment before expiration",
                    order.getOrderNumber());
            // Reset to PROCESSING for the capture attempt
            order.setStatus(OrderStatus.PROCESSING);
            orderRepository.save(order);
        }

        // 2. Call Gateway to Capture (use order's payment method)
        PaymentGateway gateway = getGatewayForPaymentMethod(order.getPaymentMethod());
        GatewayPaymentResult result;
        try {
            result = gateway.capturePayment(gatewayOrderId);
        } catch (Exception e) {
            log.error("Capture failed for order {}", gatewayOrderId, e);
            transaction.setStatus(TransactionStatus.FAILED);
            transaction.setFailureReason("Capture failed: " + e.getMessage());
            transactionRepository.save(transaction);

            GatewayPaymentResult errorResult = GatewayPaymentResult.builder()
                    .success(false)
                    .errorCode("CAPTURE_FAILED")
                    .errorMessage(e.getMessage())
                    .build();
            return handleFailedPayment(order, transaction, errorResult);
        }

        // 3. Handle Result
        if (result.isSuccess()) {
            // Preserve original gateway order ID if not already set (for retry lookups)
            if (transaction.getGatewayOrderId() == null) {
                transaction.setGatewayOrderId(gatewayOrderId);
            }
            // Update Transaction with Capture ID (important for refunds!)
            // Note: gatewayTransactionId changes from PayPal Order ID to Capture ID here
            transaction.setGatewayTransactionId(result.getGatewayTransactionId());
            transaction.setGatewayResponse(result.getRawResponse());
            return finalizePaymentTransaction(order, transaction, result, true);
        } else {
            return handleFailedPayment(order, transaction, result);
        }
    }

    @Override
    @Transactional
    public CheckoutResultResponse handlePaymentCancellation(Long userId, Long orderId) {
        log.info("Handling payment cancellation for order: {}, user: {}", orderId, userId);

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));

        // Verify user owns the order
        if (!order.getUserId().equals(userId)) {
            throw new OrderNotFoundException(orderId);
        }

        // If already completed, just return success
        if (order.getStatus() == OrderStatus.COMPLETED) {
            log.info("Order {} is already completed, ignoring cancellation", order.getOrderNumber());
            List<OrderItem> orderItems = orderItemRepository.findByOrderId(order.getId());
            return buildSuccessResponse(order, orderItems).toBuilder()
                    .message("Order already completed.")
                    .build();
        }

        // If already cancelled or failed, return current state
        if (order.getStatus() == OrderStatus.CANCELLED) {
            return CheckoutResultResponse.builder()
                    .success(false)
                    .orderId(order.getId())
                    .orderNumber(order.getOrderNumber())
                    .orderStatus(order.getStatus())
                    .totalAmount(order.getTotalAmount())
                    .currency(order.getCurrency())
                    .paymentMethod(order.getPaymentMethod())
                    .createdAt(order.getCreatedAt())
                    .message("Order was already cancelled.")
                    .build();
        }

        // Mark order as CANCELLED so user can start a fresh checkout
        // SePay doesn't have a capture step like PayPal, so explicit cancel should
        // allow user to checkout again without being blocked by existing order
        order.setStatus(OrderStatus.CANCELLED);
        order.setFailureReason("Payment cancelled by user");
        orderRepository.save(order);

        // Update any pending transactions
        transactionRepository.findFirstByOrderIdAndStatusOrderByCreatedAtDesc(order.getId(), TransactionStatus.PENDING)
                .ifPresent(transaction -> {
                    transaction.setStatus(TransactionStatus.FAILED);
                    transaction.setFailureCode("USER_CANCELLED");
                    transaction.setFailureReason("User cancelled payment on gateway page");
                    transactionRepository.save(transaction);
                });

        log.info("Payment cancellation handled for order {}. Order marked as CANCELLED.", order.getOrderNumber());

        return CheckoutResultResponse.builder()
                .success(false)
                .pending(false)
                .orderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .orderStatus(order.getStatus())
                .totalAmount(order.getTotalAmount())
                .currency(order.getCurrency())
                .paymentMethod(order.getPaymentMethod())
                .createdAt(order.getCreatedAt())
                .message("Payment cancelled. You can start a new checkout.")
                .canRetry(false)
                .build();
    }

    /**
     * Reset order for retry payment - uses TransactionTemplate since @Transactional
     * doesn't work on private methods (Spring AOP limitation).
     */
    private Order resetOrderForRetry(Long userId, Long orderId) {
        TransactionTemplate txTemplate = new TransactionTemplate(transactionManager);
        return txTemplate.execute(status -> {
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
        });
    }

    // ===== Private Helpers =====

    /**
     * Check for existing active order and handle expiration.
     * Returns null if no blocking order exists (caller should proceed).
     * Returns a response if there's a non-expired active order (caller should return this).
     */
    private CheckoutResultResponse handleExistingActiveOrder(Long userId) {
        Optional<Order> existingOrderOpt = orderRepository.findActiveOrderByUserId(userId);

        if (existingOrderOpt.isEmpty()) {
            return null; // No active order, proceed with new checkout
        }

        Order existingOrder = existingOrderOpt.get();
        LocalDateTime now = LocalDateTime.now();

        // Check if the existing order has expired
        if (existingOrder.getExpiresAt() != null && now.isAfter(existingOrder.getExpiresAt())) {
            log.info("Found expired active order {} for user {}. Marking as FAILED to allow new checkout.",
                    existingOrder.getOrderNumber(), userId);

            // Mark expired order as FAILED in a separate transaction
            TransactionTemplate txTemplate = new TransactionTemplate(transactionManager);
            txTemplate.execute(status -> {
                Order freshOrder = orderRepository.findById(existingOrder.getId())
                        .orElse(null);
                if (freshOrder != null &&
                    (freshOrder.getStatus() == OrderStatus.PENDING || freshOrder.getStatus() == OrderStatus.PROCESSING)) {
                    freshOrder.setStatus(OrderStatus.FAILED);
                    freshOrder.setFailureReason("Order expired - payment not completed within time limit");
                    orderRepository.save(freshOrder);

                    // Also fail any pending transactions
                    transactionRepository.findFirstByOrderIdAndStatusOrderByCreatedAtDesc(
                            freshOrder.getId(), TransactionStatus.PENDING)
                            .ifPresent(tx -> {
                                tx.setStatus(TransactionStatus.FAILED);
                                tx.setFailureReason("Order expired");
                                transactionRepository.save(tx);
                            });
                }
                return null;
            });

            return null; // Order expired and marked as FAILED, proceed with new checkout
        }

        // Order exists and is NOT expired - user must complete or cancel it
        log.info("User {} has active non-expired order {}. Blocking new checkout.",
                userId, existingOrder.getOrderNumber());

        CheckoutResultResponse.CheckoutResultResponseBuilder responseBuilder = CheckoutResultResponse.builder()
                .success(false)
                .pending(true)
                .orderId(existingOrder.getId())
                .orderNumber(existingOrder.getOrderNumber())
                .orderStatus(existingOrder.getStatus())
                .totalAmount(existingOrder.getTotalAmount())
                .currency(existingOrder.getCurrency())
                .paymentMethod(existingOrder.getPaymentMethod())
                .createdAt(existingOrder.getCreatedAt())
                .message("You have an active checkout in progress. Please complete it or cancel to start a new one.")
                .errorCode("CHECKOUT_IN_PROGRESS")
                .errorMessage("Active checkout already exists - complete or cancel it first")
                .canRetry(false);

        // If the order has a redirect URL, include it so frontend can redirect user
        transactionRepository.findFirstByOrderIdAndStatusOrderByCreatedAtDesc(
                existingOrder.getId(), TransactionStatus.PENDING)
                .ifPresent(tx -> {
                    if (tx.getRedirectUrl() != null) {
                        responseBuilder.redirectUrl(tx.getRedirectUrl());
                        responseBuilder.requiresRedirect(true);
                    }
                });

        return responseBuilder.build();
    }

    /**
     * Complete a free order - uses TransactionTemplate since @Transactional doesn't work on private methods (Spring AOP limitation).
     * Also sets order status to COMPLETED after enrollment
     */
    private CheckoutResultResponse completeFreeOrder(Order order, Long userId, boolean isFromCart) {
        log.info("Completing free order: {}", order.getOrderNumber());

        // Idempotency and status guards (read-only checks, no transaction needed)
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

        // Execute critical operations in a transaction
        TransactionTemplate txTemplate = new TransactionTemplate(transactionManager);
        final Long orderId = order.getId();

        Order completedOrder = txTemplate.execute(status -> {
            // Reload order to get fresh state
            Order freshOrder = orderRepository.findById(orderId)
                    .orElseThrow(() -> new EntityNotFoundException("Order not found: " + orderId));

            // Double-check status after reload (another thread may have completed it)
            if (freshOrder.getStatus() == OrderStatus.COMPLETED) {
                return freshOrder;
            }

            // Mark as processing during completion to reduce race risk
            freshOrder.setStatus(OrderStatus.PROCESSING);
            freshOrder.setPaymentMethod(PaymentMethod.FREE);
            orderRepository.save(freshOrder);

            // Create enrollments
            createEnrollmentsForOrder(freshOrder);

            // Set order to COMPLETED after successful enrollment
            freshOrder.setStatus(OrderStatus.COMPLETED);
            freshOrder.setCompletedAt(LocalDateTime.now());
            return orderRepository.save(freshOrder);
        });

        // Load order items explicitly (lazy loading issue)
        List<OrderItem> orderItems = orderItemRepository.findByOrderId(completedOrder.getId());

        // Clear cart only if checkout was from cart (non-critical, outside main transaction)
        if (isFromCart) {
            try {
                List<Long> courseIds = orderItems.stream()
                        .map(OrderItem::getCourseId)
                        .collect(Collectors.toList());
                cartService.removeItems(userId, courseIds);
            } catch (Exception e) {
                log.error("Failed to clear cart for user {}: {}", userId, e.getMessage());
            }
        }

        // Generate invoice with limited retries (non-critical)
        InvoiceResponse invoice = generateInvoiceWithRetry(completedOrder, 3);

        // Publish event (non-critical)
        try {
            eventPublisher.publishEvent(new OrderCompletedEvent(this, completedOrder));
        } catch (Exception e) {
            log.error("Failed to publish OrderCompletedEvent for order {}: {}", completedOrder.getOrderNumber(), e.getMessage());
        }

        log.info("Free order completed: {}", completedOrder.getOrderNumber());

        return CheckoutResultResponse.builder()
                .success(true)
                .orderId(completedOrder.getId())
                .orderNumber(completedOrder.getOrderNumber())
                .orderStatus(completedOrder.getStatus())
                .totalAmount(completedOrder.getTotalAmount())
                .currency(completedOrder.getCurrency())
                .paymentMethod(completedOrder.getPaymentMethod())
                .invoiceNumber(invoice != null ? invoice.getInvoiceNumber() : null)
                .invoiceUrl(invoice != null ? invoice.getPdfUrl() : null)
                .enrolledCourseIds(orderItems.stream()
                        .map(OrderItem::getCourseId)
                        .collect(Collectors.toList()))
                .createdAt(completedOrder.getCreatedAt())
                .completedAt(completedOrder.getCompletedAt())
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

        // Ensure order is in persistence context and flushed before updateRetryMetadata (which uses REQUIRES_NEW)
        // This ensures the order is visible to the new transaction
        if (!entityManager.contains(order)) {
            order = entityManager.merge(order);
        }
        entityManager.flush();

        updateRetryMetadata(order);

        // Validate payment method capabilities for this currency before contacting gateway
        if (order.getPaymentMethod() != null) {
            paymentMethodPolicyService.validatePaymentMethod(order.getPaymentMethod(), order.getCurrency());
        }

        // Select gateway based on payment method (supports multiple gateways)
        PaymentGateway gateway = getGatewayForPaymentMethod(order.getPaymentMethod());

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
            // Check if this PROCESSING order has expired - if so, reset to PENDING for retry
            if (order.getExpiresAt() != null && LocalDateTime.now().isAfter(order.getExpiresAt())) {
                log.info("Order {} was PROCESSING but has expired. Resetting to PENDING for retry.",
                        order.getOrderNumber());

                // Mark any pending transactions as FAILED
                List<Transaction> pendingTransactions = transactionRepository.findByOrderIdAndStatus(
                        order.getId(), TransactionStatus.PENDING);
                for (Transaction tx : pendingTransactions) {
                    tx.setStatus(TransactionStatus.FAILED);
                    tx.setFailureReason("Payment abandoned - order expired while processing");
                    transactionRepository.save(tx);
                }

                // Reset order to PENDING and extend expiration
                order.setStatus(OrderStatus.PENDING);
                order.setExpiresAt(LocalDateTime.now().plusMinutes(30));
                orderRepository.save(order);

                // Return null to allow payment processing to continue
                return null;
            }

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

    /**
     * Update retry metadata on the order.
     * Simply updates the order object and saves it through the repository.
     * The order was already persisted in createOrderFromCart/createOrderFromSingleCourse,
     * so this save will work within the same transaction.
     */
    private void updateRetryMetadata(Order order) {
        Integer currentRetryCount = order.getRetryCount() != null ? order.getRetryCount() : 0;
        order.setRetryCount(currentRetryCount + 1);
        order.setLastPaymentAttemptAt(LocalDateTime.now());
        orderRepository.save(order);
    }

    private GatewayPaymentRequest prepareGatewayRequest(Order order, CheckoutRequest request) {
        // Build return URLs for redirect-based payment flows (PayPal, SePay)
        String successUrl = request.getSuccessUrl();
        String cancelUrl = request.getCancelUrl();

        // If client didn't provide URLs, use defaults from PayPal config
        // Note: PayPal appends ?token=ORDER_ID to the success URL automatically
        if (successUrl == null || successUrl.isBlank()) {
            String baseUrl = payPalGatewayProperties.getReturnBaseUrl();
            successUrl = baseUrl + "/checkout/success";
        }
        if (cancelUrl == null || cancelUrl.isBlank()) {
            String baseUrl = payPalGatewayProperties.getReturnBaseUrl();
            // Redirect to failed page with orderId so FE can call cancel endpoint
            cancelUrl = baseUrl + "/checkout/failed?orderId=" + order.getId();
        }

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
                .successUrl(successUrl)
                .cancelUrl(cancelUrl)
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
        // Store the original gateway order ID (e.g., PayPal Order ID) for later lookups
        // This is important because gatewayTransactionId will be overwritten with Capture ID after capture
        if (transaction.getGatewayOrderId() == null && result.getGatewayTransactionId() != null) {
            transaction.setGatewayOrderId(result.getGatewayTransactionId());
        }
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
                log.error("CRITICAL: Payment successful but order completion failed for Order: {}. Attempting auto-refund.",
                        order.getOrderNumber(), e);

                // Payment was captured but enrollment failed - attempt automatic refund
                return handlePaymentSuccessEnrollmentFailure(order, transaction, e.getMessage());
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

    /**
     * Handle successful payment - uses TransactionTemplate since @Transactional
     * doesn't work on private methods (Spring AOP limitation).
     */
    private CheckoutResultResponse handleSuccessfulPayment(Order order, Transaction transaction,
                                                           boolean isFromCart) {
        log.info("Payment successful for order: {}", order.getOrderNumber());

        final Long orderId = order.getId();

        // Check if already completed (read-only, no transaction needed)
        Order currentOrder = orderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("Order not found: " + orderId));

        if (currentOrder.getStatus() == OrderStatus.COMPLETED) {
            log.info("Order {} is already COMPLETED. Skipping duplicate completion.", currentOrder.getOrderNumber());
            List<OrderItem> orderItems = orderItemRepository.findByOrderId(currentOrder.getId());

            CheckoutResultResponse.CheckoutResultResponseBuilder responseBuilder = CheckoutResultResponse.builder()
                    .success(true)
                    .orderId(currentOrder.getId())
                    .orderNumber(currentOrder.getOrderNumber())
                    .transactionNumber(transaction.getTransactionNumber())
                    .gatewayTransactionId(transaction.getGatewayTransactionId())
                    .orderStatus(currentOrder.getStatus())
                    .totalAmount(currentOrder.getTotalAmount())
                    .currency(currentOrder.getCurrency())
                    .paymentMethod(currentOrder.getPaymentMethod())
                    .enrolledCourseIds(orderItems.stream()
                            .map(OrderItem::getCourseId)
                            .collect(Collectors.toList()))
                    .createdAt(currentOrder.getCreatedAt())
                    .completedAt(currentOrder.getCompletedAt())
                    .message("Order was already completed. No additional changes were applied.");

            // Attempt to clear cart even if order is already completed
            // This handles the race condition where Webhook completed the order but failed/skipped clearing cart
            if (isFromCart) {
                try {
                    List<Long> courseIds = orderItems.stream()
                            .map(OrderItem::getCourseId)
                            .collect(Collectors.toList());
                    cartService.removeItems(currentOrder.getUserId(), courseIds);
                } catch (Exception e) {
                    log.error("Failed to clear cart for user {} (idempotency check): {}", currentOrder.getUserId(), e.getMessage());
                }
            }

            Invoice existingInvoice = currentOrder.getInvoice();
            if (existingInvoice != null) {
                responseBuilder
                        .invoiceNumber(existingInvoice.getInvoiceNumber())
                        .invoiceUrl(existingInvoice.getPdfUrl());
            }
            return responseBuilder.build();


        }

        // Execute critical operations in a transaction
        TransactionTemplate txTemplate = new TransactionTemplate(transactionManager);

        Order completedOrder = txTemplate.execute(status -> {
            // Reload order to prevent StaleObjectStateException
            Order freshOrder = orderRepository.findById(orderId)
                    .orElseThrow(() -> new EntityNotFoundException("Order not found: " + orderId));

            // Double-check status after reload
            if (freshOrder.getStatus() == OrderStatus.COMPLETED) {
                return freshOrder;
            }

            // 1. Complete order
            freshOrder.setStatus(OrderStatus.COMPLETED);
            freshOrder.setCompletedAt(LocalDateTime.now());
            orderRepository.save(freshOrder);

            // 2. Create enrollments
            createEnrollmentsForOrder(freshOrder);

            return freshOrder;
        });

        // 3. Create earnings
        try {
            earningService.createEarningsForOrder(completedOrder);
        } catch (Exception e) {
            log.error("Failed to create earnings for order: {}", completedOrder.getOrderNumber(), e);
        }

        // Load order items explicitly
        List<OrderItem> orderItems = orderItemRepository.findByOrderId(completedOrder.getId());

        // 4. Clear cart
        if (isFromCart) {
            try {
                List<Long> courseIds = orderItems.stream()
                        .map(OrderItem::getCourseId)
                        .collect(Collectors.toList());
                cartService.removeItems(completedOrder.getUserId(), courseIds);
            } catch (Exception e) {
                log.error("Failed to clear cart for user: {}", completedOrder.getUserId(), e);
            }
        }

        // 5. Generate invoice with limited retries
        InvoiceResponse invoice = generateInvoiceWithRetry(completedOrder, 3);

        // 6. Publish event
        try {
            eventPublisher.publishEvent(new OrderCompletedEvent(this, completedOrder));
        } catch (Exception e) {
            log.error("Failed to publish OrderCompletedEvent for order: {}", completedOrder.getOrderNumber(), e);
        }

        CheckoutResultResponse.CheckoutResultResponseBuilder responseBuilder = CheckoutResultResponse.builder()
                .success(true)
                .orderId(completedOrder.getId())
                .orderNumber(completedOrder.getOrderNumber())
                .transactionNumber(transaction.getTransactionNumber())
                .gatewayTransactionId(transaction.getGatewayTransactionId())
                .orderStatus(completedOrder.getStatus())
                .totalAmount(completedOrder.getTotalAmount())
                .currency(completedOrder.getCurrency())
                .paymentMethod(completedOrder.getPaymentMethod())
                .enrolledCourseIds(orderItems.stream()
                        .map(OrderItem::getCourseId)
                        .collect(Collectors.toList()))
                .createdAt(completedOrder.getCreatedAt())
                .completedAt(completedOrder.getCompletedAt())
                .message("Payment successful! You can now access your courses.");

        if (invoice != null) {
            responseBuilder
                .invoiceNumber(invoice.getInvoiceNumber())
                .invoiceUrl(invoice.getPdfUrl());
        }

        return responseBuilder.build();
    }

    /**
     * Handle pending payment (requires redirect) - uses TransactionTemplate since @Transactional
     * doesn't work on private methods (Spring AOP limitation).
     */
    private CheckoutResultResponse handlePendingPayment(Order order, Transaction transaction,
                                                        GatewayPaymentResult result) {
        log.info("Payment pending for order: {} - redirect required", order.getOrderNumber());

        final Long orderId = order.getId();

        // Update order status in a transaction
        TransactionTemplate txTemplate = new TransactionTemplate(transactionManager);
        Order updatedOrder = txTemplate.execute(status -> {
            Order freshOrder = orderRepository.findById(orderId)
                    .orElseThrow(() -> new EntityNotFoundException("Order not found: " + orderId));
            freshOrder.setStatus(OrderStatus.PROCESSING);
            return orderRepository.save(freshOrder);
        });

        return CheckoutResultResponse.builder()
                .success(false)
                .pending(true)
                .orderId(updatedOrder.getId())
                .orderNumber(updatedOrder.getOrderNumber())
                .transactionNumber(transaction.getTransactionNumber())
                .orderStatus(updatedOrder.getStatus())
                .totalAmount(updatedOrder.getTotalAmount())
                .currency(updatedOrder.getCurrency())
                .localAmount(result.getLocalAmount())
                .localCurrency(result.getLocalCurrency())
                .paymentMethod(updatedOrder.getPaymentMethod())
                .createdAt(updatedOrder.getCreatedAt())
                .message("Please complete payment on the payment provider's page.")
                .redirectUrl(result.getRedirectUrl())
                .requiresRedirect(true)
                .build();
    }

    /**
     * Handle failed payment - uses TransactionTemplate since @Transactional
     * doesn't work on private methods (Spring AOP limitation).
     */
    private CheckoutResultResponse handleFailedPayment(Order order, Transaction transaction,
                                                       GatewayPaymentResult result) {
        log.warn("Payment failed for order: {} - {}", order.getOrderNumber(), result.getErrorMessage());

        final Long orderId = order.getId();

        // Update order status in a transaction
        TransactionTemplate txTemplate = new TransactionTemplate(transactionManager);
        Order failedOrder = txTemplate.execute(status -> {
            Order freshOrder = orderRepository.findById(orderId)
                    .orElseThrow(() -> new EntityNotFoundException("Order not found: " + orderId));
            freshOrder.setStatus(OrderStatus.FAILED);
            freshOrder.setFailureReason(result.getErrorMessage());
            return orderRepository.save(freshOrder);
        });

        // Publish event (non-critical, outside transaction)
        try {
            eventPublisher.publishEvent(new PaymentFailedEvent(this, failedOrder, result.getErrorMessage()));
        } catch (Exception e) {
            log.error("Failed to publish PaymentFailedEvent for order {}: {}", failedOrder.getOrderNumber(), e.getMessage());
        }

        return CheckoutResultResponse.builder()
                .success(false)
                .orderId(failedOrder.getId())
                .orderNumber(failedOrder.getOrderNumber())
                .transactionNumber(transaction.getTransactionNumber())
                .orderStatus(failedOrder.getStatus())
                .totalAmount(failedOrder.getTotalAmount())
                .currency(failedOrder.getCurrency())
                .paymentMethod(failedOrder.getPaymentMethod())
                .createdAt(failedOrder.getCreatedAt())
                .message("Payment failed: " + result.getErrorMessage())
                .errorCode(result.getErrorCode())
                .errorMessage(result.getErrorMessage())
                .build();
    }

    /**
     * Handle the critical case where payment was captured successfully but enrollment failed.
     * This attempts an automatic refund to maintain data consistency.
     * If refund fails, marks the order for manual intervention.
     */
    private CheckoutResultResponse handlePaymentSuccessEnrollmentFailure(Order order, Transaction transaction, String enrollmentError) {
        log.warn("CRITICAL: Payment captured but enrollment failed for order {}. Attempting automatic refund.",
                order.getOrderNumber());

        // The gatewayTransactionId at this point should be the Capture ID (needed for refunds)
        String captureId = transaction.getGatewayTransactionId();

        if (captureId == null || captureId.isBlank()) {
            log.error("Cannot refund order {} - no capture ID available", order.getOrderNumber());
            return markOrderForManualIntervention(order, transaction, enrollmentError, "No capture ID for refund");
        }

        // Attempt automatic refund (use order's payment method)
        PaymentGateway gateway = getGatewayForPaymentMethod(order.getPaymentMethod());
        GatewayRefundResult refundResult;

        try {
            refundResult = gateway.refund(captureId, order.getTotalAmount(), order.getCurrency());
        } catch (Exception refundEx) {
            log.error("Refund attempt threw exception for order {}: {}", order.getOrderNumber(), refundEx.getMessage(), refundEx);
            return markOrderForManualIntervention(order, transaction, enrollmentError,
                    "Refund exception: " + refundEx.getMessage());
        }

        if (refundResult != null && refundResult.isSuccess()) {
            log.info("Auto-refund successful for order {}. Refund ID: {}",
                    order.getOrderNumber(), refundResult.getRefundTransactionId());

            // Update transaction and order status to REFUNDED
            TransactionTemplate txTemplate = new TransactionTemplate(transactionManager);
            final Long orderId = order.getId();

            Order refundedOrder = txTemplate.execute(status -> {
                Order freshOrder = orderRepository.findById(orderId)
                        .orElseThrow(() -> new EntityNotFoundException("Order not found: " + orderId));

                // Mark order as refunded
                freshOrder.setStatus(OrderStatus.REFUNDED);
                freshOrder.setFailureReason("Auto-refunded: Enrollment failed after payment capture. " + enrollmentError);
                Order saved = orderRepository.save(freshOrder);

                // Mark transaction as refunded
                transaction.setStatus(TransactionStatus.REFUNDED);
                transaction.setFailureReason("Auto-refunded due to enrollment failure: " + enrollmentError);
                transactionRepository.save(transaction);

                return saved;
            });

            return CheckoutResultResponse.builder()
                    .success(false)
                    .orderId(refundedOrder.getId())
                    .orderNumber(refundedOrder.getOrderNumber())
                    .transactionNumber(transaction.getTransactionNumber())
                    .orderStatus(refundedOrder.getStatus())
                    .totalAmount(refundedOrder.getTotalAmount())
                    .currency(refundedOrder.getCurrency())
                    .paymentMethod(refundedOrder.getPaymentMethod())
                    .createdAt(refundedOrder.getCreatedAt())
                    .message("Your payment has been automatically refunded due to a system error. Please try again or contact support.")
                    .errorCode("ENROLLMENT_FAILED_REFUNDED")
                    .errorMessage("Enrollment failed after payment. Full refund issued automatically.")
                    .build();
        } else {
            // Refund failed - mark for manual intervention
            String refundError = refundResult != null ? refundResult.getErrorMessage() : "Refund returned null";
            log.error("Auto-refund FAILED for order {}. Refund error: {}", order.getOrderNumber(), refundError);
            return markOrderForManualIntervention(order, transaction, enrollmentError, refundError);
        }
    }

    /**
     * Mark order for manual intervention when auto-refund fails.
     * This creates a clearly searchable state for support staff.
     */
    private CheckoutResultResponse markOrderForManualIntervention(Order order, Transaction transaction,
                                                                   String enrollmentError, String refundError) {
        log.error("MANUAL INTERVENTION REQUIRED: Order {} - Payment captured, enrollment failed, refund failed. " +
                        "Enrollment error: {}. Refund error: {}",
                order.getOrderNumber(), enrollmentError, refundError);

        TransactionTemplate txTemplate = new TransactionTemplate(transactionManager);
        final Long orderId = order.getId();

        Order failedOrder = txTemplate.execute(status -> {
            Order freshOrder = orderRepository.findById(orderId)
                    .orElseThrow(() -> new EntityNotFoundException("Order not found: " + orderId));

            // Only update if not already completed (could have been completed by webhook)
            if (freshOrder.getStatus() != OrderStatus.COMPLETED) {
                freshOrder.setStatus(OrderStatus.FAILED);
                // Use a searchable prefix so support can easily find these cases
                freshOrder.setFailureReason("MANUAL_REFUND_REQUIRED: Payment captured but enrollment failed. " +
                        "Enrollment error: " + enrollmentError + ". Refund error: " + refundError);
            }
            return orderRepository.save(freshOrder);
        });

        // Publish event for alerting/monitoring
        try {
            eventPublisher.publishEvent(new PaymentFailedEvent(this, failedOrder,
                    "CRITICAL: Manual refund required - " + enrollmentError));
        } catch (Exception e) {
            log.error("Failed to publish PaymentFailedEvent for order {}: {}", failedOrder.getOrderNumber(), e.getMessage());
        }

        return CheckoutResultResponse.builder()
                .success(false)
                .orderId(failedOrder.getId())
                .orderNumber(failedOrder.getOrderNumber())
                .transactionNumber(transaction.getTransactionNumber())
                .orderStatus(failedOrder.getStatus())
                .totalAmount(failedOrder.getTotalAmount())
                .currency(failedOrder.getCurrency())
                .paymentMethod(failedOrder.getPaymentMethod())
                .createdAt(failedOrder.getCreatedAt())
                .message("Payment was processed but there was a system error. Our support team has been notified and will process your refund within 24-48 hours. Please contact support with order number: " + failedOrder.getOrderNumber())
                .errorCode("ENROLLMENT_FAILED_MANUAL_REFUND")
                .errorMessage("Enrollment failed after payment. Manual refund required.")
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

    @Override
    @Transactional(readOnly = true)
    public CheckoutResultResponse getOrderStatus(Long userId, Long orderId) {
        log.debug("Checking order status for user: {}, order: {}", userId, orderId);

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));

        // Verify user owns the order
        if (!order.getUserId().equals(userId)) {
            throw new OrderNotFoundException(orderId);
        }

        List<OrderItem> orderItems = orderItemRepository.findByOrderId(order.getId());

        // Get the latest transaction for additional info
        Transaction latestTx = transactionRepository.findFirstByOrderIdOrderByCreatedAtDesc(order.getId())
                .orElse(null);

        CheckoutResultResponse.CheckoutResultResponseBuilder responseBuilder = CheckoutResultResponse.builder()
                .orderId(order.getId())
                .orderNumber(order.getOrderNumber())
                .orderStatus(order.getStatus())
                .totalAmount(order.getTotalAmount())
                .currency(order.getCurrency())
                .paymentMethod(order.getPaymentMethod())
                .createdAt(order.getCreatedAt())
                .completedAt(order.getCompletedAt());

        if (latestTx != null) {
            responseBuilder
                    .transactionNumber(latestTx.getTransactionNumber())
                    .gatewayTransactionId(latestTx.getGatewayTransactionId())
                    .localAmount(latestTx.getLocalAmount())
                    .localCurrency(latestTx.getLocalCurrency());

            if (latestTx.getRedirectUrl() != null) {
                responseBuilder
                        .redirectUrl(latestTx.getRedirectUrl())
                        .requiresRedirect(true);
            }
        }

        switch (order.getStatus()) {
            case COMPLETED -> {
                responseBuilder
                        .success(true)
                        .pending(false)
                        .enrolledCourseIds(orderItems.stream()
                                .map(OrderItem::getCourseId)
                                .collect(Collectors.toList()))
                        .message("Payment confirmed! You can now access your courses.");

                Invoice invoice = order.getInvoice();
                if (invoice != null) {
                    responseBuilder
                            .invoiceNumber(invoice.getInvoiceNumber())
                            .invoiceUrl(invoice.getPdfUrl());
                }
            }
            case PENDING, PROCESSING -> {
                responseBuilder
                        .success(false)
                        .pending(true)
                        .message("Waiting for payment confirmation. Please complete the payment.");
            }
            case FAILED -> {
                responseBuilder
                        .success(false)
                        .pending(false)
                        .message(order.getFailureReason() != null
                                ? order.getFailureReason()
                                : "Payment failed. Please try again.")
                        .errorCode("PAYMENT_FAILED")
                        .errorMessage(order.getFailureReason())
                        .canRetry(true);
            }
            case CANCELLED -> {
                responseBuilder
                        .success(false)
                        .pending(false)
                        .message("Order was cancelled.")
                        .errorCode("ORDER_CANCELLED")
                        .canRetry(false);
            }
            case REFUNDED -> {
                responseBuilder
                        .success(false)
                        .pending(false)
                        .message("Order was refunded.")
                        .errorCode("ORDER_REFUNDED")
                        .canRetry(false);
            }
        }

        return responseBuilder.build();
    }

    /**
     * Get the appropriate payment gateway based on the payment method.
     * Supports multiple gateways simultaneously.
     */
    private PaymentGateway getGatewayForPaymentMethod(PaymentMethod paymentMethod) {
        if (paymentMethod == null) {
            log.warn("Payment method is null, using default active gateway");
            return gatewayRegistry.getActiveGateway();
        }

        String gatewayName = switch (paymentMethod) {
            case PAYPAL -> "PAYPAL";
            case SEPAY -> "SEPAY";
            case MOCK -> "MOCK";
            case FREE -> "MOCK"; // Free orders don't need a real gateway
        };

        return gatewayRegistry.getGateway(gatewayName)
                .orElseGet(() -> {
                    log.warn("Gateway {} not available, falling back to active gateway", gatewayName);
                    return gatewayRegistry.getActiveGateway();
                });
    }

    /**
     * Generate invoice with a limited number of retry attempts.
     * Returns null if all attempts fail.
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
