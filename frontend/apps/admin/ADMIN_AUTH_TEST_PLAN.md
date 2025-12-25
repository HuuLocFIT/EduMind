# Admin App - Authentication Features Unit Test Plan

## Overview
This document outlines the comprehensive unit testing plan for authentication features in the Admin Angular application. The plan is structured in phases to ensure systematic coverage of all auth-related components, services, guards, and interceptors.

## Testing Framework Setup

### Framework Choice
- **Framework**: Vitest (consistent with user app)
- **Angular Testing Utilities**: `@angular/core/testing` (TestBed, ComponentFixture)
- **HTTP Testing**: `@angular/common/http/testing` (HttpTestingController)
- **Router Testing**: `@angular/router/testing` (RouterTestingModule)

### Prerequisites
- Angular 20.3.0+
- Vitest 3.0.0+
- Familiarity with Angular testing patterns (TestBed, dependency injection, component testing)

## Files to Test

### Phase 1: Core Service Tests
1. **`src/app/core/services/auth.service.spec.ts`**
   - Location: `frontend/apps/admin/src/app/core/services/`
   - Purpose: Test authentication service logic, token management, user state

### Phase 2: Guard Tests
2. **`src/app/core/guards/auth.guard.spec.ts`**
   - Location: `frontend/apps/admin/src/app/core/guards/`
   - Purpose: Test route protection for authenticated users

3. **`src/app/core/guards/guest.guard.spec.ts`**
   - Location: `frontend/apps/admin/src/app/core/guards/`
   - Purpose: Test route protection for unauthenticated users (login page)

### Phase 3: Interceptor Tests
4. **`src/app/core/interceptors/auth.interceptor.spec.ts`**
   - Location: `frontend/apps/admin/src/app/core/interceptors/`
   - Purpose: Test HTTP request interception, token injection, refresh token logic

### Phase 4: Component Tests
5. **`src/app/features/auth/login/login.component.spec.ts`**
   - Location: `frontend/apps/admin/src/app/features/auth/login/`
   - Purpose: Test login form component, validation, submission, error handling

---

## Phase 1: Auth Service Tests (`auth.service.spec.ts`)

### Test Structure
```typescript
describe('AuthService', () => {
  // Setup, mocks, and test suites
});
```

### Test Cases

#### 1.1 Service Initialization
- ✅ Should be created successfully
- ✅ Should initialize with null user if no stored user
- ✅ Should initialize with stored user from localStorage
- ✅ Should initialize currentUser$ observable

#### 1.2 Login Method
- ✅ Should call login endpoint with correct credentials
- ✅ Should set withCredentials: true for cookie support
- ✅ Should set isLoading signal to true during login
- ✅ Should set isLoading signal to false after login (success)
- ✅ Should set isLoading signal to false after login (error)
- ✅ Should store access token in localStorage on success
- ✅ Should store user in localStorage on success
- ✅ Should update currentUserSubject on success
- ✅ Should emit user via currentUser$ observable
- ✅ Should validate admin role and throw error if not admin
- ✅ Should handle 401 Unauthorized error
- ✅ Should handle 403 Forbidden error (non-admin user)
- ✅ Should handle 404 Not Found error
- ✅ Should handle 500 Server Error
- ✅ Should handle network errors
- ✅ Should clear error signal on new login attempt
- ✅ Should throw error for invalid response (null/undefined)
- ✅ Should extract and set error message from response

#### 1.3 Refresh Token Method
- ✅ Should call refresh endpoint with empty body
- ✅ Should set withCredentials: true for cookie
- ✅ Should prevent multiple simultaneous refresh attempts
- ✅ Should update access token in localStorage on success
- ✅ Should update user in localStorage if provided
- ✅ Should update currentUserSubject if user provided
- ✅ Should set isRefreshing flag correctly
- ✅ Should handle refresh failure gracefully
- ✅ Should throw error if refresh already in progress

#### 1.4 Logout Method
- ✅ Should call logout endpoint
- ✅ Should set withCredentials: true for cookie
- ✅ Should clear auth data from localStorage
- ✅ Should set currentUserSubject to null
- ✅ Should navigate to login page
- ✅ Should continue logout even if API call fails
- ✅ Should clear all auth-related localStorage items

#### 1.5 Force Logout Method
- ✅ Should clear auth data from localStorage
- ✅ Should set currentUserSubject to null
- ✅ Should navigate to login page
- ✅ Should not call logout API endpoint

