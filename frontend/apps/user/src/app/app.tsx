import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useToast, ToastContainer } from "@edumind/user-ui";
import { ProtectedRoute } from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import OAuth2CallbackPage from "./pages/OAuth2CallbackPage";
import { USER_ROUTES } from "@edumind/shared-utils";
import { BrowseCoursesPage } from "./pages/BrowseCoursesPage";
import { CourseDetailPage } from "./pages/CourseDetailPage";
import { MyLearningPage } from "./pages/MyLearningPage";
import { MainLayout } from "./layouts/MainLayout";
import { AuthLayout } from "./layouts/AuthLayout";
import { HomePage } from "./pages/HomePage";
import { CertificatesPage } from "./pages/CertificatesPage";
import { ProfileSettingsPage } from "./pages/ProfileSettingsPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { WishlistPage } from "./pages/WishlistPage";
import { CoursePlayerPage } from "./pages/CoursePlayerPage";
import { TeacherApplicationPage } from "./pages/TeacherApplicationPage";
import { ApplicationStatusPage } from "./pages/ApplicationStatusPage";
import { TeacherApplicationRoute, TeacherApplicationStatusRoute } from "./components/TeacherApplicationGuards";

function App() {
  const { toasts, closeToast } = useToast();

  return (
    <BrowserRouter>
      <ToastContainer toasts={toasts} onClose={closeToast} />

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<MainLayout />}>
          <Route path={USER_ROUTES.ROOT} element={<HomePage />} />
          <Route path={USER_ROUTES.COURSES.replace('/', '')} element={<BrowseCoursesPage />} />
          <Route path={USER_ROUTES.COURSE_DETAIL.replace('/', '')} element={<CourseDetailPage />} />
        </Route>
        {/* <Route path={USER_ROUTES.ROOT} element={<Navigate to={USER_ROUTES.LOGIN} replace />} /> */}

        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path={USER_ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={USER_ROUTES.SIGNUP} element={<SignupPage />} />
          <Route path={USER_ROUTES.OAUTH2_REDIRECT} element={<OAuth2CallbackPage />} />
        </Route>

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<MainLayout />}>
            <Route path={USER_ROUTES.DASHBOARD} element={<DashboardPage />} />
            <Route path={USER_ROUTES.LEARNING} element={<MyLearningPage />} />
            <Route path={USER_ROUTES.LEARNING_COURSE.replace('/', '')} element={<CoursePlayerPage />} />
            
            <Route path={USER_ROUTES.CERTIFICATES} element={<CertificatesPage />} />
            <Route path={USER_ROUTES.PROFILE_SETTINGS} element={<ProfileSettingsPage />} />
            <Route path={USER_ROUTES.WISHLIST} element={<WishlistPage />} />

            <Route element={<TeacherApplicationStatusRoute />}>
              <Route path={USER_ROUTES.TEACHER_APPLICATION_STATUS} element={<ApplicationStatusPage />} />
            </Route>
            <Route element={<TeacherApplicationRoute />}>
              <Route path={USER_ROUTES.TEACHER_APPLICATION} element={<TeacherApplicationPage />} />
            </Route>
          </Route>
        </Route>

        {/* 404 fallback */}
        <Route path={USER_ROUTES.NOT_FOUND} element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
