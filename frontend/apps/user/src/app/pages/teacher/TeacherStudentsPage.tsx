import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/auth.store";
import { TEACHER_ROUTES } from "@edumind/shared-utils";
import { Alert, Button, Skeleton, useToast } from "@edumind/user-ui";
import { ArrowLeft, BookOpen, Download } from "lucide-react";
import { StudentsStats } from "./students/components/StudentsStats";
import { StudentsFilters } from "./students/components/StudentsFilters";
import { StudentsTable } from "./students/components/StudentsTable";
import { SuspendModal } from "./students/components/SuspendModal";
import { ReportToAdminModal } from "./students/components/ReportToAdminModal";
import { UnenrollConfirmModal } from "./students/components/UnenrollConfirmModal";
import { InfoNote } from "./students/components/InfoNote";
import { useCourseStudents } from "./students/hooks/useCourseStudents";
import { useStudentsFilters } from "./students/hooks/useStudentsFilters";
import { useEnrollmentActions } from "./students/hooks/useEnrollmentActions";
import { exportStudentsToCsv } from "./students/utils/students.utils";

export const TeacherStudentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { success: showSuccess, error: showError } = useToast();

  const {
    courses,
    coursesLoading,
    enrollments,
    pagination,
    loadingStudents,
    error,
    setError,
    refreshStudents,
  } = useCourseStudents({
    userId: user?.id,
  });

  const { filters, filteredAndSorted, stats, updateFilters } =
    useStudentsFilters(enrollments);

  const {
    updatingEnrollmentId,
    suspendModalOpen,
    enrollmentToSuspend,
    suspendReason,
    suspendReasonError,
    setSuspendReason,
    handleSuspendClick,
    handleSuspendConfirm,
    closeSuspendModal,
    reportModalOpen,
    enrollmentToReport,
    reportReason,
    reportReasonError,
    setReportReason,
    handleReportToAdminClick,
    handleReportToAdminConfirm,
    closeReportModal,
    unenrollModalOpen,
    enrollmentToUnenroll,
    handleUnenrollConfirm,
    closeUnenrollModal,
    handleActivate,
    handleUnenrollClick,
  } = useEnrollmentActions({
    onRefresh: refreshStudents,
  });

  const selectedCourse = courses.find((c) => c.id === filters.courseId);

  const handleCourseChange = (courseId: string) => {
    updateFilters({ courseId: courseId || "" });
  };

  const handleStatusChange = (status: string) => {
    updateFilters({ status });
  };

  const handleSearchSubmit = (search: string) => {
    updateFilters({ search });
  };

  const handleClearFilters = () => {
    updateFilters({ courseId: "", status: "", search: "" });
  };

  const handleSortChange = (key: typeof filters.sortBy) => {
    const nextOrder =
      filters.sortBy === key && filters.sortOrder === "desc" ? "asc" : "desc";
    updateFilters({ sortBy: key, sortOrder: nextOrder });
  };

  const handlePageChange = (page: number) => {
    updateFilters({ page: String(page) });
  };

  const handleExportCsv = () => {
    if (!filteredAndSorted.length) {
      showError("No students to export");
      return;
    }

    exportStudentsToCsv(filteredAndSorted, filters.courseId);
    showSuccess("Students exported successfully");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Course Students</h1>
          <p className="text-gray-500 mt-1">
            View and track students enrolled in your courses
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          leftIcon={<Download className="w-4 h-4" />}
          onClick={handleExportCsv}
          disabled={!filteredAndSorted.length}
        >
          Export CSV
        </Button>
      </div>

      {error && (
        <Alert
          variant="error"
          title="Error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StudentsStats
          stats={stats}
          loading={loadingStudents || coursesLoading}
        />
      </div>

      {/* Filters */}
      <StudentsFilters
        courses={courses}
        coursesLoading={coursesLoading}
        filters={filters}
        selectedCourse={selectedCourse}
        onCourseChange={handleCourseChange}
        onStatusChange={handleStatusChange}
        onSearchSubmit={handleSearchSubmit}
        onClearFilters={handleClearFilters}
      />

      {/* Table */}
      {!filters.courseId ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Select a course
          </h3>
          <p className="text-gray-600">
            Choose a course to view its enrolled students.
          </p>
        </div>
      ) : loadingStudents ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
          {[...Array(5)].map((_, idx) => (
            <Skeleton key={idx} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          <StudentsTable
            enrollments={filteredAndSorted}
            pagination={pagination}
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
            updatingEnrollmentId={updatingEnrollmentId}
            onSortChange={handleSortChange}
            onSuspendClick={handleSuspendClick}
            onActivate={handleActivate}
            onUnenrollClick={handleUnenrollClick}
            onPageChange={handlePageChange}
          />

          {/* Info Note */}
          <InfoNote show={!!filters.courseId && filteredAndSorted.length > 0} />
        </>
      )}

      {/* Suspend Modal */}
      <SuspendModal
        open={suspendModalOpen}
        enrollment={enrollmentToSuspend}
        reason={suspendReason}
        reasonError={suspendReasonError}
        isLoading={updatingEnrollmentId === enrollmentToSuspend?.id}
        onReasonChange={setSuspendReason}
        onConfirm={handleSuspendConfirm}
        onClose={closeSuspendModal}
      />

      {/* Report to Admin Modal */}
      <ReportToAdminModal
        open={reportModalOpen}
        enrollment={enrollmentToReport}
        reason={reportReason}
        reasonError={reportReasonError}
        isLoading={updatingEnrollmentId === enrollmentToReport?.id}
        onReasonChange={setReportReason}
        onConfirm={handleReportToAdminConfirm}
        onClose={closeReportModal}
      />

      {/* Unenroll Confirm Modal */}
      <UnenrollConfirmModal
        open={unenrollModalOpen}
        enrollment={enrollmentToUnenroll}
        isLoading={updatingEnrollmentId === enrollmentToUnenroll?.id}
        onConfirm={handleUnenrollConfirm}
        onClose={closeUnenrollModal}
      />
    </div>
  );
};

export default TeacherStudentsPage;
