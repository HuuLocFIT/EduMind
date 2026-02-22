package com.edumind.lms.modules.course.event.listener;

import com.edumind.lms.modules.course.api.EnrollmentCommandService;
import com.edumind.lms.modules.payment.event.OrderCompletedEvent;
import com.edumind.lms.modules.payment.event.RefundCompletedEvent;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CourseEventListener Unit Tests")
class CourseEventListenerTest {

    @Mock
    private EnrollmentCommandService enrollmentCommandService;

    @InjectMocks
    private CourseEventListener listener;

    @Nested
    @DisplayName("handleEnrollmentCreation()")
    class HandleEnrollmentCreationTests {

        @Test
        @DisplayName("Should enroll all students when order is completed")
        void handleEnrollmentCreation_ValidItems_EnrollsAll() {
            List<OrderCompletedEvent.OrderItemInfo> items = List.of(
                    new OrderCompletedEvent.OrderItemInfo(1L, "Course A", 100L, BigDecimal.TEN),
                    new OrderCompletedEvent.OrderItemInfo(2L, "Course B", 101L, BigDecimal.TEN)
            );
            OrderCompletedEvent event = new OrderCompletedEvent(this, 10L, "ORD-001", 5L, items,
                    BigDecimal.TEN, "USD", false);

            listener.handleEnrollmentCreation(event);

            verify(enrollmentCommandService).enrollStudent(1L, 5L);
            verify(enrollmentCommandService).enrollStudent(2L, 5L);
        }

        @Test
        @DisplayName("Should continue enrolling remaining courses when one fails")
        void handleEnrollmentCreation_OneItemFails_ContinuesRest() {
            List<OrderCompletedEvent.OrderItemInfo> items = List.of(
                    new OrderCompletedEvent.OrderItemInfo(1L, "Course A", 100L, BigDecimal.TEN),
                    new OrderCompletedEvent.OrderItemInfo(2L, "Course B", 101L, BigDecimal.TEN)
            );
            OrderCompletedEvent event = new OrderCompletedEvent(this, 10L, "ORD-001", 5L, items,
                    BigDecimal.TEN, "USD", false);

            doThrow(new RuntimeException("already enrolled"))
                    .when(enrollmentCommandService).enrollStudent(1L, 5L);

            listener.handleEnrollmentCreation(event);

            // First fails, second should still be attempted
            verify(enrollmentCommandService).enrollStudent(1L, 5L);
            verify(enrollmentCommandService).enrollStudent(2L, 5L);
        }

        @Test
        @DisplayName("Should skip when event has no items")
        void handleEnrollmentCreation_NoItems_SkipsAll() {
            OrderCompletedEvent event = new OrderCompletedEvent(this, 10L, "ORD-001", 5L, List.of(),
                    BigDecimal.TEN, "USD", false);

            listener.handleEnrollmentCreation(event);

            verifyNoInteractions(enrollmentCommandService);
        }

        @Test
        @DisplayName("Should skip when items list is null")
        void handleEnrollmentCreation_NullItems_SkipsAll() {
            OrderCompletedEvent event = new OrderCompletedEvent(this, 10L, "ORD-001", 5L, null,
                    BigDecimal.TEN, "USD", false);

            listener.handleEnrollmentCreation(event);

            verifyNoInteractions(enrollmentCommandService);
        }
    }

    @Nested
    @DisplayName("handleRefundEnrollmentRevocation()")
    class HandleRefundEnrollmentRevocationTests {

        @Test
        @DisplayName("Should revoke all enrollments on full refund")
        void handleRefundEnrollmentRevocation_FullRefund_RevokesAll() {
            RefundCompletedEvent event = new RefundCompletedEvent(this, 10L, "ORD-001", 5L,
                    List.of(1L, 2L), new BigDecimal("100.00"), true);

            listener.handleRefundEnrollmentRevocation(event);

            verify(enrollmentCommandService).revokeEnrollment(1L, 5L);
            verify(enrollmentCommandService).revokeEnrollment(2L, 5L);
        }

        @Test
        @DisplayName("Should skip revocation on partial refund")
        void handleRefundEnrollmentRevocation_PartialRefund_SkipsRevocation() {
            RefundCompletedEvent event = new RefundCompletedEvent(this, 10L, "ORD-001", 5L,
                    List.of(1L, 2L), new BigDecimal("40.00"), false);

            listener.handleRefundEnrollmentRevocation(event);

            verifyNoInteractions(enrollmentCommandService);
        }

        @Test
        @DisplayName("Should continue revoking remaining courses when one fails")
        void handleRefundEnrollmentRevocation_OneCourseFails_ContinuesRest() {
            RefundCompletedEvent event = new RefundCompletedEvent(this, 10L, "ORD-001", 5L,
                    List.of(1L, 2L), new BigDecimal("100.00"), true);

            doThrow(new RuntimeException("not found"))
                    .when(enrollmentCommandService).revokeEnrollment(1L, 5L);

            listener.handleRefundEnrollmentRevocation(event);

            verify(enrollmentCommandService).revokeEnrollment(1L, 5L);
            verify(enrollmentCommandService).revokeEnrollment(2L, 5L);
        }

        @Test
        @DisplayName("Should skip when courseIds list is empty")
        void handleRefundEnrollmentRevocation_EmptyCourseIds_SkipsAll() {
            RefundCompletedEvent event = new RefundCompletedEvent(this, 10L, "ORD-001", 5L,
                    List.of(), new BigDecimal("100.00"), true);

            listener.handleRefundEnrollmentRevocation(event);

            verifyNoInteractions(enrollmentCommandService);
        }
    }
}
