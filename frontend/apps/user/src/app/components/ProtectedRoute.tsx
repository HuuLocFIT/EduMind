import { Navigate, Outlet, useLocation } from "react-router-dom";
import { authService } from "@user/services/index";
import { USER_ROUTES } from "@edumind/shared-utils";

export const ProtectedRoute: React.FC = () => {
  const location = useLocation();
  const isAuthenticated = authService.isAuthenticated();

  if (!isAuthenticated) {
    // Redirect to login but save the attempted location
    return (
      <Navigate to={USER_ROUTES.LOGIN} state={{ from: location }} replace />
    );
  }

  return <Outlet />;
};
