import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useToast, ToastContainer } from "@edumind/user-ui";
import { ProtectedRoute } from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import OAuth2CallbackPage from "./pages/OAuth2CallbackPage";

function App() {
  const { toasts, closeToast } = useToast();

  return (
    <BrowserRouter>
      <ToastContainer toasts={toasts} onClose={closeToast} />

      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/oauth2/redirect" element={<OAuth2CallbackPage />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
