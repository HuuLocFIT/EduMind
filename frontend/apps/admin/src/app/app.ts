import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { PortalMismatchComponent } from './features/auth/portal-mismatch/portal-mismatch.component';

type AppViewState = 'loading' | 'retry' | 'mismatch' | 'content';

@Component({
  imports: [RouterModule, PortalMismatchComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  title = 'admin';

  private authService = inject(AuthService);

  /**
   * Single render decision for the app shell, derived from the boot probe -
   * never from the stored 'admin_user' snapshot directly. 'idle'/'checking'
   * takes priority over a stale portalMismatch left over from a previous
   * probe, so nothing renders as a mismatch (or as content) before this
   * boot probe has confirmed anything for the current cookie.
   */
  viewState = computed<AppViewState>(() => {
    const status = this.authService.authBootStatus();
    if (status === 'idle' || status === 'checking') return 'loading';
    if (status === 'retry') return 'retry';
    if (this.authService.portalMismatch()) return 'mismatch';
    return 'content';
  });

  ngOnInit(): void {
    // Mandatory boot-time reconcile - always runs, regardless of any stored
    // snapshot (fix_multiple_account_on_browser_profile.md P1-9). Nothing
    // route-guarded renders until this settles into viewState 'content'.
    this.authService.bootstrapAuthSession();
  }

  retryBoot(): void {
    this.authService.bootstrapAuthSession();
  }
}
