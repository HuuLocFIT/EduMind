import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Rendered by the app shell in place of the router outlet when the boot
 * probe confirms a non-admin identity. Local portal state is already
 * cleared (see AuthService.rejectPortalIdentity) - the shared refresh
 * cookie is left untouched, so this is intentionally not a logout screen.
 * CTAs (switch account, go to the other portal) are P1-11, a separate task.
 */
@Component({
  selector: 'app-portal-mismatch',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      data-testid="admin-portal-mismatch"
      role="alert"
      class="admin-portal-mismatch"
    >
      <p>This account isn't available on the admin portal.</p>
      @if (rejectedIdentity(); as user) {
        <p class="admin-portal-mismatch__identity">Signed in as {{ user.username }}</p>
      }
    </div>
  `,
})
export class PortalMismatchComponent {
  private readonly authService = inject(AuthService);

  rejectedIdentity = this.authService.rejectedIdentity;
}
