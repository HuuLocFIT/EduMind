# Authentication Workflows

## System Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| **GUEST** | Unauthenticated visitor | Browse courses, view public info |
| **STUDENT** | Registered learner | Enroll, purchase, take courses, review |
| **TEACHER_TRIAL** | Pending teacher application | Limited course creation, trial period |
| **TEACHER** | Verified instructor | Full course management, earnings, students |
| **ADMIN** | System administrator | Full system access, user management |

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

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant OAuthProvider as Google/Facebook
    participant Backend
    participant Database

    User->>Frontend: Click "Sign in with Google/Facebook"
    Frontend->>OAuthProvider: Redirect to OAuth Provider
    User->>OAuthProvider: Authorize App
    OAuthProvider->>Backend: Callback with Auth Code
    Backend->>OAuthProvider: Exchange Code for Token
    OAuthProvider-->>Backend: User Profile Data
    Backend->>Database: Find or Create User
    Backend-->>User: Redirect to Frontend Callback URL?token=AccessToken (Browser sets RefreshToken Cookie)
    Frontend->>Frontend: Extract AccessToken from URL
    Frontend->>Frontend: Store AccessToken in localStorage
    Frontend->>User: Redirect to Dashboard
```

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
    EmailService->>Backend: GET /api/auth/verify-email?token=xxx
    Backend->>Database: Mark Email Verified
    Backend->>User: Redirect to Login
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
    Backend-->>Student: Application Submitted
    
    Admin->>Backend: Review Application
    alt Approved
        Admin->>Backend: Approve Application
        Backend->>Database: Add ROLE_TEACHER_TRIAL to User
        Backend->>Student: Notification: Approved
        Note over Student: Trial Period Starts
        Student->>Frontend: Create Courses
    else Rejected
        Admin->>Backend: Reject Application
        Backend->>Student: Notification: Rejected
    end
    
    Note over Admin: After Trial Period
    Admin->>Backend: Upgrade Teacher
    Backend->>Database: Replace ROLE_TEACHER_TRIAL with ROLE_TEACHER
    Backend->>Student: Full Teacher Access Granted
```

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
    User->>Frontend: Enter New Password
    Frontend->>Backend: POST /api/auth/password/reset
    Backend->>Database: Update Password Hash
    Backend-->>Frontend: Password Reset Successful
    Frontend->>User: Redirect to Login
```

## 6. Role-Based Access Control

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
    
    GUEST --> A
    GUEST --> B
    GUEST --> C
    
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
