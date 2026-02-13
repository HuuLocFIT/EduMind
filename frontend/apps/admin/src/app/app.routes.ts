import { Route } from "@angular/router";
import { guestGuard } from "./core/guards/guest.guard";
import { authGuard } from "./core/guards/auth.guard";
import { ADMIN_ROUTES } from "@edumind/shared-utils";

export const appRoutes: Route[] = [
  {
    path: "auth",
    canActivate: [guestGuard],
    loadChildren: () =>
      import("./features/auth/auth.routes").then((m) => m.authRoutes),
  },
  {
    path: "",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./layouts/main-layout/main-layout.component").then(
        (m) => m.MainLayoutComponent
      ),
    children: [
      {
        path: ADMIN_ROUTES.DASHBOARD.replace('/', ''),
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
      },
      {
        path: ADMIN_ROUTES.TEACHER_APPLICATIONS.replace('/', ''),
        loadComponent: () =>
          import('./features/teachers/teacher-applications/teacher-applications.component').then(
            (m) => m.TeacherApplicationsComponent
          ),
      },
      {
        path: ADMIN_ROUTES.TRIAL_TEACHERS.replace('/', ''),
        loadComponent: () =>
          import('./features/teachers/trial-teachers/trial-teachers.component').then(
            (m) => m.TrialTeachersComponent
          ),
      },
      {
        path: ADMIN_ROUTES.CATEGORIES.replace('/', ''),
        loadComponent: () =>
          import('./features/categories/categories.component').then(
            (m) => m.CategoriesComponent
          ),
      },
      {
        path: ADMIN_ROUTES.COURSES.replace('/', ''),
        loadComponent: () =>
          import('./features/courses/courses.component').then(
            (m) => m.CoursesComponent
          ),
      },
      {
        path: `${ADMIN_ROUTES.COURSES.replace('/', '')}/:id`,
        loadComponent: () =>
          import('./features/courses/course-detail.component').then(
            (m) => m.CourseDetailComponent
          ),
      },
      {
        path: ADMIN_ROUTES.REFUNDS_PENDING.replace('/', ''),
        loadComponent: () =>
          import('./features/payments/refunds/pending-refunds.component').then(
            (m) => m.PendingRefundsComponent
          ),
      },
      {
        path: ADMIN_ROUTES.PAYOUTS_ALL.replace('/', ''),
        loadComponent: () =>
          import('./features/payments/payouts/all-payouts.component').then(
            (m) => m.AllPayoutsComponent
          ),
      },
      {
        path: ADMIN_ROUTES.PAYOUTS_PENDING.replace('/', ''),
        loadComponent: () =>
          import('./features/payments/payouts/pending-payouts.component').then(
            (m) => m.PendingPayoutsComponent
          ),
      },
      {
        path: ADMIN_ROUTES.PAYOUT_CREATE.replace('/', ''),
        loadComponent: () =>
          import('./features/payments/payouts/create-payout.component').then(
            (m) => m.CreatePayoutComponent
          ),
      },
    ],
  },
];
