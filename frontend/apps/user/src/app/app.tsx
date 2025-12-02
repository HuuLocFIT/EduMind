import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useToast, ToastContainer } from "@edumind/user-ui";
import { ProtectedRoute } from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import OAuth2CallbackPage from "./pages/OAuth2CallbackPage";
import { USER_ROUTES } from "@edumind/shared-utils";

function App() {
  const { toasts, closeToast } = useToast();

  return (
    <BrowserRouter>
      <ToastContainer toasts={toasts} onClose={closeToast} />

      <Routes>
        {/* Public routes */}
        <Route path={USER_ROUTES.ROOT} element={<Navigate to={USER_ROUTES.LOGIN} replace />} />
        <Route path={USER_ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={USER_ROUTES.SIGNUP} element={<SignupPage />} />
        <Route path={USER_ROUTES.OAUTH2_REDIRECT} element={<OAuth2CallbackPage />} />

        {/* Protected routes */}
        <Route
          path={USER_ROUTES.DASHBOARD}
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to={USER_ROUTES.LOGIN} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
