import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { App, __resetForegroundReconcileThrottleForTests } from './app';
import { AuthService } from './core/services/auth.service';

/**
 * Component logic tests, following this codebase's convention (see
 * login.component.spec.ts): the vitest setup here has no templateUrl
 * resolver, so the component is instantiated directly (via
 * TestBed.runInInjectionContext, so its field initializers can call
 * inject()) instead of TestBed.createComponent — we assert on the class's
 * public state and behavior, not on rendered DOM.
 */
function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    value: state,
    configurable: true,
  });
}

describe('App', () => {
  let component: App;
  let mockAuthService: {
    authBootStatus: ReturnType<typeof signal<'idle' | 'checking' | 'ready' | 'retry'>>;
    portalMismatch: ReturnType<typeof signal<boolean>>;
    isSwitchingAccount: ReturnType<typeof signal<boolean>>;
    isRefreshingSession: ReturnType<typeof signal<boolean>>;
    temporaryReconcileFailure: ReturnType<typeof signal<boolean>>;
    hasIdentitySnapshot: ReturnType<typeof signal<boolean>>;
    bootstrapAuthSession: ReturnType<typeof vi.fn>;
    reconcileForeground: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    __resetForegroundReconcileThrottleForTests();

    mockAuthService = {
      authBootStatus: signal('idle'),
      portalMismatch: signal(false),
      isSwitchingAccount: signal(false),
      isRefreshingSession: signal(false),
      temporaryReconcileFailure: signal(false),
      hasIdentitySnapshot: signal(false),
      bootstrapAuthSession: vi.fn(),
      reconcileForeground: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    });

    component = TestBed.runInInjectionContext(() => new App());
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('fires the mandatory boot probe on init', () => {
    component.ngOnInit();

    expect(mockAuthService.bootstrapAuthSession).toHaveBeenCalledTimes(1);
  });

  it('resolves to the loading view while the boot probe is idle', () => {
    mockAuthService.authBootStatus.set('idle');

    expect(component.viewState()).toBe('loading');
  });

  it('resolves to the loading view while the boot probe is checking', () => {
    mockAuthService.authBootStatus.set('checking');

    expect(component.viewState()).toBe('loading');
  });

  it('resolves to the retry view on an unconfirmed boot failure', () => {
    mockAuthService.authBootStatus.set('retry');

    expect(component.viewState()).toBe('retry');
  });

  it('resolves to the mismatch view once the boot probe confirms a non-admin identity', () => {
    mockAuthService.authBootStatus.set('ready');
    mockAuthService.portalMismatch.set(true);

    expect(component.viewState()).toBe('mismatch');
  });

  it('resolves to the content view once the boot probe confirms a matching admin identity', () => {
    mockAuthService.authBootStatus.set('ready');
    mockAuthService.portalMismatch.set(false);

    expect(component.viewState()).toBe('content');
  });

  it('ignores portalMismatch while the boot probe has not settled yet', () => {
    // A stale portalMismatch left over from a previous rejection must not
    // leak into the loading state before this boot probe has confirmed
    // anything for the current cookie.
    mockAuthService.authBootStatus.set('checking');
    mockAuthService.portalMismatch.set(true);

    expect(component.viewState()).toBe('loading');
  });

  it('resolves to the content view when portalMismatch is true but a switch-account escape is in progress', () => {
    mockAuthService.authBootStatus.set('ready');
    mockAuthService.portalMismatch.set(true);
    mockAuthService.isSwitchingAccount.set(true);

    expect(component.viewState()).toBe('content');
  });

  // Post-boot counterpart of the 'retry' boot status: markTemporaryReconcileFailure() used to
  // set a signal nothing rendered from, so a foreground reconcile that failed for an
  // unconfirmed reason left the stored admin snapshot rendering as authenticated.
  it('resolves to the retry view when a post-boot reconcile fails with a snapshot at stake', () => {
    mockAuthService.authBootStatus.set('ready');
    mockAuthService.temporaryReconcileFailure.set(true);
    mockAuthService.hasIdentitySnapshot.set(true);

    expect(component.viewState()).toBe('retry');
  });

  it('stays on the content view when a reconcile fails temporarily with no snapshot to protect', () => {
    // A logged-out tab on the login page: nothing unconfirmed can be rendered, so a network
    // blip must not replace the login form with a retry screen.
    mockAuthService.authBootStatus.set('ready');
    mockAuthService.temporaryReconcileFailure.set(true);
    mockAuthService.hasIdentitySnapshot.set(false);

    expect(component.viewState()).toBe('content');
  });

  it('prefers the retry view over the mismatch view when both are set', () => {
    // A mismatch flag that predates an unconfirmed probe is no more trustworthy than the
    // snapshot itself — retry is the honest state.
    mockAuthService.authBootStatus.set('ready');
    mockAuthService.temporaryReconcileFailure.set(true);
    mockAuthService.hasIdentitySnapshot.set(true);
    mockAuthService.portalMismatch.set(true);

    expect(component.viewState()).toBe('retry');
  });

  it('retryBoot() re-triggers the boot probe', () => {
    component.retryBoot();

    expect(mockAuthService.bootstrapAuthSession).toHaveBeenCalledTimes(1);
  });

  it('exposes isRefreshingSession from AuthService', () => {
    mockAuthService.isRefreshingSession.set(true);

    expect(component.isRefreshingSession()).toBe(true);
  });

  describe('foreground reconcile', () => {
    it('triggers a reconcile on tab focus once the boot probe has settled', () => {
      mockAuthService.authBootStatus.set('ready');
      component.ngOnInit();
      setVisibility('visible');

      document.dispatchEvent(new Event('visibilitychange'));

      expect(mockAuthService.reconcileForeground).toHaveBeenCalledTimes(1);
    });

    it('does not trigger while the boot probe has not settled yet', () => {
      mockAuthService.authBootStatus.set('checking');
      component.ngOnInit();
      setVisibility('visible');

      document.dispatchEvent(new Event('visibilitychange'));

      expect(mockAuthService.reconcileForeground).not.toHaveBeenCalled();
    });

    it('does not trigger while portalMismatch is active and not being escaped', () => {
      mockAuthService.authBootStatus.set('ready');
      mockAuthService.portalMismatch.set(true);
      component.ngOnInit();
      setVisibility('visible');

      document.dispatchEvent(new Event('visibilitychange'));

      expect(mockAuthService.reconcileForeground).not.toHaveBeenCalled();
    });

    it('does not trigger while a switch-account escape is in progress', () => {
      mockAuthService.authBootStatus.set('ready');
      mockAuthService.isSwitchingAccount.set(true);
      component.ngOnInit();
      setVisibility('visible');

      document.dispatchEvent(new Event('visibilitychange'));

      expect(mockAuthService.reconcileForeground).not.toHaveBeenCalled();
    });

    it('does not trigger while a reconcile is already in flight', () => {
      mockAuthService.authBootStatus.set('ready');
      mockAuthService.isRefreshingSession.set(true);
      component.ngOnInit();
      setVisibility('visible');

      document.dispatchEvent(new Event('visibilitychange'));

      expect(mockAuthService.reconcileForeground).not.toHaveBeenCalled();
    });

    it('does not trigger when the tab becomes hidden', () => {
      mockAuthService.authBootStatus.set('ready');
      component.ngOnInit();
      setVisibility('hidden');

      document.dispatchEvent(new Event('visibilitychange'));

      expect(mockAuthService.reconcileForeground).not.toHaveBeenCalled();
    });

    it('throttles consecutive reconciles', () => {
      mockAuthService.authBootStatus.set('ready');
      component.ngOnInit();
      setVisibility('visible');

      document.dispatchEvent(new Event('visibilitychange'));
      document.dispatchEvent(new Event('visibilitychange'));

      expect(mockAuthService.reconcileForeground).toHaveBeenCalledTimes(1);
    });

    it('stops listening after ngOnDestroy', () => {
      mockAuthService.authBootStatus.set('ready');
      component.ngOnInit();
      component.ngOnDestroy();
      setVisibility('visible');

      document.dispatchEvent(new Event('visibilitychange'));

      expect(mockAuthService.reconcileForeground).not.toHaveBeenCalled();
    });
  });
});
