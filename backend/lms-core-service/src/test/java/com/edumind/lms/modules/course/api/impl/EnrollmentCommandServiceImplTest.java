package com.edumind.lms.modules.course.api.impl;

import com.edumind.lms.modules.course.exception.AlreadyEnrolledException;
import com.edumind.lms.modules.course.service.EnrollmentService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("EnrollmentCommandServiceImpl Unit Tests")
class EnrollmentCommandServiceImplTest {

    @Mock
    private EnrollmentService enrollmentService;

    @InjectMocks
    private EnrollmentCommandServiceImpl enrollmentCommandService;

    private final Long courseId = 1L;
    private final Long studentId = 10L;

    @Nested
    @DisplayName("enrollStudent()")
    class EnrollStudentTests {

        @Test
        @DisplayName("Should delegate to EnrollmentService for new enrollment")
        void enrollStudent_NoExisting_DelegatesToService() {
            enrollmentCommandService.enrollStudent(courseId, studentId);

            verify(enrollmentService).enrollStudent(courseId, studentId);
        }

        @Test
        @DisplayName("Should silently skip when AlreadyEnrolledException is thrown (idempotent)")
        void enrollStudent_AlreadyActive_CatchesAndSkips() {
            doThrow(new AlreadyEnrolledException(courseId, studentId))
                    .when(enrollmentService).enrollStudent(courseId, studentId);

            // Should NOT throw — ACL catches AlreadyEnrolledException as idempotency guard
            enrollmentCommandService.enrollStudent(courseId, studentId);

            verify(enrollmentService).enrollStudent(courseId, studentId);
        }

        @Test
        @DisplayName("Should propagate unexpected exceptions")
        void enrollStudent_UnexpectedError_Propagates() {
            doThrow(new RuntimeException("DB connection lost"))
                    .when(enrollmentService).enrollStudent(courseId, studentId);

            // Unexpected errors should NOT be silently swallowed
            org.junit.jupiter.api.Assertions.assertThrows(RuntimeException.class, () ->
                    enrollmentCommandService.enrollStudent(courseId, studentId));
        }
    }

    @Nested
    @DisplayName("revokeEnrollment()")
    class RevokeEnrollmentTests {

        @Test
        @DisplayName("Should delegate to EnrollmentService.dropStudent()")
        void revokeEnrollment_DelegatesToDropStudent() {
            enrollmentCommandService.revokeEnrollment(courseId, studentId);

            verify(enrollmentService).dropStudent(courseId, studentId);
        }

        @Test
        @DisplayName("Should propagate exceptions from dropStudent()")
        void revokeEnrollment_ServiceThrows_Propagates() {
            doThrow(new RuntimeException("not found"))
                    .when(enrollmentService).dropStudent(courseId, studentId);

            org.junit.jupiter.api.Assertions.assertThrows(RuntimeException.class, () ->
                    enrollmentCommandService.revokeEnrollment(courseId, studentId));
        }
    }
}
