import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonComponent } from '@edumind/admin-ui';
import { AuthService } from '../../../core/services/auth.service';
import { ADMIN_ROUTES } from '@edumind/shared-utils';

/**
 * Rendered by the app shell in place of the router outlet when the boot
 * probe confirms a non-admin identity. Local portal state is already
 * cleared (see AuthService.rejectPortalIdentity) - the shared refresh
 * cookie is left untouched, so this is intentionally not a logout screen.
 * The "go to the other portal" CTA is P1-11, a separate task.
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

          <app-button variant="primary" [fullWidth]="true" (click)="switchAccount()">
            Log in with a different account
          </app-button>
        </div>
      </div>
    </div>
  `,
})
export class PortalMismatchComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  rejectedIdentity = this.authService.rejectedIdentity;

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