#### 1.6 Token Management
- ✅ `getToken()` should return token from localStorage
- ✅ `getToken()` should return null if no token
- ✅ `setToken()` should update token in localStorage
- ✅ `isTokenExpired()` should return true for expired token
- ✅ `isTokenExpired()` should return true for missing token
- ✅ `isTokenExpired()` should return false for valid token
- ✅ `isTokenExpired()` should handle invalid token format

#### 1.7 Authentication Status
- ✅ `isAuthenticated()` should return true when valid token exists
- ✅ `isAuthenticated()` should return false when no token
- ✅ `isAuthenticated()` should return false for expired token
- ✅ `isAuthenticated()` should clear auth data for invalid token
- ✅ `isAuthenticated()` should not clear auth data for expired token (let interceptor handle)

#### 1.8 User Management
- ✅ `getCurrentUser()` should return current user
- ✅ `getCurrentUser()` should return null when not authenticated
- ✅ `currentUser$` should emit user updates
- ✅ Should restore user from localStorage on initialization

#### 1.9 Error Handling
- ✅ `clearError()` should clear error signal
- ✅ Should extract error message from HttpErrorResponse
- ✅ Should extract error message from ErrorEvent
- ✅ Should use status-specific error messages
- ✅ Should fallback to statusText if no message
- ✅ Should handle unknown error status codes

#### 1.10 Token Decoding
- ✅ Should decode valid JWT token
- ✅ Should throw error for invalid token format
- ✅ Should handle malformed token gracefully

#### 1.11 Admin Role Validation
- ✅ Should accept user with ADMIN role
- ✅ Should reject user with STUDENT role
- ✅ Should reject user with TEACHER role
- ✅ Should reject user with no roles
- ✅ Should use getPrimaryRole helper correctly

#### 1.12 localStorage Edge Cases
- ✅ Should handle localStorage quota exceeded
- ✅ Should handle localStorage disabled
- ✅ Should handle malformed JSON in localStorage
- ✅ Should handle null values in localStorage
- ✅ Should handle empty string values

---

## Phase 2: Guard Tests

### 2.1 Auth Guard (`auth.guard.spec.ts`)

#### Test Cases
- ✅ Should return true when user is authenticated
- ✅ Should return false when user is not authenticated
- ✅ Should navigate to login page when not authenticated
- ✅ Should not navigate when already on login page
- ✅ Should use AuthService.isAuthenticated() correctly
- ✅ Should handle AuthService injection correctly
- ✅ Should handle Router injection correctly

### 2.2 Guest Guard (`guest.guard.spec.ts`)

#### Test Cases
- ✅ Should return true when user is not authenticated
- ✅ Should return false when user is authenticated
- ✅ Should navigate to dashboard when authenticated
- ✅ Should not navigate when already on dashboard
- ✅ Should use AuthService.isAuthenticated() correctly
- ✅ Should handle AuthService injection correctly
- ✅ Should handle Router injection correctly

---

## Phase 3: Auth Interceptor Tests (`auth.interceptor.spec.ts`)

### Test Structure
```typescript
describe('authInterceptor', () => {
  // HTTP testing setup with HttpTestingController
});
```

### Test Cases

#### 3.1 Request Interception
- ✅ Should add Authorization header for non-auth endpoints
- ✅ Should not add Authorization header for login endpoint
- ✅ Should not add Authorization header for register endpoint
- ✅ Should not add Authorization header for refresh endpoint
- ✅ Should include Bearer token in Authorization header
- ✅ Should set withCredentials: true for all requests
- ✅ Should clone request correctly without mutating original

#### 3.2 Response Transformation
- ✅ Should unwrap API response using unwrapApiResponse helper
- ✅ Should return original response if no unwrapping needed
- ✅ Should handle HttpResponse events correctly
- ✅ Should handle non-HttpResponse events correctly

#### 3.3 Token Refresh on 401
- ✅ Should attempt token refresh on 401 error
- ✅ Should retry original request with new token after refresh
- ✅ Should not refresh token for auth endpoints (login, register, refresh)
- ✅ Should handle concurrent 401 errors (queue requests)
- ✅ Should use refreshTokenSubject for queued requests
- ✅ Should prevent multiple simultaneous refresh attempts
- ✅ Should force logout if refresh fails
- ✅ Should propagate refresh error if refresh fails
- ✅ Should update request with new token after refresh
- ✅ Should transform retried request response correctly

#### 3.4 Error Handling
- ✅ Should propagate non-401 errors without refresh attempt
- ✅ Should handle network errors
- ✅ Should handle timeout errors
- ✅ Should handle malformed responses

