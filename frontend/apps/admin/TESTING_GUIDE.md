# Frontend Testing Guide - Admin App (Angular)

> 📚 **First time writing Angular tests?** This guide explains everything from basics to advanced patterns for testing Angular applications with Vitest.

---

## Table of Contents
1. [How Testing Works](#how-testing-works)
2. [File Structure](#file-structure)
3. [Vitest Syntax Basics](#vitest-syntax-basics)
4. [Angular Testing Fundamentals](#angular-testing-fundamentals)
5. [Testing Patterns](#testing-patterns)
6. [Running Tests](#running-tests)

---

## How Testing Works

```
┌─────────────────────────────────────────────────────────────┐
│                  TEST FLOW                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. npm run test:admin                                      │
│         ↓                                                   │
│  2. Vitest reads vite.config.ts                             │
│         ↓                                                   │
│  3. Runs test-setup.ts (initializes Angular TestBed)        │
│         ↓                                                   │
│  4. Finds all *.spec.ts files                               │
│         ↓                                                   │
│  5. Runs each test in jsdom (fake browser)                  │
│         ↓                                                   │
│  6. Reports pass/fail                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Key Files Connection

```
vite.config.ts          ← Test configuration (environment, setup file)
       ↓
src/test-setup.ts      ← Runs BEFORE each test (Angular TestBed init, cleanup)
       ↓
*.spec.ts files         ← Your actual tests
```

---

## File Structure

```
apps/admin/
├── vite.config.ts              # Has "test" config section
├── TESTING_GUIDE.md            # This file
└── src/
    ├── test-setup.ts           # Global setup (runs before tests)
    └── app/
        ├── core/
        │   ├── services/
        │   │   ├── auth.service.ts          # Source code
        │   │   └── auth.service.spec.ts     # Tests (same folder!)
        │   ├── guards/
        │   │   ├── auth.guard.ts
        │   │   └── auth.guard.spec.ts
        │   └── interceptors/
        │       ├── auth.interceptor.ts
        │       └── auth.interceptor.spec.ts
        └── features/
            └── auth/
                └── login/
                    ├── login.component.ts
                    └── login.component.spec.ts
```

> **Rule**: Test file goes next to the source file with `.spec.ts` suffix (Angular convention)

---

## Vitest Syntax Basics

### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('GroupName', () => {           // Group related tests
  beforeEach(() => {
    // Setup before each test
  });

  it('should do something', () => {      // Single test case
    // Arrange (setup)
    const input = 5;
    
    // Act (do the thing)
    const result = input * 2;
    
    // Assert (check result)
    expect(result).toBe(10);
  });

  afterEach(() => {
    // Cleanup after each test
  });
});
```

### Common Assertions

```typescript
// Equality
expect(value).toBe(5);              // Exact match (===)
expect(value).toEqual({ a: 1 });    // Deep equality for objects

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeDefined();
expect(value).toBeUndefined();

// Arrays
expect(array).toContain('item');
expect(array).toHaveLength(3);

// Strings
expect(string).toMatch(/regex/);
expect(string).toContain('substring');

// Async
await expect(promise).resolves.toBe('value');
await expect(promise).rejects.toThrow('error');
await expect(promise).rejects.toThrowError(ErrorClass);
```

### Setup & Teardown

```typescript
import { describe, it, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';

describe('MyTests', () => {
  beforeAll(() => {
    // Runs ONCE before all tests
    // Use for expensive setup
  });

  beforeEach(() => {
    // Runs BEFORE each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Runs AFTER each test
    // Cleanup resources
  });

  afterAll(() => {
    // Runs ONCE after all tests
  });

  it('test 1', () => { /* ... */ });
  it('test 2', () => { /* ... */ });
});
```

---

## Angular Testing Fundamentals

### What is TestBed?

**TestBed** is Angular's testing utility that creates a "mini Angular app" for testing.

```
┌─────────────────────────────────────────────────────────────┐
│                    TestBed                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TestBed.configureTestingModule({                           │
│    imports: [HttpClientTestingModule],                      │
│    providers: [AuthService, { provide: Router, ... }]       │
│  });                                                        │
│                                                             │
│  ↓ Creates isolated Angular environment                      │
│                                                             │
│  const service = TestBed.inject(AuthService);               │
│  // Now you have a service instance to test                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Basic TestBed Setup

```typescript
import { TestBed } from '@angular/core/testing';

describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    // 1. Reset TestBed before each test
    TestBed.resetTestingModule();
    
    // 2. Configure testing module
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],  // For HTTP testing
      providers: [
        MyService,                        // Service to test
        { provide: Router, useValue: mockRouter },  // Mock dependencies
      ],
    });

    // 3. Get service instance
    service = TestBed.inject(MyService);
  });

  afterEach(() => {
    // Cleanup
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
```

### Dependency Injection in Tests

```typescript
// Real service
TestBed.configureTestingModule({
  providers: [AuthService],
});

// Mock service
const mockRouter = {
  navigate: vi.fn(),
};

TestBed.configureTestingModule({
  providers: [
    { provide: Router, useValue: mockRouter },  // Use mock
  ],
});

// Get injected service
const router = TestBed.inject(Router);
expect(router.navigate).toBeDefined();
```

---

## Testing Patterns

### Pattern 1: Testing Service with HTTP

```typescript
// auth.service.spec.ts
import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;  // Controls HTTP requests

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],  // Mock HTTP client
      providers: [
        AuthService,
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();  // Ensure no unexpected requests
    localStorage.clear();
  });

  it('should login successfully', async () => {
    // Arrange: Prepare mock response
    const mockResponse = {
      accessToken: 'token123',
      user: { id: 1, username: 'admin' },
    };

    // Act: Call service method
    const loginPromise = service.login({
      usernameOrEmail: 'admin',
      password: 'password',
    }).toPromise();

    // Assert: Check HTTP request was made
    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      usernameOrEmail: 'admin',
      password: 'password',
    });

    // Simulate server response
    req.flush(mockResponse);

    // Wait for promise and verify result
    const result = await loginPromise;
    expect(result.accessToken).toBe('token123');
  });

  it('should handle login error', async () => {
    // Act
    const loginPromise = service.login({
      usernameOrEmail: 'admin',
      password: 'wrong',
    }).toPromise();

    // Simulate error response
    const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
    req.flush(
      { message: 'Invalid credentials' },
      { status: 401, statusText: 'Unauthorized' }
    );

    // Assert: Should throw error
    await expect(loginPromise).rejects.toThrow();
  });
});
```

### Pattern 2: Testing Component

```typescript
// login.component.spec.ts
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';
import { of, throwError } from 'rxjs';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let mockAuthService: {
    isLoading: () => boolean;
    error: () => string | null;
    login: ReturnType<typeof vi.fn>;
    clearError: ReturnType<typeof vi.fn>;
  };
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    // Create mocks
    mockAuthService = {
      isLoading: vi.fn(() => false),
      error: vi.fn(() => null),
      login: vi.fn(),
      clearError: vi.fn(),
    };

    mockRouter = {
      navigate: vi.fn(),
    };

    // Configure TestBed
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [
        FormBuilder,
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    });

    // Create component instance manually (bypassing template)
    component = Object.create(LoginComponent.prototype);
    (component as any).fb = TestBed.inject(FormBuilder);
    (component as any).authService = mockAuthService;
    (component as any).router = mockRouter;
    
    // Initialize component
    component.ngOnInit();
  });

  it('should initialize form with empty values', () => {
    expect(component.loginForm.get('usernameOrEmail')?.value).toBe('');
    expect(component.loginForm.get('password')?.value).toBe('');
  });

  it('should call authService.login on valid submit', () => {
    // Arrange: Set form values
    component.loginForm.patchValue({
      usernameOrEmail: 'admin@example.com',
      password: 'password123',
    });

    // Arrange: Mock successful login
    mockAuthService.login.mockReturnValue(of({ accessToken: 'token' }));

    // Act: Submit form
    component.onSubmit();

    // Assert: Verify login was called
    expect(mockAuthService.clearError).toHaveBeenCalled();
    expect(mockAuthService.login).toHaveBeenCalledWith({
      usernameOrEmail: 'admin@example.com',
      password: 'password123',
    });
  });

  it('should not submit when form is invalid', () => {
    // Form is empty (invalid)
    component.onSubmit();

    // Should not call login
    expect(mockAuthService.login).not.toHaveBeenCalled();
  });
});
```

### Pattern 3: Testing Guard

```typescript
// auth.guard.spec.ts
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
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

  it('should return true when authenticated', () => {
    // Arrange
    mockAuthService.isAuthenticated.mockReturnValue(true);

    // Act
    const result = TestBed.runInInjectionContext(() => authGuard());

    // Assert
    expect(result).toBe(true);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should redirect to login when not authenticated', () => {
    // Arrange
    mockAuthService.isAuthenticated.mockReturnValue(false);

    // Act
    const result = TestBed.runInInjectionContext(() => authGuard());

    // Assert
    expect(result).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
  });
});
```

### Pattern 4: Testing Interceptor

```typescript
// auth.interceptor.spec.ts
import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(withInterceptors([authInterceptor])),  // Add interceptor
        provideHttpClientTesting(),
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should add Authorization header for non-auth endpoints', () => {
    // Arrange: Set token
    const token = 'test-token';
    localStorage.setItem('admin_auth_token', token);

    // Act: Make request
    httpClient.get('/api/users').subscribe();

    // Assert: Check header was added
    const req = httpMock.expectOne('/api/users');
    expect(req.request.headers.has('Authorization')).toBe(true);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    req.flush({});
  });

  it('should not add Authorization header for auth endpoints', () => {
    // Arrange
    localStorage.setItem('admin_auth_token', 'token');

    // Act
    httpClient.post('/auth/login', {}).subscribe();

    // Assert: No auth header for login
    const req = httpMock.expectOne('/auth/login');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });
});
```

---

## Mocking Explained

### What is Mocking?

**Problem**: Your code calls APIs, uses Router, localStorage, etc. Tests shouldn't make real API calls or navigate!

**Solution**: Replace real dependencies with "fake" versions that you control.

### How to Mock with Vitest

```typescript
import { vi } from 'vitest';

