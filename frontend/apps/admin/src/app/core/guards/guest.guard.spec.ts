import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { guestGuard } from './guest.guard';
import { AuthService } from '../services/auth.service';
import { ADMIN_ROUTES } from '@edumind/shared-utils';

describe('guestGuard', () => {
  let mockAuthService: {
    isAuthenticated: ReturnType<typeof vi.fn>;
  };
  let mockRouter: {
    navigate: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Create mocks
    mockAuthService = {
      isAuthenticated: vi.fn(),
    };

    mockRouter = {
      navigate: vi.fn(),
    };

    // Configure TestBed
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    });
  });

  it('should return true when user is not authenticated', () => {
    mockAuthService.isAuthenticated.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() => guestGuard());

    expect(result).toBe(true);
    expect(mockAuthService.isAuthenticated).toHaveBeenCalled();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should return false when user is authenticated', () => {
    mockAuthService.isAuthenticated.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() => guestGuard());

    expect(result).toBe(false);
    expect(mockAuthService.isAuthenticated).toHaveBeenCalled();
  });

  it('should navigate to dashboard when authenticated', () => {
    mockAuthService.isAuthenticated.mockReturnValue(true);

    TestBed.runInInjectionContext(() => guestGuard());

    expect(mockRouter.navigate).toHaveBeenCalledWith([ADMIN_ROUTES.DASHBOARD]);
    expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
  });

  it('should not navigate when user is not authenticated', () => {
    mockAuthService.isAuthenticated.mockReturnValue(false);

    TestBed.runInInjectionContext(() => guestGuard());

    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should use AuthService.isAuthenticated() correctly', () => {
    mockAuthService.isAuthenticated.mockReturnValue(false);

    TestBed.runInInjectionContext(() => guestGuard());

    expect(mockAuthService.isAuthenticated).toHaveBeenCalledTimes(1);
    expect(mockAuthService.isAuthenticated).toHaveBeenCalledWith();
  });

  it('should handle AuthService injection correctly', () => {
    mockAuthService.isAuthenticated.mockReturnValue(false);

    // Should not throw when injecting AuthService
    expect(() => {
      TestBed.runInInjectionContext(() => guestGuard());
    }).not.toThrow();
  });

  it('should handle Router injection correctly', () => {
    mockAuthService.isAuthenticated.mockReturnValue(true);

    // Should not throw when injecting Router
    expect(() => {
      TestBed.runInInjectionContext(() => guestGuard());
    }).not.toThrow();
  });

  it('should return boolean value (not undefined)', () => {
    mockAuthService.isAuthenticated.mockReturnValue(false);
    const result = TestBed.runInInjectionContext(() => guestGuard());
    expect(typeof result).toBe('boolean');

    mockAuthService.isAuthenticated.mockReturnValue(true);
    const result2 = TestBed.runInInjectionContext(() => guestGuard());
    expect(typeof result2).toBe('boolean');
  });
});

