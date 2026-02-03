package com.edumind.lms.modules.payment;

import com.edumind.lms.modules.course.entity.Category;
import com.edumind.lms.modules.course.entity.Course;
import com.edumind.lms.modules.course.enums.CourseStatus;
import com.edumind.lms.modules.payment.entity.*;
import com.edumind.lms.modules.payment.enums.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Test helper class providing factory methods for creating mock payment entities.
 * Use these methods to avoid code duplication across payment module tests.
 */
public final class PaymentTestHelper {

    private PaymentTestHelper() {
        // Utility class, prevent instantiation
    }

    // ===== TEST CONSTANTS =====
    public static final Long NON_EXISTENT_USER_ID = 999999L;
    public static final Long NON_EXISTENT_CART_ID = 999999L;
    public static final Long NON_EXISTENT_COURSE_ID = 999999L;
    public static final Long NON_EXISTENT_ORDER_ID = 999999L;

    // ===== COURSE HELPERS =====

    /**
     * Creates a published Course with standard pricing.
     */
    public static Course createCourse(Long id, String title, BigDecimal price) {
        return Course.builder()
                .title(title)
                .slug(title.toLowerCase().replace(" ", "-") + "-" + id)
                .description("Test course description")
                .price(price)
                .currency("USD")
                .instructorId(100L)
                .instructorName("Test Instructor")
                .status(CourseStatus.PUBLISHED)
                .publishedAt(LocalDateTime.now())
                .thumbnailUrl("https://example.com/thumbnail.jpg")
                .build();
    }

    public static Course createFreeCourse(Long id, String title) {
        return createCourse(id, title, BigDecimal.ZERO);
    }

    public static Course createPaidCourse(Long id, String title) {
        return createCourse(id, title, new BigDecimal("99.99"));
    }

    public static Course createDiscountedCourse(Long id, String title, BigDecimal originalPrice, BigDecimal discountPrice) {
        Course course = createCourse(id, title, originalPrice);
        course.setDiscountPrice(discountPrice);
        return course;
    }

    // ===== CATEGORY HELPER =====

    public static Category createCategory(Long id, String name) {
        return Category.builder()
                .name(name)
                .slug(name.toLowerCase().replace(" ", "-"))
                .build();
    }

    // ===== CART HELPERS =====

    /**
     * Creates an empty Cart for a given user.
     */
    public static Cart createCart(Long userId) {
        return Cart.builder()
                .userId(userId)
                .build();
    }

    /**
     * Creates a CartItem for a given course.
     */
    public static CartItem createCartItem(Long courseId, BigDecimal price) {
        return CartItem.builder()
                .courseId(courseId)
                .priceSnapshot(price)
                .currency("USD")
                .addedAt(LocalDateTime.now())
                .build();
    }

    // ===== ORDER HELPERS =====

    /**
     * Creates a pending Order.
     */
    public static Order createOrder(Long userId, String orderNumber, BigDecimal totalAmount) {
        return Order.builder()
                .orderNumber(orderNumber)
                .userId(userId)
                .subtotal(totalAmount)
                .discountTotal(BigDecimal.ZERO)
                .totalAmount(totalAmount)
                .currency("USD")
                .status(OrderStatus.PENDING)
                .customerEmail("test@example.com")
                .customerName("Test User")
                .build();
    }

    public static Order createCompletedOrder(Long userId, String orderNumber, BigDecimal totalAmount) {
        Order order = createOrder(userId, orderNumber, totalAmount);
        order.setStatus(OrderStatus.COMPLETED);
        order.setCompletedAt(LocalDateTime.now());
        return order;
    }

    public static Order createFreeOrder(Long userId, String orderNumber) {
        Order order = createOrder(userId, orderNumber, BigDecimal.ZERO);
        order.setPaymentMethod(PaymentMethod.FREE);
        return order;
    }

    /**
     * Creates an OrderItem for an Order.
     */
    public static OrderItem createOrderItem(Long courseId, Long instructorId, BigDecimal originalPrice, BigDecimal finalPrice) {
        return OrderItem.builder()
                .courseId(courseId)
                .instructorId(instructorId)
                .instructorName("Test Instructor")
                .courseTitle("Test Course " + courseId)
                .courseSlug("test-course-" + courseId)
                .courseThumbnailUrl("https://example.com/thumb.jpg")
                .originalPrice(originalPrice)
                .discountAmount(originalPrice.subtract(finalPrice))
                .finalPrice(finalPrice)
                .currency("USD")
                .build();
    }

    public static OrderItem createOrderItemFromCourse(Course course) {
        return createOrderItem(
                course.getId(),
                course.getInstructorId(),
                course.getOriginalPrice(),
                course.getEffectivePrice()
        );
    }

