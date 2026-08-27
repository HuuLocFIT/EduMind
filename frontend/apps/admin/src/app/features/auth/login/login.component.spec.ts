import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';
import { ADMIN_ROUTES } from '@edumind/shared-utils';
import { UserRole } from '@edumind/shared-constants';
import type { User, JwtResponse } from '@edumind/shared-types';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';

/**
 * LoginComponent Unit Tests
 * 
 * These tests focus on the component's logic without requiring template resolution.
 * We instantiate the component directly and test its methods and state management.
 */
type LoginComponentInternals = {
  fb: FormBuilder;
  authService: unknown;
  router: unknown;
};

describe('LoginComponent', () => {
  let component: LoginComponent;
  let mockAuthService: {
    isLoading: () => boolean;
    error: () => string | null;
    login: Mock;
    clearError: Mock;
    consumeReturnUrl: Mock;
    _isLoading: boolean;
    _error: string | null;
  };
  let mockRouter: { navigate: Mock };
  let formBuilder: FormBuilder;

  // Mock data
  const mockAdminUser: User = {
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    roles: [UserRole.ADMIN],
    firstName: 'Admin',
    lastName: 'User',
    isActive: true,
    isEmailVerified: true,
    is2faEnabled: false,
    isTrial: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const mockLoginResponse: JwtResponse = {
    accessToken: 'mock-access-token',
    tokenType: 'Bearer',
    user: mockAdminUser,
  };

  beforeEach(() => {
    // Create mock auth service with controllable signals
    mockAuthService = {
      _isLoading: false,
      _error: null as string | null,
      isLoading: function() { return this._isLoading; },
      error: function() { return this._error; },
      login: vi.fn(),
      clearError: vi.fn(),
      consumeReturnUrl: vi.fn(() => ADMIN_ROUTES.DASHBOARD),
    };

    mockRouter = {
      navigate: vi.fn(),
    };

    formBuilder = new FormBuilder();

    // Configure TestBed with minimal setup (no component, just dependencies)
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [
        FormBuilder,
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    });

    // Create component instance directly using reflection
    // This bypasses template resolution
    component = Object.create(LoginComponent.prototype);
    
    // Inject dependencies manually
    const internals = component as unknown as LoginComponentInternals;
    internals.fb = formBuilder;
    internals.authService = mockAuthService;
    internals.router = mockRouter;
    
    // Initialize signals using Angular's signal function
    component.showPassword = signal(false);

    // Call ngOnInit to initialize the form
    component.ngOnInit();
  });

  describe('Component Initialization', () => {
    it('should initialize with loginForm defined', () => {
      expect(component.loginForm).toBeDefined();
    });

    it('should initialize form with empty values', () => {
      expect(component.loginForm.get('usernameOrEmail')?.value).toBe('');
      expect(component.loginForm.get('password')?.value).toBe('');
    });

    it('should initialize showPassword to false', () => {
      expect(component.showPassword()).toBe(false);
    });

    it('should have required validators on usernameOrEmail', () => {
      const control = component.loginForm.get('usernameOrEmail');
      expect(control?.hasError('required')).toBe(true);
    });

    it('should have minLength(3) validator on usernameOrEmail', () => {
      const control = component.loginForm.get('usernameOrEmail');
      control?.setValue('ab');
      expect(control?.hasError('minlength')).toBe(true);
      control?.setValue('abc');
      expect(control?.hasError('minlength')).toBe(false);
    });

    it('should have required validator on password', () => {
      const control = component.loginForm.get('password');
      expect(control?.hasError('required')).toBe(true);
    });

    it('should have minLength(6) validator on password', () => {
      const control = component.loginForm.get('password');
      control?.setValue('12345');
      expect(control?.hasError('minlength')).toBe(true);
      control?.setValue('123456');
      expect(control?.hasError('minlength')).toBe(false);
    });
  });

  describe('Form Validation', () => {
    it('should mark form as invalid when empty', () => {
      expect(component.loginForm.invalid).toBe(true);
    });

    it('should mark form as valid with correct inputs', () => {
      component.loginForm.patchValue({
        usernameOrEmail: 'admin@example.com',
        password: 'password123',
      });
      expect(component.loginForm.valid).toBe(true);
    });

    it('should show error for empty usernameOrEmail', () => {
      const control = component.loginForm.get('usernameOrEmail');
      control?.markAsTouched();
      const error = component.getFieldError('usernameOrEmail');
      expect(error).toBe('Username or email is required');
    });

    it('should show error for usernameOrEmail less than 3 characters', () => {
      const control = component.loginForm.get('usernameOrEmail');
      control?.setValue('ab');
      control?.markAsTouched();
      const error = component.getFieldError('usernameOrEmail');
      expect(error).toContain('must be at least 3 characters');
    });

    it('should show error for empty password', () => {
      const control = component.loginForm.get('password');
      control?.markAsTouched();
      const error = component.getFieldError('password');
      expect(error).toBe('Password is required');
    });

    it('should show error for password less than 6 characters', () => {
      const control = component.loginForm.get('password');
      control?.setValue('12345');
      control?.markAsTouched();
      const error = component.getFieldError('password');
      expect(error).toContain('must be at least 6 characters');
    });

    it('should mark all fields as touched on invalid submit', () => {
      component.onSubmit();
      expect(component.loginForm.get('usernameOrEmail')?.touched).toBe(true);
      expect(component.loginForm.get('password')?.touched).toBe(true);
    });

    it('should not submit when form is invalid', () => {
      component.onSubmit();
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should toggle showPassword signal', () => {
      expect(component.showPassword()).toBe(false);
      component.togglePasswordVisibility();
      expect(component.showPassword()).toBe(true);
      component.togglePasswordVisibility();
      expect(component.showPassword()).toBe(false);
    });
  });

  describe('Form Submission', () => {
    beforeEach(() => {
      component.loginForm.patchValue({
        usernameOrEmail: 'admin@example.com',
        password: 'password123',
      });
    });

    it('should call authService.login with form values', () => {
      mockAuthService.login.mockReturnValue(of(mockLoginResponse));
      
      component.onSubmit();
      
      expect(mockAuthService.clearError).toHaveBeenCalled();
      expect(mockAuthService.login).toHaveBeenCalledWith({
        usernameOrEmail: 'admin@example.com',
        password: 'password123',
      });
    });

    it('should clear error before submission', () => {
      mockAuthService.login.mockReturnValue(of(mockLoginResponse));
      
      component.onSubmit();
      
      expect(mockAuthService.clearError).toHaveBeenCalled();
    });

    it('should navigate to dashboard on successful login', () => {
      mockAuthService.login.mockReturnValue(of(mockLoginResponse));

      component.onSubmit();

      expect(mockRouter.navigate).toHaveBeenCalledWith([ADMIN_ROUTES.DASHBOARD]);
    });

    it('should navigate to the stored deep-link when returning from a switch-account escape', () => {
      mockAuthService.login.mockReturnValue(of(mockLoginResponse));
      mockAuthService.consumeReturnUrl.mockReturnValue('/courses/42');

      component.onSubmit();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/courses/42']);
    });

    it('should handle login error', () => {
      const error = new Error('Invalid credentials');
      mockAuthService.login.mockReturnValue(throwError(() => error));
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      component.onSubmit();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Login error:', error);
      
      consoleErrorSpy.mockRestore();
    });

    it('should not navigate on login error', () => {
      const error = new Error('Invalid credentials');
      mockAuthService.login.mockReturnValue(throwError(() => error));

      component.onSubmit();

      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should return isLoading from authService.isLoading', () => {
      mockAuthService._isLoading = true;
      expect(component.isLoading).toBe(true);
      
      mockAuthService._isLoading = false;
      expect(component.isLoading).toBe(false);
    });
  });

  describe('Error Display', () => {
    it('should return error from authService.error', () => {
      mockAuthService._error = 'Invalid credentials';
      expect(component.error).toBe('Invalid credentials');
    });

    it('should return null when no error', () => {
      mockAuthService._error = null;
      expect(component.error).toBeNull();
    });

    it('should call clearError on closeError', () => {
      component.closeError();
      expect(mockAuthService.clearError).toHaveBeenCalled();
    });
  });

  describe('Field Error Messages', () => {
    it('getFieldError() should return empty string for untouched field', () => {
      const error = component.getFieldError('usernameOrEmail');
      expect(error).toBe('');
    });

    it('getFieldError() should return empty string when no errors', () => {
      const control = component.loginForm.get('usernameOrEmail');
      control?.setValue('valid@email.com');
      control?.markAsTouched();
      
      const error = component.getFieldError('usernameOrEmail');
      expect(error).toBe('');
    });

    it('getFieldError() should return required error for usernameOrEmail', () => {
      const control = component.loginForm.get('usernameOrEmail');
      control?.markAsTouched();
      
      const error = component.getFieldError('usernameOrEmail');
      expect(error).toBe('Username or email is required');
    });

    it('getFieldError() should return required error for password', () => {
      const control = component.loginForm.get('password');
      control?.markAsTouched();
      
      const error = component.getFieldError('password');
      expect(error).toBe('Password is required');
    });

    it('getFieldError() should return minLength error for usernameOrEmail', () => {
      const control = component.loginForm.get('usernameOrEmail');
      control?.setValue('ab');
      control?.markAsTouched();
      
      const error = component.getFieldError('usernameOrEmail');
      expect(error).toContain('must be at least');
      expect(error).toContain('3 characters');
    });

    it('getFieldError() should return minLength error for password', () => {
      const control = component.loginForm.get('password');
      control?.setValue('12345');
      control?.markAsTouched();
      
      const error = component.getFieldError('password');
      expect(error).toContain('must be at least');
      expect(error).toContain('6 characters');
    });
  });
});
