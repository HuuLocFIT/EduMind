import { useState } from "react";
import { teacherCourseService } from '../../../../services/teacher-course.service';
import { useToast } from "@edumind/user-ui";
import type { EnrollmentResponse } from "@edumind/shared-types";
import { isPaidCourse } from "../utils/students.utils";

interface UseEnrollmentActionsProps {
  onRefresh: () => Promise<void>;
}

export const useEnrollmentActions = ({
  onRefresh,
}: UseEnrollmentActionsProps) => {
  const { success: showSuccess, error: showError } = useToast();
  const [updatingEnrollmentId, setUpdatingEnrollmentId] = useState<
    number | null
  >(null);

  // Modal state for suspend
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [enrollmentToSuspend, setEnrollmentToSuspend] =
    useState<EnrollmentResponse | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendReasonError, setSuspendReasonError] = useState("");

  // Modal state for report to admin
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [enrollmentToReport, setEnrollmentToReport] =
    useState<EnrollmentResponse | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportReasonError, setReportReasonError] = useState("");

  // Modal state for unenroll confirmation
  const [unenrollModalOpen, setUnenrollModalOpen] = useState(false);
  const [enrollmentToUnenroll, setEnrollmentToUnenroll] =
    useState<EnrollmentResponse | null>(null);

  const handleSuspendClick = (enrollment: EnrollmentResponse) => {
    setEnrollmentToSuspend(enrollment);
    setSuspendReason("");
    setSuspendReasonError("");
    setSuspendModalOpen(true);
  };

  const handleSuspendConfirm = async () => {
    if (!enrollmentToSuspend) return;

    const trimmedReason = suspendReason.trim();
    if (!trimmedReason) {
      setSuspendReasonError("Reason is required");
      return;
    }

    if (trimmedReason.length > 500) {
      setSuspendReasonError("Reason must not exceed 500 characters");
      return;
    }

    try {
      setUpdatingEnrollmentId(enrollmentToSuspend.id);
      await teacherCourseService.suspendEnrollment(
        enrollmentToSuspend.id,
        trimmedReason
      );
      await onRefresh();
      showSuccess("Enrollment suspended successfully");
      setSuspendModalOpen(false);
      setEnrollmentToSuspend(null);
      setSuspendReason("");
      setSuspendReasonError("");
    } catch (err: any) {
      console.error("Failed to suspend enrollment", err);
      showError(err.message || "Failed to suspend enrollment");
    } finally {
      setUpdatingEnrollmentId(null);
    }
  };

  const handleActivate = async (enrollment: EnrollmentResponse) => {
    try {
      setUpdatingEnrollmentId(enrollment.id);
      await teacherCourseService.activateEnrollment(enrollment.id);
      await onRefresh();
      showSuccess("Enrollment activated");
    } catch (err: any) {
      console.error("Failed to activate enrollment", err);
      showError(err.message || "Failed to activate enrollment");
    } finally {
      setUpdatingEnrollmentId(null);
    }
  };

  const handleReportToAdminClick = (enrollment: EnrollmentResponse) => {
    setEnrollmentToReport(enrollment);
    setReportReason("");
    setReportReasonError("");
    setReportModalOpen(true);
  };

  const handleReportToAdminConfirm = async () => {
    if (!enrollmentToReport) return;

    const trimmedReason = reportReason.trim();
    if (!trimmedReason) {
      setReportReasonError("Reason is required");
      return;
    }

    if (trimmedReason.length > 500) {
      setReportReasonError("Reason must not exceed 500 characters");
      return;
    }

    try {
      setUpdatingEnrollmentId(enrollmentToReport.id);
      await teacherCourseService.reportToAdmin(
        enrollmentToReport.id,
        trimmedReason
      );
      await onRefresh();
      showSuccess(
        "Report submitted successfully. Admin will review your request."
      );
      setReportModalOpen(false);
      setEnrollmentToReport(null);
      setReportReason("");
      setReportReasonError("");
    } catch (err: any) {
      console.error("Failed to submit report", err);
      showError(err.message || "Failed to submit report");
    } finally {
      setUpdatingEnrollmentId(null);
    }
  };

  const handleUnenrollClick = (enrollment: EnrollmentResponse) => {
    if (isPaidCourse(enrollment)) {
      // For paid courses, open report to admin modal
      handleReportToAdminClick(enrollment);
    } else {
      // For free courses, open confirmation modal
      setEnrollmentToUnenroll(enrollment);
      setUnenrollModalOpen(true);
    }
  };

  const handleUnenrollConfirm = async () => {
    if (!enrollmentToUnenroll) return;

    try {
      setUpdatingEnrollmentId(enrollmentToUnenroll.id);
      await teacherCourseService.unenrollStudent(enrollmentToUnenroll.id);
      await onRefresh();
      showSuccess("Student unenrolled");
      setUnenrollModalOpen(false);
      setEnrollmentToUnenroll(null);
    } catch (err: any) {
      console.error("Failed to unenroll student", err);
      showError(err.message || "Failed to unenroll student");
    } finally {
      setUpdatingEnrollmentId(null);
    }
  };

  return {
    updatingEnrollmentId,
    // Suspend modal
    suspendModalOpen,
    enrollmentToSuspend,
    suspendReason,
    suspendReasonError,
    setSuspendReason,
    handleSuspendClick,
    handleSuspendConfirm,
    closeSuspendModal: () => {
      setSuspendModalOpen(false);
      setEnrollmentToSuspend(null);
      setSuspendReason("");
      setSuspendReasonError("");
    },
    // Report modal
    reportModalOpen,
    enrollmentToReport,
    reportReason,
    reportReasonError,
    setReportReason,
    handleReportToAdminClick,
    handleReportToAdminConfirm,
    closeReportModal: () => {
      setReportModalOpen(false);
      setEnrollmentToReport(null);
      setReportReason("");
      setReportReasonError("");
    },
    // Unenroll modal
    unenrollModalOpen,
    enrollmentToUnenroll,
    handleUnenrollConfirm,
    closeUnenrollModal: () => {
      setUnenrollModalOpen(false);
      setEnrollmentToUnenroll(null);
    },
    // Actions
    handleActivate,
    handleUnenrollClick,
  };
};

