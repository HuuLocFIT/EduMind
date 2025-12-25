import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { USER_ROUTES } from "@edumind/shared-utils";
import { UserRole } from "@edumind/shared-constants";
import { teacherApplicationService } from '../services/teacher-application.service';
import { useAuthStore } from "../stores/auth.store";

type CheckState = "checking" | "has-application" | "no-application";

const CheckingBlock = ({ label }: { label: string }) => (
  <div className="min-h-[200px] flex items-center justify-center text-sm text-gray-600">
    {label}
  </div>
);

export const TeacherApplicationRoute = () => {
  const { user } = useAuthStore();
  const [state, setState] = useState<CheckState>("checking");

  useEffect(() => {
    let isMounted = true;
    teacherApplicationService
      .getMyApplication()
      .then((application) => {
        if (!isMounted) return;
        setState(application ? "has-application" : "no-application");
      })
      .catch(() => {
        if (!isMounted) return;
        setState("no-application");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const isStudent = user?.roles?.includes(UserRole.STUDENT);

  if (!isStudent) {
    return <Navigate to={USER_ROUTES.ROOT} replace />;
  }

  if (state === "checking") {
    return <CheckingBlock label="Checking your application..." />;
  }

  if (state === "has-application") {
    return <Navigate to={USER_ROUTES.TEACHER_APPLICATION_STATUS} replace />;
  }

  return <Outlet />;
};

export const TeacherApplicationStatusRoute = () => {
  const [state, setState] = useState<CheckState>("checking");

  useEffect(() => {
    let isMounted = true;
    teacherApplicationService
      .getMyApplication()
      .then((application) => {
        if (!isMounted) return;
        setState(application ? "has-application" : "no-application");
      })
      .catch(() => {
        if (!isMounted) return;
        setState("no-application");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (state === "checking") {
    return <CheckingBlock label="Loading status..." />;
  }

  if (state === "no-application") {
    return <Navigate to={USER_ROUTES.TEACHER_APPLICATION} replace />;
  }

  return <Outlet />;
};