// 1. Create a mock function
const mockFn = vi.fn();

// 2. Control what it returns
mockFn.mockReturnValue('hello');
mockFn.mockResolvedValue({ data: 'success' });  // For Promises
mockFn.mockRejectedValue(new Error('Failed!'));  // For errors

// 3. Use in TestBed
TestBed.configureTestingModule({
  providers: [
    { provide: Router, useValue: { navigate: mockFn } },
  ],
});

// 4. Verify it was called
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith(['/dashboard']);
```

### Common Mock Patterns

```typescript
// Return a value immediately
const mockFn = vi.fn().mockReturnValue('hello');

// Return a Promise that resolves
const mockFn = vi.fn().mockResolvedValue({ data: 'success' });

// Return a Promise that rejects
const mockFn = vi.fn().mockRejectedValue(new Error('Failed!'));

// Different return on each call
const mockFn = vi.fn()
  .mockReturnValueOnce('first')
  .mockReturnValueOnce('second');

// Check how many times called
expect(mockFn).toHaveBeenCalledTimes(2);
expect(mockFn).toHaveBeenCalledWith('expected-arg');
```

### Mocking Router

```typescript
const mockRouter = {
  navigate: vi.fn(),
  navigateByUrl: vi.fn(),
  url: '/current/path',
};

