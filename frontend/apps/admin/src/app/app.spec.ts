import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { App } from './app';
import { AuthService } from './core/services/auth.service';

/**
 * Component logic tests, following this codebase's convention (see
 * login.component.spec.ts): the vitest setup here has no templateUrl
 * resolver, so the component is instantiated directly (via
 * TestBed.runInInjectionContext, so its field initializers can call
 * inject()) instead of TestBed.createComponent — we assert on the class's
 * public state and behavior, not on rendered DOM.
 */
describe('App', () => {
  let component: App;
  let mockAuthService: {
    authBootStatus: ReturnType<typeof signal<'idle' | 'checking' | 'ready' | 'retry'>>;
    portalMismatch: ReturnType<typeof signal<boolean>>;
    bootstrapAuthSession: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockAuthService = {
      authBootStatus: signal('idle'),
      portalMismatch: signal(false),
      bootstrapAuthSession: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    });

    component = TestBed.runInInjectionContext(() => new App());
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

  it('retryBoot() re-triggers the boot probe', () => {
    component.retryBoot();

    expect(mockAuthService.bootstrapAuthSession).toHaveBeenCalledTimes(1);
  });
});
