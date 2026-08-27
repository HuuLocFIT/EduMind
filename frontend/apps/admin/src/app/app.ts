import { Component, OnDestroy, OnInit, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonComponent, AlertComponent } from '@edumind/admin-ui';
import { AuthService } from './core/services/auth.service';
import { PortalMismatchComponent } from './features/auth/portal-mismatch/portal-mismatch.component';

type AppViewState = 'loading' | 'retry' | 'mismatch' | 'content';

// Module-scope, not component state: the throttle must survive a component
// remount (there is only ever one app-root in the app) and is reset only by
// tests. See fix_multiple_account_on_browser_profile.md P1-10.
const FOREGROUND_RECONCILE_THROTTLE_MS = 60_000;
let lastForegroundReconcileAt = 0;

export function __resetForegroundReconcileThrottleForTests(): void {
  lastForegroundReconcileAt = 0;
}

@Component({
  imports: [RouterModule, PortalMismatchComponent, ButtonComponent, AlertComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit, OnDestroy {
  title = 'admin';

  private authService = inject(AuthService);
  private handleVisibilityChange = () => this.reconcileOnForeground();

  /**
   * Single render decision for the app shell, derived from the boot probe -
   * never from the stored 'admin_user' snapshot directly. 'idle'/'checking'
   * takes priority over a stale portalMismatch left over from a previous
   * probe, so nothing renders as a mismatch (or as content) before this
   * boot probe has confirmed anything for the current cookie.
   * portalMismatch is overridden by isSwitchingAccount: that's the escape
   * hatch out of the mismatch dead end, and must let the login route render.
   */
  viewState = computed<AppViewState>(() => {
    const status = this.authService.authBootStatus();
    if (status === 'idle' || status === 'checking') return 'loading';
    if (status === 'retry') return 'retry';
    if (this.authService.portalMismatch() && !this.authService.isSwitchingAccount()) {
      return 'mismatch';
    }
    return 'content';
  });

  isRefreshingSession = this.authService.isRefreshingSession;

  ngOnInit(): void {
    // Mandatory boot-time reconcile - always runs, regardless of any stored
    // snapshot (fix_multiple_account_on_browser_profile.md P1-9). Nothing
    // route-guarded renders until this settles into viewState 'content'.
    this.authService.bootstrapAuthSession();

    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  ngOnDestroy(): void {
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  retryBoot(): void {
    this.authService.bootstrapAuthSession();
  }

  /**
   * Re-probes /auth/refresh whenever the tab regains focus, throttled to
   * once per FOREGROUND_RECONCILE_THROTTLE_MS. Runs for both authenticated
   * and unauthenticated snapshots (a cookie set by another tab or portal can
   * change either one) - gated only on authBootStatus === 'ready', not on
   * currentUser. Stays off during 'loading'/'retry', portalMismatch,
   * switchingAccount, and while a probe is already in flight.
   */
  private reconcileOnForeground(): void {
    if (document.visibilityState !== 'visible') return;
    if (this.authService.authBootStatus() !== 'ready') return;
    if (this.authService.isSwitchingAccount()) return;
    if (this.authService.portalMismatch()) return;
    if (this.authService.isRefreshingSession()) return;

    const now = Date.now();
    if (now - lastForegroundReconcileAt < FOREGROUND_RECONCILE_THROTTLE_MS) return;
    lastForegroundReconcileAt = now;

    this.authService.reconcileForeground();
  }
}