TestBed.configureTestingModule({
  providers: [
    { provide: Router, useValue: mockRouter },
  ],
});

// Later in test
expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
```

### Mocking localStorage

```typescript
// In beforeEach
localStorage.clear();

// Set value
localStorage.setItem('admin_auth_token', 'test-token');

// Get value
const token = localStorage.getItem('admin_auth_token');

// Clear in afterEach
afterEach(() => {
  localStorage.clear();
});
```

---

## HttpTestingController Deep Dive

### What is HttpTestingController?

`HttpTestingController` lets you control HTTP requests in tests without making real network calls.

```
┌─────────────────────────────────────────────────────────────┐
│  Your Test                                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  service.login().subscribe();                               │
│      ↓                                                       │
│  httpMock.expectOne('/auth/login')  ← Intercepts request    │
│      ↓                                                       │
│  req.flush(mockResponse)  ← Simulates server response       │
│      ↓                                                       │
│  Your code receives the response                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Common Patterns

```typescript
// 1. Expect a specific request
const req = httpMock.expectOne('/api/users');
expect(req.request.method).toBe('GET');
expect(req.request.headers.get('Authorization')).toBe('Bearer token');
req.flush({ data: [] });

// 2. Expect multiple requests
const req1 = httpMock.expectOne('/api/users');
const req2 = httpMock.expectOne('/api/posts');
req1.flush({});
req2.flush({});

// 3. Expect no requests
httpMock.expectNone('/api/users');

// 4. Simulate error response
const req = httpMock.expectOne('/api/users');
req.flush(
  { message: 'Error' },
  { status: 500, statusText: 'Server Error' }
);

// 5. Verify no unexpected requests (in afterEach)
afterEach(() => {
  httpMock.verify();  // Throws if unexpected requests exist
});
```

