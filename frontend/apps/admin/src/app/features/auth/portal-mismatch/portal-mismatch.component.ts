import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonComponent } from '@edumind/admin-ui';
import { AuthService } from '../../../core/services/auth.service';
import { ADMIN_ROUTES } from '@edumind/shared-utils';
import { environment } from '../../../../environments/environment';

/**
 * Rendered by the app shell in place of the router outlet when the boot
 * probe confirms a non-admin identity. Local portal state is already
 * cleared (see AuthService.rejectPortalIdentity) - the shared refresh
 * cookie is left untouched, so this is intentionally not a logout screen.
 * No default logout CTA - the plan doc requires any logout button here to
 * be explicitly scoped ("Log out of all devices"), which this page doesn't
 * need since the escape hatch and cross-portal link cover the real cases.
 */
@Component({
  selector: 'app-portal-mismatch',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  template: `
    <div
      data-testid="admin-portal-mismatch"
      role="alert"
      class="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-white to-brand-50 px-4 py-16 sm:px-6 lg:px-8"
    >
      <div class="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-100">
        <div class="flex flex-col items-center gap-6 px-8 py-10 text-center sm:px-12 sm:py-12">
          <div class="inline-flex h-12 w-12 items-center justify-center rounded-full bg-warning-100 text-warning-600">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <div class="space-y-2">
            <h1 class="text-xl font-bold text-slate-900">Wrong account for this portal</h1>
            <p class="text-sm text-slate-500">
              This account isn't available on the admin portal.
            </p>
            @if (rejectedIdentity(); as user) {
              <p class="text-sm font-medium text-slate-700">Signed in as {{ user.username }}</p>
            }
          </div>

          <div class="flex w-full flex-col gap-3">
            <app-button variant="primary" [fullWidth]="true" (click)="switchAccount()">
              Log in with a different account
            </app-button>
            @if (userPortalUrl) {
              <a
                [href]="userPortalUrl"
                class="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 font-semibold text-brand-700 transition-all duration-200 hover:border-brand-300 hover:bg-brand-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              >
                Go to the user portal
              </a>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class PortalMismatchComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  rejectedIdentity = this.authService.rejectedIdentity;
  // Never hardcoded - comes from environment.ts/environment.prod.ts
  // (fix_multiple_account_on_browser_profile.md P1-11).
  userPortalUrl = environment.userPortalUrl;

  /**
   * Opens the switch-account escape hatch (fix_multiple_account_on_browser_profile.md
   * P1-10): remembers the deep-link this mismatch happened on, then lets the
   * login route render even though portalMismatch is still true.
   */
  switchAccount(): void {
    this.authService.startSwitchingAccount(this.router.url);
    this.router.navigate([ADMIN_ROUTES.AUTH_LOGIN]);
  }
}
