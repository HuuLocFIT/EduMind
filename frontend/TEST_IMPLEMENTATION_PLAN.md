# Auth Features Test Implementation Plan

## Overview

This document outlines the implementation plan to improve test coverage and quality for auth features based on the code review findings.

**Estimated Total Effort:** 3-4 weeks  
**Priority:** High  
**Target Coverage:** 85%+

---

## Phase 1: Critical Fixes (Week 1) 🔴

### 1.1 Add Missing Method Tests

#### Task 1.1.1: Add `loginWithOAuth2` test to `auth.store.test.ts`
**Effort:** 2 hours  
**Priority:** P0

**Test Cases:**
- ✅ Successful OAuth2 login updates state correctly
- ✅ Successful OAuth2 login saves token to localStorage
- ✅ Successful OAuth2 login fetches and saves user
- ✅ Failed OAuth2 login clears localStorage
- ✅ Failed OAuth2 login sets error state
- ✅ Network error during OAuth2 login handled correctly

**Implementation:**
```typescript
describe('loginWithOAuth2', () => {
  it('should complete OAuth2 login successfully', async () => {
    const mockToken = 'oauth-token';
    const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
    
    vi.mocked(authService.fetchCurrentUser).mockResolvedValue(mockUser);
    
    await act(async () => {
      await useAuthStore.getState().loginWithOAuth2(mockToken);
    });
    
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe(mockToken);
    expect(state.user).toEqual(mockUser);
    expect(localStorage.getItem('accessToken')).toBe(mockToken);
  });
  
  it('should handle OAuth2 login failure', async () => {
    const error = new Error('OAuth2 failed');
    vi.mocked(authService.fetchCurrentUser).mockRejectedValue(error);
    
    await expect(
      act(async () => {
        await useAuthStore.getState().loginWithOAuth2('invalid-token');
      })
    ).rejects.toThrow();
    
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(localStorage.getItem('accessToken')).toBeNull();
  });
});
```

---

#### Task 1.1.2: Add `getBackupCodes` test to `auth.service.test.ts`
**Effort:** 1 hour  
**Priority:** P0

**Test Cases:**
- ✅ Calls correct endpoint
- ✅ Returns backup codes array
- ✅ Handles errors correctly

**Implementation:**
```typescript
describe('getBackupCodes', () => {
  it('should call backup codes endpoint', async () => {
    const mockResponse = { data: { backupCodes: ['ABC123', 'DEF456'] } };
    vi.mocked(apiClient.post).mockResolvedValue(mockResponse);
    
    const result = await authService.getBackupCodes();
    
    expect(apiClient.post).toHaveBeenCalledWith('/auth/2fa/backup-codes');
    expect(result).toEqual(mockResponse.data);
  });
});
```

---

#### Task 1.1.3: Add `handleOAuth2Callback` test to `auth.service.test.ts`
**Effort:** 1.5 hours  
**Priority:** P0

**Test Cases:**
- ✅ Calls correct endpoint for Google
- ✅ Calls correct endpoint for Facebook
- ✅ Passes code parameter correctly
- ✅ Returns JWT response
- ✅ Handles errors correctly

**Implementation:**
```typescript
describe('handleOAuth2Callback', () => {
  it('should call OAuth2 callback endpoint for Google', async () => {
    const mockResponse = { data: { accessToken: 'token', user: {} } };
    vi.mocked(apiClient.get).mockResolvedValue(mockResponse);
    
    const result = await authService.handleOAuth2Callback('google', 'auth-code');
    
    expect(apiClient.get).toHaveBeenCalledWith('/oauth2/callback/google', {
      params: { code: 'auth-code' }
    });
    expect(result).toEqual(mockResponse.data);
  });
  
  it('should call OAuth2 callback endpoint for Facebook', async () => {
    // Similar test for Facebook
  });
});
```

---

### 1.2 Add Comprehensive Error Handling Tests

#### Task 1.2.1: Add error handling tests to `auth.store.test.ts`
**Effort:** 3 hours  
**Priority:** P0

