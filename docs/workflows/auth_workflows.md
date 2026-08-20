# Authentication Workflows

## System Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| **Anonymous** | Unauthenticated visitor (no account, no session) | Browse courses, view public info |
| **STUDENT** | Registered learner | Enroll, purchase, take courses, review |
| **TEACHER_TRIAL** | Approved instructor in a time-limited evaluation period (30 days) | Limited course creation, trial period |
| **TEACHER** | Verified instructor | Full course management, earnings, students |
| **ADMIN** | System administrator | Full system access, user management |

> "Anonymous" above is a conceptual state, not a system role — it has no row in `roles` and is never assigned to a user. The `ROLE_GUEST` role that used to exist in the database was removed: no registration/login flow ever assigned it (`AuthService` always assigns `ROLE_STUDENT` to new accounts), so it was dead weight rather than a real "authenticated guest" tier.

> While a teacher application is `PENDING`, the applicant keeps their existing role (`STUDENT`) — `TEACHER_TRIAL` is only granted after admin approval, and is added on top of `STUDENT` rather than replacing it. If the trial period expires without a manual admin upgrade, `TrialExpiryScheduler` automatically downgrades the account back to `STUDENT` (the account stays active) rather than auto-upgrading it to `TEACHER` — see [Teacher Application Flow](#4-teacher-application-flow).

## 1. Standard Login Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database

    User->>Frontend: Enter Email/Username + Password
    Frontend->>Backend: POST /api/auth/login
    Backend->>Database: Validate Credentials
    
    alt Valid Credentials
        alt 2FA Enabled
            Backend-->>Frontend: requires2FA: true
            Frontend->>User: Show 2FA Input
            User->>Frontend: Enter 2FA Code
            Frontend->>Backend: POST /api/auth/login/2fa
            Backend->>Database: Verify 2FA Code
            Backend-->>Frontend: Set-Cookie: RefreshToken (HttpOnly)
            Backend-->>Frontend: JSON Body: AccessToken + User Data
        else 2FA Not Enabled
            Backend-->>Frontend: Set-Cookie: RefreshToken (HttpOnly)
            Backend-->>Frontend: JSON Body: AccessToken + User Data
        end
        Frontend->>Frontend: Store AccessToken in localStorage
        Frontend->>User: Redirect to Dashboard
    else Invalid Credentials
        Backend-->>Frontend: 401 Unauthorized
        Frontend->>User: Show Error Message
    end
```

## 2. OAuth2 Login Flow

> **Google only.** `Facebook` appears in the `AuthProvider` enum and the DB `provider` check constraint, but it is not a live feature: the frontend's Facebook button is commented out, and `OAuth2UserInfoFactory` only handles `registrationId == "google"` (throws `BadRequestException` for any other provider). No `application.yml` OAuth2 client registration exists for Facebook.

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Google
    participant Backend
    participant Database

    User->>Frontend: Click "Sign in with Google"
    Frontend->>Google: Redirect to Google OAuth2 consent screen
    User->>Google: Authorize App
    Google->>Backend: GET /api/auth/login/oauth2/code/google?code=...
    Backend->>Google: Exchange Auth Code for Access Token
    Google-->>Backend: User Profile Data
    Backend->>Database: Find or Create User
    Backend->>Backend: Generate JWT Access Token
    Backend->>Database: Revoke old Refresh Tokens, create new Refresh Token
    Backend-->>Frontend: Set-Cookie: refreshToken (HttpOnly, Secure)
    Backend-->>User: 302 Redirect to {FRONTEND_URL}/oauth2/redirect?token=AccessToken
    Frontend->>Frontend: Parse AccessToken from URL query param
    Frontend->>Frontend: Store AccessToken in localStorage
    Frontend->>User: Redirect to Dashboard
```

Only the access token ever appears in the URL (`OAuth2AuthenticationSuccessHandler.determineTargetUrl`); the refresh token is always delivered via an `HttpOnly` cookie (`Path=/`, `Max-Age=604800` — 7 days), never on the URL or in a JSON body.

## 3. User Registration Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database
    participant EmailService

    User->>Frontend: Fill Registration Form
    Frontend->>Backend: POST /api/auth/signup
    Backend->>Database: Check Email/Username Exists
    
    alt Already Exists
        Backend-->>Frontend: 400 Bad Request
        Frontend->>User: Show "Already registered"
    else New User
        Backend->>Database: Create User with ROLE_STUDENT
        Backend->>EmailService: Send Verification Email
        Backend-->>Frontend: 201 Created
        Frontend->>User: Show "Check your email"
    end
    
    User->>EmailService: Click Verification Link
    EmailService->>Frontend: Open /verify-email?token=xxx
    Frontend->>Backend: GET /api/auth/verify-email?token=xxx
    Backend->>Database: Mark Email Verified
    Backend-->>Frontend: Email Verification Successful
    Frontend->>User: Show Result and Login Link
```

## 4. Teacher Application Flow

```mermaid
sequenceDiagram
    participant Student
    participant Frontend
    participant Backend
    participant Admin
    participant Database

    Student->>Frontend: Submit Teacher Application
    Frontend->>Backend: POST /api/teacher-application/submit
    Backend->>Database: Create Application with PENDING status
    Note over Student: Role unchanged — still ROLE_STUDENT
    Backend-->>Student: Application Submitted
    
    Admin->>Backend: Review Application
    alt Approved as Trial
        Admin->>Backend: Approve Application (teacherType = TRIAL)
        Backend->>Database: Add ROLE_TEACHER_TRIAL (kept alongside ROLE_STUDENT)
        Backend->>Database: Set isTrial=true, trialStartDate=now, trialEndDate=now+30d
        Backend->>Student: Notification: Approved
        Note over Student: 30-day Trial Period Starts
        Student->>Frontend: Create Courses (limited access)
    else Approved as Full
        Admin->>Backend: Approve Application (teacherType = FULL)
        Backend->>Database: Add ROLE_TEACHER directly
        Backend->>Student: Notification: Approved
    else Rejected
        Admin->>Backend: Reject Application
        Backend->>Student: Notification: Rejected
    end
    
    alt Admin upgrades before expiry
        Admin->>Backend: Upgrade Teacher (manual)
        Backend->>Database: Remove ROLE_TEACHER_TRIAL, add ROLE_TEACHER, clear trial fields
        Backend->>Student: Full Teacher Access Granted
    else Trial expires unattended
        Note over Backend: TrialExpiryScheduler (daily cron, 00:00)
        Backend->>Database: trialEndDate passed → remove ROLE_TEACHER_TRIAL, add ROLE_STUDENT
        Backend->>Database: Set isTrial=false, clear trialStartDate/trialEndDate
        Backend->>Student: Notification: Trial expired, downgraded to Student
        Note over Backend: Account stays active — re-applying starts a new application, not an automatic reinstatement
    end
```

> **Trial reminder**: 7 days before `trialEndDate`, `TrialExpiryScheduler` sends a reminder email only — no role or account-status change at that point.

## 5. Password Reset Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant EmailService
    participant Database

    User->>Frontend: Click "Forgot Password"
    Frontend->>Backend: POST /api/auth/password/forgot
    Backend->>Database: Find User by Email
    alt User Exists
        Backend->>EmailService: Send Reset Link
        Backend-->>Frontend: "Check your email"
    else User Not Found
        Backend-->>Frontend: "Check your email"
    end
    
    User->>EmailService: Click Reset Link
    EmailService->>Frontend: Open Reset Page with Token
    Frontend->>Backend: GET /api/auth/password/validate-token?token=xxx
    Backend->>Database: Check Token Exists, Unused, and Unexpired
    alt Token Valid
        Backend-->>Frontend: Token Valid
        User->>Frontend: Enter New Password
        Frontend->>Backend: POST /api/auth/password/reset
        Backend->>Database: Update Password Hash and Invalidate Reset Tokens
        Backend-->>Frontend: Password Reset Successful
        Frontend->>User: Redirect to Login
    else Token Invalid or Expired
        Backend-->>Frontend: 400 Bad Request
        Frontend->>User: Show Invalid or Expired Link
    end
```

## 6. Refresh Token Flow

Refresh tokens are stored in the `refresh_tokens` table (JPA entity `RefreshToken`) — there is no Redis involvement. The mechanism is **revoke-on-new-login**, not rotation-on-every-refresh, and there is **no reuse-detection** (a used/revoked token presented again is simply rejected — it does not trigger revocation of the user's other sessions).

```mermaid
sequenceDiagram
    participant Frontend
    participant Backend
    participant Database

    Note over Backend,Database: On login (standard or OAuth)
    Backend->>Database: Revoke all existing Refresh Tokens for user
    Backend->>Database: Create new Refresh Token
    Backend-->>Frontend: Set-Cookie: refreshToken (HttpOnly, 7 days)

    Note over Frontend,Backend: On access token expiry
    Frontend->>Backend: POST /api/auth/refresh (cookie sent automatically)
    Backend->>Database: Look up Refresh Token

    alt Token valid (not expired, not revoked)
        Backend-->>Frontend: New Access Token only (refresh cookie/row unchanged)
    else Token revoked
        Backend->>Frontend: Clear refreshToken cookie
        Backend-->>Frontend: 401 "Refresh token is revoked!"
    else Token expired
        Backend->>Database: Delete Refresh Token row
        Backend->>Frontend: Clear refreshToken cookie
        Backend-->>Frontend: 401 Unauthorized
    end

    Note over Frontend,Backend: On logout
    Frontend->>Backend: POST /api/auth/logout
    Backend->>Database: Revoke all Refresh Tokens for user
    Backend->>Frontend: Clear refreshToken cookie
```

## 7. Two-Factor Authentication — Setup

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database

    User->>Frontend: Open Security Settings → Enable 2FA
    Frontend->>Backend: POST /api/auth/2fa/setup
    Backend->>Backend: Generate TOTP secret, 5 backup codes (12-char alphanumeric)
    Backend->>Database: Store encrypted TOTP secret + hashed backup codes
    Backend-->>Frontend: QR code data URL (otpauth:// URI) + backup codes
    Frontend->>User: Show QR code + backup codes to save
    User->>Frontend: Scan QR in authenticator app, enter generated code
    Frontend->>Backend: POST /api/auth/2fa/verify {code}
    Backend->>Backend: Verify TOTP code against secret
    Backend->>Database: Set is2faEnabled = true
    Backend-->>Frontend: 2FA Enabled
```

Backup codes are hashed with the same password encoder used for user passwords before being persisted — plaintext codes are shown to the user only once, at generation time. `POST /api/auth/2fa/backup-codes` regenerates the set and requires re-entering the account password.

## 8. Two-Factor Authentication — Login & Recovery Codes

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database

    User->>Frontend: Enter Email/Password
    Frontend->>Backend: POST /api/auth/login
    Backend->>Database: Validate credentials
    Backend->>Backend: is2faEnabled == true
    Backend-->>Frontend: TwoFactorRequiredResponse {email, message} (no tokens issued)
    Frontend->>User: Show 2FA code input

    alt 6-digit TOTP code
        User->>Frontend: Enter TOTP code
        Frontend->>Backend: POST /api/auth/login/2fa {code}
        Backend->>Backend: Decrypt stored secret, verify TOTP
    else 12-character backup/recovery code
        User->>Frontend: Enter backup code
        Frontend->>Backend: POST /api/auth/login/2fa {code}
        Backend->>Database: Match against hashed backup codes
        Backend->>Database: Consume (remove) code — single use
    end

    Backend->>Database: Revoke old Refresh Tokens, create new one
    Backend-->>Frontend: Set-Cookie: refreshToken (HttpOnly)
    Backend-->>Frontend: JSON Body: AccessToken + User Data
    Frontend->>User: Redirect to Dashboard
```

## 9. Session Expiration Propagation (Frontend)

```mermaid
sequenceDiagram
    participant App as User App (React)
    participant Interceptor as api-client.service.ts
    participant Backend
    participant Store as auth.store.ts

    App->>Backend: API request (expired access token)
    Backend-->>Interceptor: 401 / ERR_2002 (non-auth endpoint)
    Interceptor->>Backend: POST /api/auth/refresh (deduplicated in-flight)

    alt Refresh succeeds
        Backend-->>Interceptor: New Access Token
        Interceptor->>App: Retry original request
    else Refresh fails
        Interceptor->>Interceptor: Clear accessToken/user/auth-storage from localStorage
        Interceptor->>Store: dispatch CustomEvent "auth:session-expired"
        Store->>Store: clearAuthState()
        Note over Store: ProtectedRoute redirects to login (no hard reload)
    end
```

The Angular admin app follows an equivalent pattern via `auth.interceptor.ts`: a 401 triggers `authService.refreshToken()`, and on failure `forceLogout()` clears auth state and explicitly navigates to the login route (`router.navigate`).

## 10. Role-Based Access Control

```mermaid
graph TD
    subgraph Public Access
        A[Browse Courses]
        B[View Course Details]
        C[View Teacher Profiles]
    end
    
    subgraph Student Access
        D[Enroll in Courses]
        E[Access Purchased Content]
        F[Write Reviews]
        G[Manage Cart/Wishlist]
    end
    
    subgraph Teacher Trial Access
        H[Create Courses - Limited]
        I[View Earnings - Limited]
    end
    
    subgraph Teacher Access
        J[Full Course Management]
        K[View All Earnings]
        L[Manage Students]
        M[Reply to Reviews]
    end
    
    subgraph Admin Access
        N[User Management]
        O[Review Applications]
        P[System Configuration]
        Q[Content Moderation]
    end
    
    Anonymous --> A
    Anonymous --> B
    Anonymous --> C
    
    STUDENT --> D
    STUDENT --> E
    STUDENT --> F
    STUDENT --> G
    
    TEACHER_TRIAL --> H
    TEACHER_TRIAL --> I
    
    TEACHER --> J
    TEACHER --> K
    TEACHER --> L
    TEACHER --> M
    
    ADMIN --> N
    ADMIN --> O
    ADMIN --> P
    ADMIN --> Q
```
