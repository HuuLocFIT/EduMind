import { Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  ToastProvider,
  useToast,
  ToastContainer,
  FullPageLoading,
} from "@edumind/user-ui";
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
import { AppErrorBoundary } from "./components/RouteErrorBoundary";
import { createLazyRoute } from "./components/LazyRoute";
import { ScrollToTop } from "./components/ScrollToTop";

// ============================================
// EAGER LOADED - Critical path pages
// ============================================
import { HomePage } from "./pages/public/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { DashboardPage } from "./pages/DashboardPage";

// Placeholder pages from teacher (inline components, no lazy needed)
import { TeacherSettingsPage } from "./pages/teacher";

// Auth Pages
const LoginPage = createLazyRoute(() => import("./pages/auth/LoginPage"));
const SignupPage = createLazyRoute(() => import("./pages/auth/SignupPage"));
const OAuth2CallbackPage = createLazyRoute(
  () => import("./pages/auth/OAuth2CallbackPage")
);
const ForgotPasswordPage = createLazyRoute(
  () => import("./pages/auth/ForgotPasswordPage")
);
const ResetPasswordPage = createLazyRoute(
  () => import("./pages/auth/ResetPasswordPage")
);
const EmailVerificationPage = createLazyRoute(
  () => import("./pages/auth/EmailVerificationPage")
);
const TwoFactorSetupPage = createLazyRoute(
  () => import("./pages/auth/TwoFactorSetupPage")
);
const TwoFactorRecoveryPage = createLazyRoute(
  () => import("./pages/auth/TwoFactorRecoveryPage")
);

// Public Pages (except HomePage)
const BrowseCoursesPage = createLazyRoute(
  () => import("./pages/public/BrowseCoursesPage")
);
const CourseDetailPage = createLazyRoute(
  () => import("./pages/public/CourseDetailPage")
);

// Dashboard & Profile
const ProfileSettingsPage = createLazyRoute(
  () => import("./pages/ProfileSettingsPage")
);

// Learning Pages
const CoursePlayerPage = createLazyRoute(
  () => import("./pages/learning/CoursePlayerPage")
);
const CertificatesPage = createLazyRoute(
  () => import("./pages/learning/CertificatesPage")
);
const WishlistPage = createLazyRoute(() => import("./pages/learning/WishlistPage"));
const MyLearningPage = createLazyRoute(
  () => import("./pages/learning/MyLearningPage")
);

// Teacher Application Pages
const TeacherApplicationPage = createLazyRoute(
  () => import("./pages/teacher-application/TeacherApplicationPage")
);
const ApplicationStatusPage = createLazyRoute(
  () => import("./pages/teacher-application/ApplicationStatusPage")
);

// Payment Pages
const CartPage = createLazyRoute(
  () => import("./pages/payment/CartPage")
);
const CheckoutPage = createLazyRoute(
  () => import("./pages/payment/CheckoutPage")
);
const CheckoutSuccessPage = createLazyRoute(
  () => import("./pages/payment/CheckoutSuccessPage")
);
const CheckoutFailedPage = createLazyRoute(
  () => import("./pages/payment/CheckoutFailedPage")
);
const SepayQrPage = createLazyRoute(
  () => import("./pages/payment/SepayQrPage")
);
const OrdersPage = createLazyRoute(
  () => import("./pages/payment/OrdersPage")
);
const OrderDetailPage = createLazyRoute(
  () => import("./pages/payment/OrderDetailPage")
);
const RefundsPage = createLazyRoute(
  () => import("./pages/payment/RefundsPage")
);
const RefundDetailPage = createLazyRoute(
  () => import("./pages/payment/RefundDetailPage")
);