#### 3.5 Multiple Concurrent Requests
- ✅ Should queue multiple requests during refresh
- ✅ Should retry all queued requests with new token
- ✅ Should handle refresh failure for queued requests
- ✅ Should not deadlock on concurrent refresh attempts

---

## Phase 4: Login Component Tests (`login.component.spec.ts`)

### Test Structure
```typescript
describe('LoginComponent', () => {
  // Component testing with TestBed
});
```

### Test Cases

#### 4.1 Component Initialization
- ✅ Should create component successfully
- ✅ Should initialize form with empty values
- ✅ Should set showPassword signal to false
- ✅ Should set successMessage signal to empty string
- ✅ Should have required validators on usernameOrEmail
- ✅ Should have minLength(3) validator on usernameOrEmail
- ✅ Should have required validator on password
- ✅ Should have minLength(6) validator on password

#### 4.2 Form Validation
- ✅ Should mark form as invalid when empty
- ✅ Should mark form as valid with correct inputs
- ✅ Should show error for empty usernameOrEmail
- ✅ Should show error for usernameOrEmail less than 3 characters
- ✅ Should show error for empty password
- ✅ Should show error for password less than 6 characters
- ✅ Should mark all fields as touched on invalid submit
- ✅ Should not submit when form is invalid

#### 4.3 Password Visibility Toggle
- ✅ Should toggle showPassword signal
- ✅ Should change input type from password to text
- ✅ Should change input type from text to password
- ✅ Should prevent default on mousedown event

#### 4.4 Form Submission
- ✅ Should call authService.login with form values
- ✅ Should clear error before submission
- ✅ Should set success message on successful login
- ✅ Should navigate to dashboard on successful login
- ✅ Should navigate after 1 second delay
- ✅ Should handle login error
- ✅ Should not navigate on login error
- ✅ Should not set success message on error

#### 4.5 Loading State
- ✅ Should show loading state from authService.isLoading
- ✅ Should disable submit button when loading
- ✅ Should disable submit button when form invalid
- ✅ Should show "Signing in..." text when loading
- ✅ Should show "Sign in" text when not loading

#### 4.6 Error Display
- ✅ Should display error from authService.error
- ✅ Should show error alert when error exists
- ✅ Should hide error alert when no error
- ✅ Should call clearError on error alert close
- ✅ Should handle error dismissal

#### 4.7 Success Message
- ✅ Should display success message when set
- ✅ Should show success alert when message exists
- ✅ Should hide success alert when message empty
- ✅ Should close success message on dismiss
- ✅ Should clear success message after navigation

#### 4.8 Field Error Messages
- ✅ `getFieldError()` should return empty string for untouched field
- ✅ `getFieldError()` should return empty string when no errors
- ✅ `getFieldError()` should return required error for usernameOrEmail
- ✅ `getFieldError()` should return required error for password
- ✅ `getFieldError()` should return minLength error for usernameOrEmail
- ✅ `getFieldError()` should return minLength error for password
- ✅ Should display field errors in template

#### 4.9 Component Lifecycle
- ✅ Should initialize form in ngOnInit
- ✅ Should clean up subscriptions on destroy (if any)

#### 4.10 Integration with AuthService
- ✅ Should use injected AuthService correctly
- ✅ Should use injected Router correctly
- ✅ Should use injected FormBuilder correctly
- ✅ Should handle AuthService observable updates

---

## Test Implementation Details

### Mocking Strategy

#### For AuthService Tests
- Mock `HttpClient` using `HttpTestingController`
- Mock `Router` with `RouterTestingModule` or spy
- Mock `localStorage` (use jsdom or manual mock)
- Mock environment variables

#### For Guard Tests
- Mock `AuthService` with spy object
- Mock `Router` with `RouterTestingModule`
- Use `TestBed` for functional guard testing

#### For Interceptor Tests
- Use `HttpTestingController` for HTTP mocking
- Mock `AuthService` methods
- Test with real HTTP client in TestBed

#### For Component Tests
- Mock `AuthService` with spy object
- Mock `Router` with `RouterTestingModule`
- Use `ReactiveFormsModule` for form testing
- Mock UI components from `@edumind/admin-ui`

### Test Data

#### Mock Users
```typescript
const mockAdminUser = {
  id: 1,
  username: 'admin',
  email: 'admin@example.com',
  roles: [UserRole.ADMIN],
  firstName: 'Admin',
  lastName: 'User'
};

const mockNonAdminUser = {
  id: 2,
  username: 'student',
  email: 'student@example.com',
  roles: [UserRole.STUDENT],
};
```

