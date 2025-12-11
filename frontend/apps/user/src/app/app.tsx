import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider, useToast, ToastContainer } from "@edumind/user-ui";
import { USER_ROUTES, TEACHER_ROUTES } from "@edumind/shared-utils";
import { queryClient } from "./lib/query-client";

// Layouts
import { MainLayout, AuthLayout, TeacherLayout } from "./layouts";

// Guards
import { ProtectedRoute } from "./components/ProtectedRoute";
import { TeacherGuard } from "./components/teacher/TeacherGuard";
import {
  TeacherApplicationRoute,
  TeacherApplicationStatusRoute,
} from "./components/TeacherApplicationGuards";

// Auth Pages
import { LoginPage, SignupPage, OAuth2CallbackPage } from "./pages/auth";

// Public Pages
import { HomePage, BrowseCoursesPage, CourseDetailPage } from "./pages/public";

// Profile Settings Page
import { ProfileSettingsPage } from "./pages/ProfileSettingsPage";

// Dashboard Page
import { DashboardPage } from "./pages/DashboardPage";

// Not Found Page
import { NotFoundPage } from "./pages/NotFoundPage";

// Teacher Application Pages
import {
  TeacherApplicationPage,
  ApplicationStatusPage,
} from "./pages/teacher-application";

// Teacher Pages
import {
  TeacherDashboardPage,
  TeacherCoursesPage,
  TeacherCourseCreatePage,
  TeacherCourseEditPage,
  TeacherCourseDetailPage,
  TeacherStudentsPage,
  TeacherReviewsPage,
  TeacherAnalyticsPage,
  TeacherSettingsPage,
} from "./pages/teacher";

// Learning Pages
import {
  CoursePlayerPage,
  CertificatesPage,
  WishlistPage,
  MyLearningPage,
} from "./pages/learning";

function AppContent() {
  const { toasts, closeToast } = useToast();

  return (
    <BrowserRouter>
      <ToastContainer toasts={toasts} onClose={closeToast} />

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<MainLayout />}>
          <Route path={USER_ROUTES.ROOT} element={<HomePage />} />
          <Route path={USER_ROUTES.COURSES} element={<BrowseCoursesPage />} />
          <Route
            path={USER_ROUTES.COURSE_DETAIL}
            element={<CourseDetailPage />}
          />
        </Route>

        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path={USER_ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={USER_ROUTES.SIGNUP} element={<SignupPage />} />
          <Route
            path={USER_ROUTES.OAUTH2_REDIRECT}
            element={<OAuth2CallbackPage />}
          />
        </Route>

        {/* Protected Routes - Main Site */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<MainLayout />}>
            <Route path={USER_ROUTES.DASHBOARD} element={<DashboardPage />} />
            <Route path={USER_ROUTES.LEARNING} element={<MyLearningPage />} />
            <Route
              path={USER_ROUTES.LEARNING_COURSE}
              element={<CoursePlayerPage />}
            />

            <Route
              path={USER_ROUTES.CERTIFICATES}
              element={<CertificatesPage />}
            />
            <Route
              path={USER_ROUTES.PROFILE_SETTINGS}
              element={<ProfileSettingsPage />}
            />
            <Route path={USER_ROUTES.WISHLIST} element={<WishlistPage />} />

            <Route element={<TeacherApplicationStatusRoute />}>
              <Route
                path={USER_ROUTES.TEACHER_APPLICATION_STATUS}
                element={<ApplicationStatusPage />}
              />
            </Route>
            <Route element={<TeacherApplicationRoute />}>
              <Route
                path={USER_ROUTES.TEACHER_APPLICATION}
                element={<TeacherApplicationPage />}
              />
            </Route>
          </Route>
        </Route>

        {/* ================================================================ */}
        {/* Teacher Portal Routes - Protected with TeacherGuard             */}
        {/* ================================================================ */}
        <Route element={<TeacherGuard />}>
          <Route element={<TeacherLayout />}>
            {/* Dashboard */}
            <Route
              path={TEACHER_ROUTES.DASHBOARD}
              element={<TeacherDashboardPage />}
            />

            {/* Courses */}
            <Route
              path={TEACHER_ROUTES.COURSES}
              element={<TeacherCoursesPage />}
            />
            <Route
              path={TEACHER_ROUTES.COURSE_CREATE}
              element={<TeacherCourseCreatePage />}
            />
            <Route
              path={TEACHER_ROUTES.COURSE_EDIT}
              element={<TeacherCourseEditPage />}
            />
            <Route
              path={TEACHER_ROUTES.COURSE_DETAIL}
              element={<TeacherCourseDetailPage />}
            />

            {/* Students */}
            <Route
              path={TEACHER_ROUTES.STUDENTS}
              element={<TeacherStudentsPage />}
            />

            {/* Reviews */}
            <Route
              path={TEACHER_ROUTES.REVIEWS}
              element={<TeacherReviewsPage />}
            />

            {/* Analytics */}
            <Route
              path={TEACHER_ROUTES.ANALYTICS}
              element={<TeacherAnalyticsPage />}
            />

            {/* Settings */}
            <Route
              path={TEACHER_ROUTES.SETTINGS}
              element={<TeacherSettingsPage />}
            />
          </Route>
        </Route>

        {/* 404 fallback */}
        <Route path={USER_ROUTES.NOT_FOUND} element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <ToastProvider>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </ToastProvider>
  );
}

export default App;
