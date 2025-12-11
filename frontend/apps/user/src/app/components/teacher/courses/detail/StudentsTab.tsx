import React, { useEffect, useState } from "react";
import { teacherCourseService } from "../../../../services/teacher-course.service";
import type { EnrollmentResponse } from "@edumind/shared-types";
import { Skeleton, ProgressBar } from "@edumind/user-ui";
import { Users } from "lucide-react";

interface StudentsTabProps {
  courseId: number;
}

export const StudentsTab: React.FC<StudentsTabProps> = ({ courseId }) => {
  const [students, setStudents] = useState<EnrollmentResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    teacherCourseService
      .getCourseStudents(courseId, { page: 0, size: 20 })
      .then((res) => setStudents(res.data || []))
      .finally(() => setLoading(false));
  }, [courseId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-lg border">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-12 text-center">
        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No students yet
        </h3>
        <p className="text-gray-600">
          Students will appear here once they enroll
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {students.map((enrollment) => (
        <div
          key={enrollment.id}
          className="flex items-center gap-4 p-4 bg-white rounded-lg border"
        >
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <Users className="w-5 h-5 text-gray-500" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900">
              Student #{enrollment.studentId}
            </p>
            <p className="text-sm text-gray-500">
              Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <p className="font-medium text-gray-900">
              {enrollment.progressPercentage ?? 0}%
            </p>
            <ProgressBar
              progress={enrollment.progressPercentage ?? 0}
              size="sm"
              className="w-24"
            />
          </div>
        </div>
      ))}
    </div>
  );
};