    // ===== TRANSACTION HELPERS =====

    /**
     * Creates a pending Transaction.
     */
    public static Transaction createTransaction(Order order, String transactionNumber, BigDecimal amount) {
        return Transaction.builder()
                .order(order)
                .transactionNumber(transactionNumber)
                .gateway(PaymentMethod.MOCK)
                .amount(amount)
                .currency("USD")
                .status(TransactionStatus.PENDING)
                .build();
    }

    public static Transaction createSuccessfulTransaction(Order order, String transactionNumber, BigDecimal amount) {
        Transaction txn = createTransaction(order, transactionNumber, amount);
        txn.setStatus(TransactionStatus.SUCCESS);
        txn.setGatewayTransactionId(generateGatewayTransactionId());
        txn.setProcessedAt(LocalDateTime.now());
        return txn;
    }

    public static Transaction createFailedTransaction(Order order, String transactionNumber, BigDecimal amount, String reason) {
        Transaction txn = createTransaction(order, transactionNumber, amount);
        txn.setStatus(TransactionStatus.FAILED);
        txn.setFailureReason(reason);
        txn.setFailureCode("CARD_DECLINED");
        return txn;
    }

    // ===== INVOICE HELPERS =====

    /**
     * Creates an Invoice for an Order.
     */
    public static Invoice createInvoice(Order order, String invoiceNumber) {
        return Invoice.builder()
                .invoiceNumber(invoiceNumber)
                .order(order)
                .userId(order.getUserId())
                .buyerName(order.getCustomerName() != null ? order.getCustomerName() : "Test User")
                .buyerEmail(order.getCustomerEmail() != null ? order.getCustomerEmail() : "test@example.com")
                .subtotal(order.getSubtotal())
                .discountTotal(order.getDiscountTotal())
                .taxAmount(BigDecimal.ZERO)
                .taxRate(BigDecimal.ZERO)
                .totalAmount(order.getTotalAmount())
                .currency(order.getCurrency())
                .status(InvoiceStatus.GENERATED)
                .issuedAt(LocalDateTime.now())
                .build();
    }

    // ===== INSTRUCTOR EARNING HELPERS =====

    public static InstructorEarning createInstructorEarning(OrderItem orderItem, Order order, Long instructorId, BigDecimal grossAmount) {
        BigDecimal platformFeePercent = new BigDecimal("30.00"); // 30%
        BigDecimal platformFeeAmount = grossAmount.multiply(platformFeePercent).divide(new BigDecimal("100"), 2, java.math.RoundingMode.HALF_UP);
        BigDecimal netAmount = grossAmount.subtract(platformFeeAmount);

        return InstructorEarning.builder()
                .orderItem(orderItem)
                .order(order)
                .instructorId(instructorId)
                .courseId(orderItem.getCourseId())
                .grossAmount(grossAmount)
                .platformFeePercent(platformFeePercent)
                .platformFeeAmount(platformFeeAmount)
                .netAmount(netAmount)
                .currency("USD")
                .status(EarningStatus.PENDING)
                .build();
    }

    // ===== PAYMENT REQUEST HELPERS =====

    /**
     * Creates test card number that always succeeds in MockPaymentGateway.
     */
    public static String getSuccessCardNumber() {
        return "4111111111110000"; // Ends with 0000 -> Success
    }

    public static String getDeclinedCardNumber() {
        return "4111111111111111"; // Ends with 1111 -> Declined
    }

    public static String getInsufficientFundsCardNumber() {
        return "4111111111112222"; // Ends with 2222 -> Insufficient funds
    }

    public static String getPendingCardNumber() {
        return "4111111111113333"; // Ends with 3333 -> Pending
    }

    public static String getExpiredCardNumber() {
        return "4111111111115555"; // Ends with 5555 -> Expired
    }

    // ===== ID GENERATORS =====

    private static long orderCounter = 1;
    private static long transactionCounter = 1;
    private static long invoiceCounter = 1;
    private static long gatewayTransactionIdCounter = 1;

    public static String generateOrderNumber() {
        return String.format("ORD-TEST-%06d", orderCounter++);
    }

    public static String generateTransactionNumber() {
        return String.format("TXN-TEST-%06d", transactionCounter++);
    }

    public static String generateInvoiceNumber() {
        return String.format("INV-TEST-%06d", invoiceCounter++);
    }

    public static String generateGatewayTransactionId() {
        return String.format("MOCK_%d_%d", System.currentTimeMillis(), gatewayTransactionIdCounter++);
    }

    public static void resetCounters() {
        orderCounter = 1;
        transactionCounter = 1;
        invoiceCounter = 1;
        gatewayTransactionIdCounter = 1;
    }
}
