import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PortalMismatchComponent } from './portal-mismatch.component';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '@edumind/shared-constants';
import { ADMIN_ROUTES } from '@edumind/shared-utils';
import { environment } from '../../../../environments/environment';
import type { User } from '@edumind/shared-types';

describe('PortalMismatchComponent', () => {
  let component: PortalMismatchComponent;
  let mockAuthService: {
    rejectedIdentity: ReturnType<typeof signal<User | null>>;
    startSwitchingAccount: ReturnType<typeof vi.fn>;
  };
  let mockRouter: {
    url: string;
    navigate: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockAuthService = {
      rejectedIdentity: signal(null),
      startSwitchingAccount: vi.fn(),
    };
    mockRouter = {
      url: '/courses/42',
      navigate: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    });

    component = TestBed.runInInjectionContext(() => new PortalMismatchComponent());
  });

  it('exposes the rejected identity from AuthService', () => {
    const rejected: User = {
      id: 2,
      username: 'student',
      email: 'student@example.com',
      roles: [UserRole.STUDENT],
      isActive: true,
      isEmailVerified: true,
      is2faEnabled: false,
      isTrial: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    mockAuthService.rejectedIdentity.set(rejected);

    expect(component.rejectedIdentity()).toEqual(rejected);
  });

  it('returns null when nothing has been rejected yet', () => {
    expect(component.rejectedIdentity()).toBeNull();
  });

  describe('switchAccount', () => {
    it('starts the switch-account escape with the current deep-link as the return url', () => {
      component.switchAccount();

      expect(mockAuthService.startSwitchingAccount).toHaveBeenCalledWith('/courses/42');
    });

    it('navigates to the login route', () => {
      component.switchAccount();

      expect(mockRouter.navigate).toHaveBeenCalledWith([ADMIN_ROUTES.AUTH_LOGIN]);
    });
  });

  describe('userPortalUrl', () => {
    it('exposes the configured user portal URL, not a hardcoded domain', () => {
      expect(component.userPortalUrl).toBe(environment.userPortalUrl);
    });
  });
});