// Teacher Portal Pages
const TeacherDashboardPage = createLazyRoute(
  () => import("./pages/teacher/TeacherDashboardPage")
);
const TeacherCoursesPage = createLazyRoute(
  () => import("./pages/teacher/TeacherCoursesPage")
);
const TeacherCourseCreatePage = createLazyRoute(
  () => import("./pages/teacher/TeacherCourseCreatePage")
);
const TeacherCourseEditPage = createLazyRoute(
  () => import("./pages/teacher/TeacherCourseEditPage")
);
const TeacherCourseDetailPage = createLazyRoute(
  () => import("./pages/teacher/TeacherCourseDetailPage")
);
const TeacherStudentsPage = createLazyRoute(
  () => import("./pages/teacher/TeacherStudentsPage")
);
const TeacherReviewsPage = createLazyRoute(
  () => import("./pages/teacher/TeacherReviewsPage")
);
const TeacherEarningsPage = createLazyRoute(
  () => import("./pages/teacher/TeacherEarningsPage")
);
const TeacherPayoutsPage = createLazyRoute(
  () => import("./pages/teacher/TeacherPayoutsPage")
);
const TeacherPayoutDetailPage = createLazyRoute(
  () => import("./pages/teacher/TeacherPayoutDetailPage")
);

function AppContent() {
  const { toasts, closeToast } = useToast();

  return (
    <BrowserRouter>
      <ScrollToTop />
      <ToastContainer toasts={toasts} onClose={closeToast} />

      <AppErrorBoundary>
        <Routes>
          {/* ================================================================ */}
          {/* Public Routes - No authentication required                     */}
          {/* ================================================================ */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route
              path={USER_ROUTES.COURSES}
              element={
                <Suspense fallback={<FullPageLoading message="Loading courses..." />}>
                  <BrowseCoursesPage />
                </Suspense>
              }
            />
            <Route
              path={USER_ROUTES.COURSE_DETAIL}
              element={
                <Suspense fallback={<FullPageLoading message="Loading course details..." />}>
                  <CourseDetailPage />
                </Suspense>
              }
            />
          </Route>

          {/* ================================================================ */}
          {/* Auth Routes - Authentication pages                              */}
          {/* ================================================================ */}
          <Route element={<AuthLayout />}>
            <Route
              path={USER_ROUTES.LOGIN}
              element={
                <Suspense fallback={<FullPageLoading message="Loading login..." />}>
                  <LoginPage />
                </Suspense>
              }
            />
            <Route
              path={USER_ROUTES.SIGNUP}
              element={
                <Suspense fallback={<FullPageLoading message="Loading signup..." />}>
                  <SignupPage />
                </Suspense>
              }
            />
            <Route
              path={USER_ROUTES.OAUTH2_REDIRECT}
              element={
                <Suspense fallback={<FullPageLoading message="Processing authentication..." />}>
                  <OAuth2CallbackPage />
                </Suspense>
              }
            />
            <Route
              path={USER_ROUTES.FORGOT_PASSWORD}
              element={
                <Suspense fallback={<FullPageLoading message="Loading forgot password..." />}>
                  <ForgotPasswordPage />
                </Suspense>
              }
            />
            <Route
              path={USER_ROUTES.RESET_PASSWORD}
              element={
                <Suspense fallback={<FullPageLoading message="Loading reset password..." />}>
                  <ResetPasswordPage />
                </Suspense>
              }
            />
            <Route
              path={USER_ROUTES.VERIFY_EMAIL}
              element={
                <Suspense fallback={<FullPageLoading message="Loading email verification..." />}>
                  <EmailVerificationPage />
                </Suspense>
              }
            />
            <Route
              path={USER_ROUTES.TWO_FA_RECOVERY}
              element={
                <Suspense fallback={<FullPageLoading message="Loading 2FA recovery..." />}>
                  <TwoFactorRecoveryPage />
                </Suspense>
              }
            />
          </Route>

          {/* ================================================================ */}
          {/* Protected Routes - Requires authentication                      */}
          {/* ================================================================ */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<MainLayout />}>
              {/* Dashboard & Profile */}
              <Route
                path={USER_ROUTES.DASHBOARD}
                element={<DashboardPage />}
              />
              <Route
                path={USER_ROUTES.PROFILE_SETTINGS}
                element={
                  <Suspense fallback={<FullPageLoading message="Loading profile settings..." />}>
                    <ProfileSettingsPage />
                  </Suspense>
                }
              />
              <Route
                path={USER_ROUTES.TWO_FA_SETUP}
                element={
                  <Suspense fallback={<FullPageLoading message="Loading 2FA setup..." />}>
                    <TwoFactorSetupPage />
                  </Suspense>
                }
              />

              {/* Learning */}
              <Route
                path={USER_ROUTES.LEARNING}
                element={
                  <Suspense fallback={<FullPageLoading message="Loading my learning..." />}>
                    <MyLearningPage />
                  </Suspense>
                }
              />
              <Route
                path={USER_ROUTES.LEARNING_COURSE}
                element={
                  <Suspense fallback={<FullPageLoading message="Loading course player..." />}>
                    <CoursePlayerPage />
                  </Suspense>
                }
              />
              <Route
                path={USER_ROUTES.CERTIFICATES}
                element={
                  <Suspense fallback={<FullPageLoading message="Loading certificates..." />}>
                    <CertificatesPage />
                  </Suspense>
                }
              />
              <Route
                path={USER_ROUTES.WISHLIST}
                element={
                  <Suspense fallback={<FullPageLoading message="Loading wishlist..." />}>
                    <WishlistPage />
                  </Suspense>
                }
              />

              {/* Teacher Application */}
              <Route element={<TeacherApplicationStatusRoute />}>
                <Route
                  path={USER_ROUTES.TEACHER_APPLICATION_STATUS}
                  element={
                    <Suspense fallback={<FullPageLoading message="Loading application status..." />}>
                      <ApplicationStatusPage />
                    </Suspense>
                  }
                />
              </Route>
              <Route element={<TeacherApplicationRoute />}>
                <Route
                  path={USER_ROUTES.TEACHER_APPLICATION}
                  element={
                    <Suspense fallback={<FullPageLoading message="Loading teacher application..." />}>
                      <TeacherApplicationPage />
                    </Suspense>
                  }
                />
              </Route>

              {/* Cart & Checkout */}
              <Route
                path={USER_ROUTES.CART}
                element={
                  <Suspense fallback={<FullPageLoading message="Loading cart..." />}>
                    <CartPage />
                  </Suspense>
                }
              />
              <Route
                path={USER_ROUTES.CHECKOUT}
                element={
                  <Suspense fallback={<FullPageLoading message="Loading checkout..." />}>
                    <CheckoutPage />
                  </Suspense>
                }
              />
              <Route
                path={USER_ROUTES.CHECKOUT_SUCCESS}
                element={
                  <Suspense fallback={<FullPageLoading message="Loading..." />}>
                    <CheckoutSuccessPage />
                  </Suspense>
                }
              />
              <Route
                path={USER_ROUTES.CHECKOUT_FAILED}
                element={
                  <Suspense fallback={<FullPageLoading message="Loading..." />}>
                    <CheckoutFailedPage />
                  </Suspense>
                }
              />
              <Route
                path={USER_ROUTES.CHECKOUT_SEPAY_QR}
                element={
                  <Suspense fallback={<FullPageLoading message="Loading payment..." />}>
                    <SepayQrPage />
                  </Suspense>
                }
              />

              {/* Orders */}
              <Route
                path={USER_ROUTES.ORDERS}
                element={
                  <Suspense fallback={<FullPageLoading message="Loading orders..." />}>
                    <OrdersPage />
                  </Suspense>
                }
              />
              <Route
                path={USER_ROUTES.ORDER_DETAIL}
                element={
                  <Suspense fallback={<FullPageLoading message="Loading order..." />}>
                    <OrderDetailPage />
                  </Suspense>
                }
              />
              {/* Refunds */}
              <Route
                path={USER_ROUTES.REFUNDS}
                element={
                  <Suspense fallback={<FullPageLoading message="Loading refunds..." />}>
                    <RefundsPage />
                  </Suspense>
                }
              />
              <Route
                path={USER_ROUTES.REFUND_DETAIL}
                element={
                  <Suspense fallback={<FullPageLoading message="Loading refund..." />}>
                    <RefundDetailPage />
                  </Suspense>
                }
              />
            </Route>
          </Route>

          {/* ================================================================ */}
          {/* Teacher Portal Routes - Requires teacher role                   */}
          {/* ================================================================ */}
          <Route element={<TeacherGuard />}>
            <Route element={<TeacherLayout />}>
              <Route
                path={TEACHER_ROUTES.DASHBOARD}
                element={
                  <Suspense fallback={<FullPageLoading message="Loading teacher dashboard..." />}>
                    <TeacherDashboardPage />
                  </Suspense>
                }
              />

              {/* Courses */}
              <Route
                path={TEACHER_ROUTES.COURSES}
                element={
                  <Suspense fallback={<FullPageLoading message="Loading teacher courses..." />}>
                    <TeacherCoursesPage />
                  </Suspense>
                }
              />
              <Route
                path={TEACHER_ROUTES.COURSE_CREATE}
                element={
                  <Suspense fallback={<FullPageLoading message="Loading course creation..." />}>
                    <TeacherCourseCreatePage />
                  </Suspense>
                }
              />
              <Route
                path={TEACHER_ROUTES.COURSE_EDIT}
                element={
                  <Suspense fallback={<FullPageLoading message="Loading course editor..." />}>
                    <TeacherCourseEditPage />
                  </Suspense>
                }
              />
              <Route
                path={TEACHER_ROUTES.COURSE_DETAIL}
                element={
                  <Suspense fallback={<FullPageLoading message="Loading course details..." />}>
                    <TeacherCourseDetailPage />
                  </Suspense>
                }
              />

              {/* Students */}
              <Route
                path={TEACHER_ROUTES.STUDENTS}
                element={
                  <Suspense fallback={<FullPageLoading message="Loading students..." />}>
                    <TeacherStudentsPage />
                  </Suspense>
                }
              />

              {/* Reviews */}
              <Route
                path={TEACHER_ROUTES.REVIEWS}
                element={<Suspense fallback={<FullPageLoading message="Loading reviews..." />}>
                    <TeacherReviewsPage />
                  </Suspense>
                }
              />

              {/* Analytics - redirected to dashboard */}
              <Route
                path={TEACHER_ROUTES.ANALYTICS}
                element={<Navigate to={TEACHER_ROUTES.DASHBOARD} replace />}
              />
              
              {/* Earnings */}
              <Route
                path={TEACHER_ROUTES.EARNINGS}
                element={
                  <Suspense fallback={<FullPageLoading message="Loading earnings..." />}>
                    <TeacherEarningsPage />
                  </Suspense>
                }
              />

              {/* Payouts */}
              <Route
                path={TEACHER_ROUTES.PAYOUTS}
                element={
                  <Suspense fallback={<FullPageLoading message="Loading payouts..." />}>
                    <TeacherPayoutsPage />
                  </Suspense>
                }
              />
              <Route
                path={TEACHER_ROUTES.PAYOUT_DETAIL}
                element={
                  <Suspense fallback={<FullPageLoading message="Loading payout..." />}>
                    <TeacherPayoutDetailPage />
                  </Suspense>
                }
              />

              {/* Settings */}
              <Route
                path={TEACHER_ROUTES.SETTINGS}
                element={<TeacherSettingsPage />}
              />
            </Route>
          </Route>

          {/* ================================================================ */}
          {/* 404 Fallback                                                    */}
          {/* ================================================================ */}
          <Route path={USER_ROUTES.NOT_FOUND} element={<NotFoundPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AppErrorBoundary>
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