**Test Cases:**
- ✅ Network errors (no response)
- ✅ 401 Unauthorized errors
- ✅ 403 Forbidden errors
- ✅ 500 Server errors
- ✅ Malformed error responses
- ✅ Error message extraction from various formats

**Implementation:**
```typescript
describe('Error Handling', () => {
  it('should handle network errors', async () => {
    const networkError = new Error('Network Error');
    networkError.message = 'Network Error';
    vi.mocked(authService.login).mockRejectedValue(networkError);
    
    await expect(
      act(async () => {
        await useAuthStore.getState().login({ usernameOrEmail: 'test', password: 'test' });
      })
    ).rejects.toThrow();
    
    const state = useAuthStore.getState();
    expect(state.error).toBe('Network Error');
  });
  
  it('should handle 401 errors', async () => {
    const error = new Error('Unauthorized');
    (error as any).response = { status: 401, data: { message: 'Invalid credentials' } };
    vi.mocked(authService.login).mockRejectedValue(error);
    
    // Test implementation
  });
  
  // Add similar tests for 403, 500, etc.
});
```

---

#### Task 1.2.2: Add error handling tests to `auth.service.test.ts`
**Effort:** 2 hours  
**Priority:** P0

**Test Cases:**
- ✅ Network failures
- ✅ HTTP error status codes (400, 401, 403, 404, 500)
- ✅ Timeout errors
- ✅ Malformed responses

---

### 1.3 Add Loading State Tests

#### Task 1.3.1: Add loading state tests to `auth.store.test.ts`
**Effort:** 2 hours  
**Priority:** P0

**Test Cases:**
- ✅ `isLoading` is true during login
- ✅ `isLoading` is false after login success
- ✅ `isLoading` is false after login failure
- ✅ `isLoading` is true during signup
- ✅ `isLoading` is true during logout
- ✅ `isLoading` is true during 2FA login

**Implementation:**
```typescript
describe('Loading States', () => {
  it('should set isLoading to true during login', async () => {
    let resolveLogin: (value: any) => void;
    const loginPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });
    vi.mocked(authService.login).mockReturnValue(loginPromise);
    
    const loginPromise = useAuthStore.getState().login({ usernameOrEmail: 'test', password: 'test' });
    
    // Check loading state immediately
    expect(useAuthStore.getState().isLoading).toBe(true);
    
    resolveLogin!({ accessToken: 'token', user: {} });
    await loginPromise;
    
    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});
```

---

#### Task 1.3.2: Add loading state tests to all page components
**Effort:** 4 hours  
**Priority:** P0

**Test Cases for each page:**
- ✅ Button shows loading state during submission
- ✅ Button is disabled during submission
- ✅ Form inputs are disabled during submission
- ✅ Loading indicator is visible

---

### 1.4 Add Navigation Verification Tests

#### Task 1.4.1: Add navigation tests to all page components
**Effort:** 3 hours  
**Priority:** P0

**Pages to update:**
- `EmailVerificationPage.test.tsx` - Navigate to login after success
- `ForgotPasswordPage.test.tsx` - Navigate to login after success
- `LoginPage.test.tsx` - Navigate to dashboard after success
- `ResetPasswordPage.test.tsx` - Navigate to login after success
- `SignupPage.test.tsx` - Navigate to login/verification after success
- `TwoFactorSetupPage.test.tsx` - Navigate to settings after success

**Implementation pattern:**
```typescript
it('should navigate to login after successful verification', async () => {
  mockVerifyEmail.mockResolvedValue({ success: true });
  renderEmailVerificationPage('valid-token');
  
  await waitFor(() => {
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
```

---

### 1.5 Fix OAuth2 Callback Test

#### Task 1.5.1: Review and fix `OAuth2CallbackPage.test.tsx`
**Effort:** 2 hours  
**Priority:** P0

**Actions:**
1. Review actual `OAuth2CallbackPage.tsx` implementation
2. Verify if it uses `token` or `code` parameter
3. Update test to match actual implementation
4. Add provider-specific tests if needed
5. Add error code handling tests

