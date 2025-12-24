# Frontend Testing Guide - User App

> 📚 **First time writing frontend tests?** This guide explains everything from basics to advanced patterns.

---

## Table of Contents
1. [How Testing Works](#how-testing-works)
2. [File Structure](#file-structure)
3. [Vitest Syntax Basics](#vitest-syntax-basics)
4. [Mocking Explained](#mocking-explained)
5. [Testing Patterns](#testing-patterns)
6. [Running Tests](#running-tests)

---

## How Testing Works

```
┌─────────────────────────────────────────────────────────────┐
│                     TEST FLOW                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. npm run test:user                                       │
│         ↓                                                   │
│  2. Vitest reads vite.config.ts                             │
│         ↓                                                   │
│  3. Runs setup.ts (mocks browser APIs)                      │
│         ↓                                                   │
│  4. Finds all *.test.ts files                               │
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
src/test/setup.ts       ← Runs BEFORE each test (cleanup, mocks)
       ↓
*.test.ts files         ← Your actual tests
```

---

## File Structure

```
apps/user/
├── vite.config.ts              # Has "test" config section
├── TESTING.md                  # This file
└── src/
    ├── test/
    │   ├── setup.ts            # Global setup (runs before tests)
    │   └── vitest.d.ts         # TypeScript types for test
    └── app/
        ├── stores/
        │   ├── auth.store.ts       # Source code
        │   └── auth.store.test.ts  # Tests (same folder!)
        ├── services/
        │   ├── auth.service.ts
        │   └── auth.service.test.ts
        └── pages/auth/
            ├── LoginPage.tsx
            └── LoginPage.test.tsx
```

> **Rule**: Test file goes next to the source file with `.test.ts` suffix

---

## Vitest Syntax Basics

### Basic Test Structure

```typescript
import { describe, it, expect } from 'vitest';

describe('GroupName', () => {           // Group related tests
  it('should do something', () => {      // Single test case
    // Arrange (setup)
    const input = 5;
    
    // Act (do the thing)
    const result = input * 2;
    
    // Assert (check result)
    expect(result).toBe(10);
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

// Arrays
expect(array).toContain('item');
expect(array).toHaveLength(3);

// Strings
expect(string).toMatch(/regex/);

// DOM (with @testing-library)
expect(element).toBeInTheDocument();
expect(element).toHaveTextContent('Hello');

// Async
await expect(promise).resolves.toBe('value');
await expect(promise).rejects.toThrow('error');
```

### Setup & Teardown

```typescript
import { describe, it, beforeEach, afterEach, vi } from 'vitest';

describe('MyTests', () => {
  beforeEach(() => {
    // Runs BEFORE each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Runs AFTER each test
    cleanup();
  });

  it('test 1', () => { /* ... */ });
  it('test 2', () => { /* ... */ });
});
```

---

## Mocking Explained

### What is Mocking?

**Problem**: Your code calls APIs, uses localStorage, etc. Tests shouldn't make real API calls!

**Solution**: Replace real functions with "fake" versions that you control.

### How to Mock

```typescript
import { vi } from 'vitest';

// 1. MOCK A MODULE (replace entire file)
vi.mock('@user/services/index', () => ({
  authService: {
    login: vi.fn(),        // Fake function (does nothing by default)
    logout: vi.fn(),
  },
}));

// 2. IMPORT THE MOCKED VERSION
import { authService } from '@user/services/index';

// 3. CONTROL WHAT IT RETURNS
vi.mocked(authService.login).mockResolvedValue({ token: 'fake-token' });

// 4. CHECK IF IT WAS CALLED
expect(authService.login).toHaveBeenCalledWith({ username: 'test' });
```

### Mock Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│  YOUR TEST FILE                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  vi.mock('@user/services/index', () => ({                        │
│    authService: { login: vi.fn() }   ← Creates FAKE              │
│  }));                                                            │
│                                                                  │
│  // When your code does:                                         │
│  authService.login({ user: 'test' })                             │
│      ↓                                                           │
│  // It calls the FAKE, not real API                              │
│  // FAKE records: "login was called with { user: 'test' }"       │
│      ↓                                                           │
│  // You can verify:                                              │
│  expect(authService.login).toHaveBeenCalledWith({ user: 'test'}) │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Common Mock Patterns

```typescript
// Return a value immediately
vi.fn().mockReturnValue('hello');

// Return a Promise that resolves
vi.fn().mockResolvedValue({ data: 'success' });

// Return a Promise that rejects (error)
vi.fn().mockRejectedValue(new Error('Failed!'));

// Different return on each call
vi.fn()
  .mockResolvedValueOnce('first call')
  .mockResolvedValueOnce('second call');
```

---

## Testing Patterns

### Pattern 1: Testing Zustand Store

```typescript
// auth.store.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from './auth.store';

// Mock dependencies
vi.mock('@user/services/index', () => ({
  authService: { login: vi.fn() },
}));
import { authService } from '@user/services/index';

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store between tests
    useAuthStore.getState().clearAuthState();
    vi.clearAllMocks();
  });

  it('should login successfully', async () => {
    // Arrange: Set up what mock returns
    vi.mocked(authService.login).mockResolvedValue({
      accessToken: 'token123',
      user: { id: 1 }
    });

    // Act: Call the store action
    await useAuthStore.getState().login({ 
      usernameOrEmail: 'test', 
      password: 'pass' 
    });

    // Assert: Check state changed
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe('token123');
  });
});
```

### Pattern 2: Testing Service (API calls)

```typescript
// auth.service.test.ts
import { describe, it, expect, vi } from 'vitest';
import { authService } from './auth.service';

// Mock the API client
vi.mock('./api-client.service.js', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));
import { apiClient } from './api-client.service.js';

describe('authService', () => {
  it('should call login endpoint', async () => {
    // Arrange
    vi.mocked(apiClient.post).mockResolvedValue({
      data: { accessToken: 'token' }
    });

    // Act
    const result = await authService.login({ 
      usernameOrEmail: 'test', 
      password: 'pass' 
    });

    // Assert
    expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
      usernameOrEmail: 'test',
      password: 'pass'
    });
    expect(result.accessToken).toBe('token');
  });
});
```

### Pattern 3: Testing React Component

```typescript
// LoginPage.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginPage } from './LoginPage';

// Mock hooks and services
vi.mock('@user/stores/auth.store', () => ({
  useAuthStore: () => ({
    login: vi.fn(),
    isLoading: false,
    error: null,
  }),
}));

describe('LoginPage', () => {
  it('should render login form', () => {
    // Act: Render component
    render(<LoginPage />);

    // Assert: Check elements exist
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
  });

  it('should submit form', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    // Type in fields
    await user.type(screen.getByPlaceholderText('Email'), 'test@example.com');
    await user.type(screen.getByPlaceholderText('Password'), 'password');
    
    // Click submit
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // Assert something happened
  });
});
```

---

## Running Tests

```bash
cd frontend

# Run all tests once
npm run test:user

# Watch mode (reruns on file save)
npm run test:user:watch

# With coverage report
npm run test:user:coverage

# Run specific file
npm run test:user -- auth.store

# Run tests matching name
npm run test:user -- -t "should login"

# Verbose output
npm run test:user -- --reporter=verbose
```

---

## Quick Reference

| What | How |
|------|-----|
| Create fake function | `vi.fn()` |
| Mock a module | `vi.mock('path', () => ({ ... }))` |
| Set return value | `.mockReturnValue(x)` |
| Set async return | `.mockResolvedValue(x)` |
| Set async error | `.mockRejectedValue(error)` |
| Check called | `expect(fn).toHaveBeenCalled()` |
| Check called with | `expect(fn).toHaveBeenCalledWith(x)` |
| Render component | `render(<Component />)` |
| Find by text | `screen.getByText('Hello')` |
| Find by placeholder | `screen.getByPlaceholderText('Email')` |
| Find by role | `screen.getByRole('button')` |
| Simulate click | `await userEvent.click(element)` |
| Simulate typing | `await userEvent.type(input, 'text')` |

---

## Need Help?

- [Vitest Docs](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- Look at existing test files in this project!