#### Mock JWT Tokens
```typescript
// Valid token (not expired)
const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjk5OTk5OTk5OTl9.signature';

// Expired token
const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDAwMDB9.signature';
```

#### Mock API Responses
```typescript
const mockLoginResponse: JwtResponse = {
  accessToken: validToken,
  user: mockAdminUser
};

const mockRefreshResponse: RefreshTokenResponse = {
  accessToken: 'new-token',
  user: mockAdminUser
};
```

### Test Utilities

Create helper functions in test files:
- `createMockUser(overrides?)` - Create mock user with optional overrides
- `createMockToken(expired?)` - Create mock JWT token
- `createMockHttpError(status, message?)` - Create HttpErrorResponse
- `setupTestBed()` - Common TestBed configuration

---

## File Structure

```
frontend/apps/admin/src/app/
├── core/
│   ├── services/
│   │   └── auth.service.spec.ts          [Phase 1]
│   ├── guards/
│   │   ├── auth.guard.spec.ts            [Phase 2]
│   │   └── guest.guard.spec.ts          [Phase 2]
│   └── interceptors/
│       └── auth.interceptor.spec.ts      [Phase 3]
└── features/
    └── auth/
        └── login/
            └── login.component.spec.ts   [Phase 4]
```

---

## Testing Commands

### Setup Commands
```bash
# Install dependencies (if needed)
npm install

# Run all admin tests
nx test admin

# Run specific test file
nx test admin --testFile=auth.service.spec.ts

# Run tests in watch mode
nx test admin --watch

# Run tests with coverage
nx test admin --coverage
```

### Expected Test Coverage Goals
- **AuthService**: ≥ 90% coverage
- **Guards**: 100% coverage (simple logic)
- **Interceptor**: ≥ 85% coverage
- **LoginComponent**: ≥ 80% coverage

---

## Implementation Order

### Recommended Sequence
1. **Phase 1** - AuthService (foundation for other tests)
2. **Phase 2** - Guards (depend on AuthService)
3. **Phase 3** - Interceptor (depends on AuthService)
4. **Phase 4** - LoginComponent (depends on AuthService, uses guards)

### Dependencies Between Phases
```
Phase 1 (AuthService)
  ├── Phase 2 (Guards) ──────┐
  ├── Phase 3 (Interceptor) ──┤
  └── Phase 4 (Component) ────┘
```

---

## Notes for Angular Testing

### Key Angular Testing Concepts
1. **TestBed**: Angular's testing utility for configuring testing module
2. **ComponentFixture**: Wrapper around component instance for testing
3. **HttpTestingController**: Mock HTTP backend for testing HTTP calls
4. **RouterTestingModule**: Provides router for testing without navigation
5. **ReactiveFormsModule**: Required for testing reactive forms
6. **Signals**: Use `signal()` and `effect()` testing patterns for Angular signals

### Common Patterns
- Use `TestBed.configureTestingModule()` to set up test environment
- Use `fixture.detectChanges()` to trigger change detection
- Use `HttpTestingController.expectOne()` to verify HTTP requests
- Use `spyOn()` for mocking service methods
- Use `fakeAsync()` and `tick()` for testing async operations with timers

---

## Success Criteria

### Phase Completion Checklist
- [ ] All test cases pass
- [ ] Code coverage meets targets
- [ ] No console errors or warnings
- [ ] Tests are maintainable and readable
- [ ] Mocks are properly isolated
- [ ] Edge cases are covered
- [ ] Error scenarios are tested

### Quality Standards
- Each test should be independent
- Tests should be fast (< 100ms each)
- Tests should be deterministic
- Tests should have clear descriptions
- Tests should follow AAA pattern (Arrange, Act, Assert)

---

## Next Steps After Phase 4

After completing all phases, consider:
1. Integration tests for auth flow
2. E2E tests for complete login/logout scenarios
3. Performance tests for token refresh
4. Security tests for token storage
5. Accessibility tests for login form

---

## References

- [Angular Testing Guide](https://angular.io/guide/testing)
- [Vitest Documentation](https://vitest.dev/)
- [Angular HTTP Testing](https://angular.io/guide/http-test-requests)
- [Angular Router Testing](https://angular.io/guide/router-tutorial-toh#testing-navigation)

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-XX  
**Author**: Development Team