---

## Phase 2: High Priority Improvements (Week 2) ⚠️

### 2.1 Add Form Validation Tests

#### Task 2.1.1: Add comprehensive validation tests to `SignupPage.test.tsx`
**Effort:** 3 hours  
**Priority:** P1

**Test Cases:**
- ✅ Required field validation (username, email, password)
- ✅ Email format validation
- ✅ Password strength validation
- ✅ Password match validation (if confirm password exists)
- ✅ Username format validation
- ✅ Field-specific error messages

**Implementation:**
```typescript
describe('Form Validation', () => {
  it('should show error for empty username', async () => {
    const user = userEvent.setup();
    renderSignupPage();
    
    await user.click(screen.getByRole('button', { name: /create account/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/username is required/i)).toBeInTheDocument();
    });
  });
  
  it('should show error for invalid email format', async () => {
    const user = userEvent.setup();
    renderSignupPage();
    
    await user.type(screen.getByPlaceholderText('your.email@example.com'), 'invalid-email');
    await user.click(screen.getByRole('button', { name: /create account/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
  });
  
  // Add more validation tests
});
```

---

#### Task 2.1.2: Add validation tests to other forms
**Effort:** 2 hours  
**Priority:** P1

**Pages:**
- `LoginPage.test.tsx` - Already has some, expand
- `ResetPasswordPage.test.tsx` - Add password strength tests
- `ForgotPasswordPage.test.tsx` - Add email format tests

---

### 2.2 Add Toast Notification Tests

#### Task 2.2.1: Add toast verification to all page components
**Effort:** 4 hours  
**Priority:** P1

**Test Cases for each page:**
- ✅ Success toast shown on success
- ✅ Error toast shown on error
- ✅ Correct toast message content
- ✅ Toast called with correct parameters

**Implementation pattern:**
```typescript
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
};

vi.mock('@edumind/user-ui', () => ({
  // ... other mocks
  useToast: () => mockToast,
}));

it('should show success toast on successful login', async () => {
  mockLogin.mockResolvedValue(undefined);
  // ... setup and submit form
  
  await waitFor(() => {
    expect(mockToast.success).toHaveBeenCalledWith('Login successful!');
  });
});
```

---

### 2.3 Add Error Message Content Verification

#### Task 2.3.1: Add error message tests to all components
**Effort:** 3 hours  
**Priority:** P1

**Test Cases:**
- ✅ Verify exact error message text
- ✅ Test different error message formats
- ✅ Verify error messages are user-friendly
- ✅ Test error message clearing

---

### 2.4 Add Edge Case Tests

#### Task 2.4.1: Add token expiration tests
**Effort:** 2 hours  
**Priority:** P1

**Pages:**
- `EmailVerificationPage.test.tsx`
- `ResetPasswordPage.test.tsx`
- `OAuth2CallbackPage.test.tsx`

**Test Cases:**
- ✅ Expired token shows appropriate error
- ✅ Invalid token format shows appropriate error
- ✅ Missing token shows appropriate error

---

#### Task 2.4.2: Add concurrent operation tests
**Effort:** 2 hours  
**Priority:** P1

**Test Cases:**
- ✅ Multiple rapid clicks on submit button
- ✅ Form submission while another is in progress
- ✅ Navigation during async operation

**Implementation:**
```typescript
it('should prevent multiple simultaneous submissions', async () => {
  const user = userEvent.setup();
  let resolveCount = 0;
  const loginPromise = new Promise((resolve) => {
    setTimeout(() => {
      resolveCount++;
      resolve({ accessToken: 'token', user: {} });
    }, 100);
  });
  mockLogin.mockReturnValue(loginPromise);
  
  renderLoginPage();
  
  const submitButton = screen.getByRole('button', { name: /sign in/i });
  await user.click(submitButton);
  await user.click(submitButton);
  await user.click(submitButton);
  
  await loginPromise;
  
  expect(mockLogin).toHaveBeenCalledTimes(1);
});
```

