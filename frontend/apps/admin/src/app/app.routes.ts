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
    ],
  },
];
