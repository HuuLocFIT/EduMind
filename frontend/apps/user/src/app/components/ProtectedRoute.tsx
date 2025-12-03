import { Navigate, Outlet, useLocation } from "react-router-dom";
import AuthService from "@user/services/auth.service.js";
import { USER_ROUTES } from "@edumind/shared-utils";

export const ProtectedRoute: React.FC = () => {
  const location = useLocation();
  const isAuthenticated = AuthService.isAuthenticated();

  if (!isAuthenticated) {
    // Redirect to login but save the attempted location
    return (
      <Navigate to={USER_ROUTES.LOGIN} state={{ from: location }} replace />
    );
  }

  return <Outlet />;
};