---

## Phase 3: Medium Priority Improvements (Week 3) 📝

### 3.1 Add 2FA Error Handling Tests

#### Task 3.1.1: Expand 2FA tests in `LoginPage.test.tsx`
**Effort:** 2 hours  
**Priority:** P2

**Test Cases:**
- ✅ Invalid 2FA code
- ✅ Expired 2FA code
- ✅ Network error during 2FA verification
- ✅ Error message display

---

#### Task 3.1.2: Expand 2FA tests in `TwoFactorRecoveryPage.test.tsx`
**Effort:** 2 hours  
**Priority:** P2

**Test Cases:**
- ✅ Invalid backup code
- ✅ Used backup code
- ✅ Expired backup code
- ✅ Network errors

---

#### Task 3.1.3: Expand 2FA tests in `TwoFactorSetupPage.test.tsx`
**Effort:** 2 hours  
**Priority:** P2

**Test Cases:**
- ✅ Invalid verification code
- ✅ Network error during verification
- ✅ Backup codes display
- ✅ Secret key copy functionality
- ✅ User state update after successful setup

---

### 3.2 Add localStorage Edge Case Tests

#### Task 3.2.1: Add localStorage tests to `auth.store.test.ts`
**Effort:** 2 hours  
**Priority:** P2

**Test Cases:**
- ✅ localStorage quota exceeded
- ✅ localStorage disabled
- ✅ localStorage read-only
- ✅ Malformed data in localStorage

**Implementation:**
```typescript
describe('localStorage Edge Cases', () => {
  it('should handle localStorage quota exceeded', () => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = vi.fn(() => {
      throw new DOMException('QuotaExceededError');
    });
    
    // Test that error is handled gracefully
    // ...
    
    Storage.prototype.setItem = originalSetItem;
  });
});
```

---

### 3.3 Add Query Client Tests

#### Task 3.3.1: Add queryClient.clear() verification
**Effort:** 1 hour  
**Priority:** P2

**Test Cases:**
- ✅ `queryClient.clear()` called on logout
- ✅ `queryClient.clear()` called on `clearAuthState`

---

### 3.4 Improve Test Documentation

#### Task 3.4.1: Add JSDoc comments to test files
**Effort:** 2 hours  
**Priority:** P2

**Add comments explaining:**
- Test purpose
- Test scenario
- Expected behavior
- Edge cases covered

---

## Phase 4: Long-term Improvements (Week 4+) 🚀

### 4.1 Add Integration Tests

#### Task 4.1.1: Create integration test suite
**Effort:** 8 hours  
**Priority:** P2

**Test Scenarios:**
- ✅ Complete signup → email verification → login flow
- ✅ Complete forgot password → reset password → login flow
- ✅ Complete login → 2FA setup → 2FA login flow
- ✅ Complete OAuth2 login flow

**Tools:**
- Use MSW (Mock Service Worker) for API mocking
- Use React Testing Library for component testing
- Use Vitest for test runner

---

### 4.2 Add Accessibility Tests

#### Task 4.2.1: Add a11y tests to all page components
**Effort:** 6 hours  
**Priority:** P2

**Test Cases:**
- ✅ ARIA labels present
- ✅ Keyboard navigation works
- ✅ Focus management
- ✅ Screen reader compatibility

**Tools:**
- `@testing-library/jest-dom` for accessibility queries
- `jest-axe` for automated a11y testing

---

### 4.3 Set Up Coverage Reporting

#### Task 4.3.1: Configure coverage reporting
**Effort:** 2 hours  
**Priority:** P2

**Actions:**
1. Configure Vitest coverage
2. Set coverage thresholds (80% minimum)
3. Generate coverage reports
4. Add coverage badge to README

**Configuration:**
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '**/*.test.ts',
        '**/*.test.tsx',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
```

---

### 4.4 Add Test Data Factories

#### Task 4.4.1: Create test data factories
**Effort:** 3 hours  
**Priority:** P2

**Create factories for:**
- User objects
- Login requests
- Signup requests
- API responses
- Error objects

**Example:**
```typescript
// test/factories/user.factory.ts
export const createMockUser = (overrides?: Partial<User>): User => ({
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  ...overrides,
});

