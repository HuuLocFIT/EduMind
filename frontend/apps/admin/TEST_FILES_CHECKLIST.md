# Admin App Auth Tests - Files Checklist

This document lists all test files that need to be created for admin app authentication features.

## Files to Create

### Phase 1: Core Service Tests
- [ ] `src/app/core/services/auth.service.spec.ts`
  - **Location**: `frontend/apps/admin/src/app/core/services/auth.service.spec.ts`
  - **Purpose**: Comprehensive tests for AuthService
  - **Estimated Tests**: ~60+ test cases
  - **Dependencies**: HttpClient, Router, localStorage

### Phase 2: Guard Tests
- [ ] `src/app/core/guards/auth.guard.spec.ts`
  - **Location**: `frontend/apps/admin/src/app/core/guards/auth.guard.spec.ts`
  - **Purpose**: Tests for authenticated route protection
  - **Estimated Tests**: ~7 test cases
  - **Dependencies**: AuthService, Router

- [ ] `src/app/core/guards/guest.guard.spec.ts`
  - **Location**: `frontend/apps/admin/src/app/core/guards/guest.guard.spec.ts`
  - **Purpose**: Tests for guest route protection (login page)
  - **Estimated Tests**: ~7 test cases
  - **Dependencies**: AuthService, Router

### Phase 3: Interceptor Tests
- [ ] `src/app/core/interceptors/auth.interceptor.spec.ts`
  - **Location**: `frontend/apps/admin/src/app/core/interceptors/auth.interceptor.spec.ts`
  - **Purpose**: Tests for HTTP request interception and token refresh
  - **Estimated Tests**: ~25+ test cases
  - **Dependencies**: AuthService, HttpClient, HttpTestingController

### Phase 4: Component Tests
- [ ] `src/app/features/auth/login/login.component.spec.ts`
  - **Location**: `frontend/apps/admin/src/app/features/auth/login/login.component.spec.ts`
  - **Purpose**: Tests for login form component
  - **Estimated Tests**: ~40+ test cases
  - **Dependencies**: AuthService, Router, FormBuilder, UI Components

---

## File Structure Summary

```
frontend/apps/admin/src/app/
├── core/
│   ├── services/
│   │   ├── auth.service.ts                    [EXISTS]
│   │   └── auth.service.spec.ts                [TO CREATE - Phase 1]
│   ├── guards/
│   │   ├── auth.guard.ts                       [EXISTS]
│   │   ├── auth.guard.spec.ts                  [TO CREATE - Phase 2]
│   │   ├── guest.guard.ts                      [EXISTS]
│   │   └── guest.guard.spec.ts                 [TO CREATE - Phase 2]
│   └── interceptors/
│       ├── auth.interceptor.ts                 [EXISTS]
│       └── auth.interceptor.spec.ts            [TO CREATE - Phase 3]
└── features/
    └── auth/
        └── login/
            ├── login.component.ts              [EXISTS]
            ├── login.component.html            [EXISTS]
            ├── login.component.css             [EXISTS]
            └── login.component.spec.ts         [TO CREATE - Phase 4]
```

---

## Implementation Priority

1. **Phase 1** - Start here (foundation)
2. **Phase 2** - After Phase 1 (depends on AuthService)
3. **Phase 3** - After Phase 1 (depends on AuthService)
4. **Phase 4** - Last (depends on AuthService, uses guards)

---

## Quick Stats

- **Total Files to Create**: 5
- **Total Estimated Test Cases**: ~140+
- **Primary Dependencies**: AuthService, Router, HttpClient
- **Testing Framework**: Vitest + Angular Testing Utilities

---

## Notes

- All test files should follow Angular testing best practices
- Use Vitest as the test runner (consistent with user app)
- Mock external dependencies appropriately
- Ensure tests are isolated and independent
- Aim for high code coverage (≥80% for components, ≥90% for services)

---

**Last Updated**: 2025-01-XX

