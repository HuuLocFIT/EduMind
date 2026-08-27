import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { PortalMismatchComponent } from './portal-mismatch.component';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '@edumind/shared-constants';
import type { User } from '@edumind/shared-types';

describe('PortalMismatchComponent', () => {
  let component: PortalMismatchComponent;
  let mockAuthService: {
    rejectedIdentity: ReturnType<typeof signal<User | null>>;
  };

  beforeEach(() => {
    mockAuthService = {
      rejectedIdentity: signal(null),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: mockAuthService }],
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
});