---

## Best Practices

### ✅ Do

```typescript
// 1. Clear descriptive test names
it('should return user when authenticated', () => { ... });
it('should redirect to login when not authenticated', () => { ... });

// 2. One assertion per test (when possible)
it('should set token in localStorage', () => {
  expect(localStorage.getItem('admin_auth_token')).toBe('token');
});

// 3. Use beforeEach for common setup
beforeEach(() => {
  localStorage.clear();
  TestBed.configureTestingModule({ ... });
});

// 4. Clean up in afterEach
afterEach(() => {
  httpMock.verify();
  localStorage.clear();
  vi.clearAllMocks();
});

// 5. Test both success and error cases
it('should handle login success', () => { ... });
it('should handle login error', () => { ... });
```

### ❌ Don't

```typescript
// 1. Don't test multiple things in one test
it('should do everything', () => {
  // 100 lines testing login, logout, refresh, etc.
});

// 2. Don't depend on test order
it('step1', () => { /* sets up data */ });
it('step2', () => { /* uses data from step1 - BAD! */ });

// 3. Don't forget to verify HTTP requests
service.login();
// Missing: httpMock.expectOne(...)

// 4. Don't use real services when you can mock
TestBed.configureTestingModule({
  providers: [RealEmailService],  // BAD - sends real emails!
});

// 5. Don't forget to reset TestBed
beforeEach(() => {
  // Missing: TestBed.resetTestingModule();
  TestBed.configureTestingModule({ ... });
});
```

---

## Running Tests

```bash
cd frontend

# Run all admin tests once
npm run test:admin

# Watch mode (reruns on file save)
npm run test:admin:watch

# With coverage report
npm run test:admin:coverage

# Run specific file
npm run test:admin -- auth.service

# Run tests matching name
npm run test:admin -- -t "should login"

# Verbose output
npm run test:admin -- --reporter=verbose

# Run in UI mode
npm run test:admin -- --ui
```

---

## Quick Reference

### Vitest

| What | How |
|------|-----|
| Create fake function | `vi.fn()` |
| Set return value | `.mockReturnValue(x)` |
| Set async return | `.mockResolvedValue(x)` |
| Set async error | `.mockRejectedValue(error)` |
| Check called | `expect(fn).toHaveBeenCalled()` |
| Check called with | `expect(fn).toHaveBeenCalledWith(x)` |
| Clear all mocks | `vi.clearAllMocks()` |

### Angular Testing

| What | How |
|------|-----|
| Configure test module | `TestBed.configureTestingModule({ ... })` |
| Get service | `TestBed.inject(ServiceClass)` |
| Reset module | `TestBed.resetTestingModule()` |
| Run in context | `TestBed.runInInjectionContext(() => guard())` |
| HTTP testing module | `HttpClientTestingModule` |
| HTTP mock controller | `HttpTestingController` |
| Expect HTTP request | `httpMock.expectOne(url)` |
| Simulate response | `req.flush(data)` |
| Simulate error | `req.flush(error, { status: 500 })` |

