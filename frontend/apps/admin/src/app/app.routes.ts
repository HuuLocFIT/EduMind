import { Route } from "@angular/router";
import { guestGuard } from "./core/guards/guest.guard";
import { authGuard } from "./core/guards/auth.guard";

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
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
      },
    ],
  },
];