export const createMockLoginRequest = (overrides?: Partial<LoginRequest>): LoginRequest => ({
  usernameOrEmail: 'testuser',
  password: 'Password123!',
  ...overrides,
});
```

---

## Implementation Checklist

### Phase 1 (Week 1) - Critical Fixes
- [ ] Task 1.1.1: Add `loginWithOAuth2` test
- [ ] Task 1.1.2: Add `getBackupCodes` test
- [ ] Task 1.1.3: Add `handleOAuth2Callback` test
- [ ] Task 1.2.1: Add error handling tests to store
- [ ] Task 1.2.2: Add error handling tests to service
- [ ] Task 1.3.1: Add loading state tests to store
- [ ] Task 1.3.2: Add loading state tests to pages
- [ ] Task 1.4.1: Add navigation tests to all pages
- [ ] Task 1.5.1: Fix OAuth2 callback test

### Phase 2 (Week 2) - High Priority
- [ ] Task 2.1.1: Add validation tests to SignupPage
- [ ] Task 2.1.2: Add validation tests to other forms
- [ ] Task 2.2.1: Add toast notification tests
- [ ] Task 2.3.1: Add error message verification
- [ ] Task 2.4.1: Add token expiration tests
- [ ] Task 2.4.2: Add concurrent operation tests

### Phase 3 (Week 3) - Medium Priority
- [ ] Task 3.1.1: Expand 2FA tests in LoginPage
- [ ] Task 3.1.2: Expand 2FA tests in TwoFactorRecoveryPage
- [ ] Task 3.1.3: Expand 2FA tests in TwoFactorSetupPage
- [ ] Task 3.2.1: Add localStorage edge case tests
- [ ] Task 3.3.1: Add queryClient tests
- [ ] Task 3.4.1: Add test documentation

### Phase 4 (Week 4+) - Long-term
- [ ] Task 4.1.1: Create integration test suite
- [ ] Task 4.2.1: Add accessibility tests
- [ ] Task 4.3.1: Set up coverage reporting
- [ ] Task 4.4.1: Create test data factories

---

## Success Criteria

### Phase 1 Complete When:
- ✅ All missing method tests added
- ✅ Error handling tests cover all error types
- ✅ Loading state tests verify state transitions
- ✅ Navigation tests verify all redirects
- ✅ OAuth2 callback test matches implementation

### Phase 2 Complete When:
- ✅ Form validation tests cover all fields
- ✅ Toast notifications verified in all tests
- ✅ Error messages verified in all tests
- ✅ Edge cases covered (expired tokens, etc.)
- ✅ Concurrent operations handled correctly

### Phase 3 Complete When:
- ✅ 2FA error scenarios fully tested
- ✅ localStorage edge cases covered
- ✅ Query client interactions verified
- ✅ Tests have documentation

### Phase 4 Complete When:
- ✅ Integration tests cover main user flows
- ✅ Accessibility tests pass
- ✅ Coverage reports show 85%+ coverage
- ✅ Test data factories in use

---

## Estimated Timeline

| Phase | Duration | Effort (Hours) |
|-------|----------|----------------|
| Phase 1 | Week 1 | 20 hours |
| Phase 2 | Week 2 | 16 hours |
| Phase 3 | Week 3 | 11 hours |
| Phase 4 | Week 4+ | 19 hours |
| **Total** | **4 weeks** | **66 hours** |

---

## Notes

1. **Prioritization:** Focus on Phase 1 first as these are critical gaps
2. **Testing:** Run tests after each task to ensure no regressions
3. **Code Review:** Have tests reviewed before merging
4. **Documentation:** Update test documentation as you go
5. **Coverage:** Aim for 85%+ coverage, but prioritize quality over quantity

---

**Created:** 2025-12-23  
**Last Updated:** 2025-12-23  
**Status:** Ready for Implementation