### Common Assertions

| What | How |
|------|-----|
| Exact match | `expect(x).toBe(y)` |
| Deep equality | `expect(x).toEqual(y)` |
| Truthy | `expect(x).toBeTruthy()` |
| Null | `expect(x).toBeNull()` |
| Defined | `expect(x).toBeDefined()` |
| Contains | `expect(array).toContain(item)` |
| Length | `expect(array).toHaveLength(3)` |
| Throws | `expect(() => fn()).toThrow()` |
| Async resolves | `await expect(promise).resolves.toBe(x)` |
| Async rejects | `await expect(promise).rejects.toThrow()` |

---

## Common Issues & Solutions

### Issue: "TestBed is not initialized"

**Solution**: Make sure `test-setup.ts` runs before tests. Check `vite.config.ts` has:
```typescript
test: {
  setupFiles: ['./src/test-setup.ts'],
}
```

### Issue: "Cannot read property of undefined"

**Solution**: Make sure you inject the service:
```typescript
service = TestBed.inject(AuthService);  // Don't forget this!
```

### Issue: "Unexpected HTTP request"

**Solution**: Use `httpMock.verify()` in `afterEach`:
```typescript
afterEach(() => {
  httpMock.verify();  // Catches unexpected requests
});
```

### Issue: "localStorage persists between tests"

**Solution**: Clear in `beforeEach` and `afterEach`:
```typescript
beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});
```

### Issue: "Mock not working"

**Solution**: Make sure you create the mock before using it:
```typescript
const mockRouter = { navigate: vi.fn() };  // Create first

TestBed.configureTestingModule({
  providers: [
    { provide: Router, useValue: mockRouter },  // Then use
  ],
});
```

---

## Need Help?

- [Vitest Docs](https://vitest.dev/)
- [Angular Testing Guide](https://angular.io/guide/testing)
- [Angular Testing Utilities](https://angular.io/api/core/testing/TestBed)
- Look at existing test files in this project:
  - `src/app/core/services/auth.service.spec.ts`
  - `src/app/core/guards/auth.guard.spec.ts`
  - `src/app/features/auth/login/login.component.spec.ts`

---

## Example: Complete Test File

Here's a complete example combining all concepts:

```typescript
import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { AUTH_ENDPOINTS } from '@edumind/shared-utils';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;

  // Helper function
  const createValidToken = (): string => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(
      JSON.stringify({
        sub: '1',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    );
    return `${header}.${payload}.signature`;
  };

  beforeEach(() => {
    // Setup
    localStorage.clear();

    const mockRouter = {
      navigate: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: Router, useValue: mockRouter },
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    // Cleanup
    httpMock.verify();
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should call login endpoint with credentials', async () => {
      // Arrange
      const credentials = {
        usernameOrEmail: 'admin',
        password: 'password123',
      };
      const mockResponse = {
        accessToken: createValidToken(),
        user: { id: 1, username: 'admin' },
      };

      // Act
      const loginPromise = service.login(credentials).toPromise();

      // Assert - Check request
      const req = httpMock.expectOne(
        `${environment.apiUrl}${AUTH_ENDPOINTS.LOGIN}`
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(credentials);
      expect(req.request.withCredentials).toBe(true);

      // Simulate response
      req.flush(mockResponse);

      // Wait and verify result
      const result = await loginPromise;
      expect(result.accessToken).toBe(mockResponse.accessToken);
    });

    it('should handle login error', async () => {
      // Arrange
      const credentials = {
        usernameOrEmail: 'admin',
        password: 'wrong',
      };

      // Act
      const loginPromise = service.login(credentials).toPromise();

      // Simulate error
      const req = httpMock.expectOne(
        `${environment.apiUrl}${AUTH_ENDPOINTS.LOGIN}`
      );
      req.flush(
        { message: 'Invalid credentials' },
        { status: 401, statusText: 'Unauthorized' }
      );

      // Assert
      await expect(loginPromise).rejects.toThrow();
      expect(service.error()).toContain('Invalid');
    });
  });
});
```

---

Happy Testing! 🧪✨

