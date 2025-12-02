import { Routes } from '@angular/router';
import { ADMIN_ROUTES } from '@edumind/shared-utils';

export const authRoutes: Routes = [
  {
    path: '',
    redirectTo: ADMIN_ROUTES.AUTH_LOGIN.replace('/auth/', ''),
    pathMatch: 'full',
  },
  {
    path: ADMIN_ROUTES.AUTH_LOGIN.replace('/auth/', ''),
    loadComponent: () =>
      import('./login/login.component').then((m) => m.LoginComponent),
  },
];