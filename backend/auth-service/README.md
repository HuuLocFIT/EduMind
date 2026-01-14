# Auth Service

Authentication and Authorization Service for EduMind Platform - A microservice responsible for user authentication, authorization, and user management.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Setup Instructions](#setup-instructions)
- [Configuration](#configuration)
- [Running the Service](#running-the-service)
- [API Endpoints](#api-endpoints)
- [Database Migrations](#database-migrations)
- [Demo Users](#demo-users)
- [Troubleshooting](#troubleshooting)
- [Docker Guide](../DOCKER.md)


## Overview

Auth Service is a Spring Boot microservice that handles:
- User registration and authentication
- JWT token generation and validation
- OAuth2 authentication (Google)
- Two-Factor Authentication (2FA)
- Email verification
- Password reset
- User role management
- **Admin user management** - Create, update, delete, and manage users
- **Admin application review** - Review and approve/reject teacher applications
- **Trial teacher management** - Manage trial periods and upgrade to full teachers
- Teacher application management
- File upload (profile pictures and documents) via Cloudinary

## Features

- ✅ **JWT-based Authentication** - Secure token-based authentication
- ✅ **OAuth2 Integration** - Google OAuth2 login
- ✅ **Two-Factor Authentication (2FA)** - TOTP-based 2FA with QR codes and backup codes
- ✅ **Email Verification** - Email verification on registration
- ✅ **Password Reset** - Secure password reset via email
- ✅ **Role-Based Access Control (RBAC)** - Admin, Teacher, Student, Guest roles
- ✅ **Admin User Management** - Create, update, delete, enable/disable users with pagination
- ✅ **Admin Role Management** - Assign and update user roles
- ✅ **Admin Application Review** - Review, approve, or reject teacher applications
- ✅ **Trial Teacher Management** - View trial teachers and upgrade to full teachers
- ✅ **User Filtering & Search** - Filter users by role with pagination support
- ✅ **Teacher Application System** - Teachers can apply and get approved by admins
- ✅ **Trial System** - Trial period management for teachers (30-day trial)
- ✅ **File Upload** - Profile picture and document upload via Cloudinary
- ✅ **Service Discovery** - Integrated with Eureka Discovery Service
- ✅ **Database Migrations** - Flyway for version-controlled database schema

## Prerequisites

Before setting up the Auth Service, ensure you have the following installed:

- **Java 21** or higher
- **Maven 3.6+**
- **PostgreSQL 16+** (or use Docker Compose)
- **Eureka Discovery Service** (must be running)
- **Environment Variables** configured (see Configuration section)

### Optional Dependencies

- **Docker & Docker Compose** (for running PostgreSQL)
- **Cloudinary Account** (for file uploads)
- **Gmail Account** (for email sending)

## Setup Instructions

### Step 1: Clone the Repository

```bash
cd backend/auth-service
```

### Step 2: Set Up Database

You have two options:

#### Option A: Using Docker Compose (Recommended)

From the `backend` directory:

```bash
docker-compose up -d postgres-auth
```

This will start PostgreSQL on port `5432` with:
- Database: `edumind_auth`
- Username: `postgres`
- Password: `postgres` (default, change via environment variable)

#### Option B: Manual PostgreSQL Setup

1. Install PostgreSQL 16+
2. Create a database:
   ```sql
   CREATE DATABASE edumind_auth;
   ```
3. Ensure PostgreSQL is running on port `5432`

### Step 3: Build the Project

```bash
# From backend/auth-service directory
mvn clean install
```

Or build all services from the root:

```bash
# From backend directory
mvn clean install
```

### Step 4: Configure Environment Variables

Create a `.env` file in the `backend` directory or set environment variables:

```bash
# Database Configuration
export AUTH_DB_URL="jdbc:postgresql://localhost:5432/edumind_auth"
export AUTH_DB_USERNAME="postgres"
export AUTH_DB_PASSWORD="postgres"

# JWT Configuration
export JWT_SECRET="your-super-secret-jwt-key-minimum-32-characters-long-for-security"
export JWT_EXPIRATION="86400000"  # 24 hours in milliseconds
export JWT_REFRESH_EXPIRATION="604800000"  # 7 days in milliseconds

# Eureka Discovery Service
export EUREKA_DEFAULT_ZONE="http://localhost:8761/eureka/"

# Email Configuration (Gmail SMTP)
export MAIL_HOST="smtp.gmail.com"
export MAIL_PORT="587"
export MAIL_USERNAME="your-email@gmail.com"
export MAIL_PASSWORD="your-app-password"  # Use App Password, not regular password
export MAIL_FROM="noreply@edumind.com"
export MAIL_ENABLED="true"

# Google OAuth2 Configuration
export GOOGLE_CLIENT_ID="your-google-client-id"
export GOOGLE_CLIENT_SECRET="your-google-client-secret"
export GOOGLE_REDIRECT_URI="{baseUrl}/api/auth/login/oauth2/code/google" 

# Cloudinary Configuration (for file uploads)
export CLOUDINARY_CLOUD_NAME="your-cloud-name"
export CLOUDINARY_API_KEY="your-api-key"
export CLOUDINARY_API_SECRET="your-api-secret"

# Encryption Key (for sensitive data)
export AUTH_SERVICE_ENCRYPTION_KEY="your-encryption-key-32-characters"

# Frontend URL (for email links)
export FRONTEND_URL="http://localhost:3000"

# Gateway URL (for OAuth2 redirect URIs)
export GATEWAY_URL="http://localhost:8080"

# Service Port (optional, default: 8081)
export AUTH_SERVICE_PORT="8081"
```

**Important Notes:**
- `JWT_SECRET`: Must be at least 32 characters long for HS256 algorithm
- `MAIL_PASSWORD`: For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833), not your regular password
- `AUTH_SERVICE_ENCRYPTION_KEY`: Must be exactly 32 characters for AES-256 for Auth Service

## Configuration

### Application Configuration

The main configuration file is located at:
```
src/main/resources/application.yml
```

Key configuration sections:

- **Server**: Port configuration (default: 8081)
- **Database**: PostgreSQL connection settings
- **JPA/Hibernate**: Entity management and SQL logging
- **Flyway**: Database migration settings
- **JWT**: Token expiration and secret key
- **Email**: SMTP configuration for sending emails
- **OAuth2**: Google OAuth2 client configuration
- **Eureka**: Service discovery configuration
- **Cloudinary**: File upload configuration
- **Logging**: Log levels and file rotation

All sensitive values should be provided via environment variables (see Setup Instructions).

### Database Operations (Flyway CLI)

We enable `flyway-maven-plugin` for direct CLI schema management.

**1. Create Migrations**
Use the root helper:
```bash
../scripts/create-migration.sh
```

**2. Migrate Database**
```bash
mvn flyway:migrate
```

**3. Reset Database**
```bash
mvn flyway:clean
```

**4. Check Status**
```bash
mvn flyway:info
```


## Running the Service

### Prerequisites Check

Before starting, ensure:
1. ✅ PostgreSQL is running and accessible
2. ✅ Eureka Discovery Service is running on port 8761
3. ✅ All required environment variables are set
4. ✅ Database `edumind_auth` exists

### Start the Service

#### Option 1: Using Maven

```bash
# From backend/auth-service directory
mvn spring-boot:run
```

#### Option 2: Using Java

```bash
# Build first
mvn clean package

# Run the JAR
java -jar target/auth-service-1.0.0-SNAPSHOT.jar
```

#### Option 3: Using IDE

Run the `AuthServiceApplication.java` main class from your IDE.

### Verify Service is Running

1. **Check Logs**: You should see:
   ```
   🚀 Starting Auth Service...
   ✅ Auth Service started successfully on port 8081
   ```

2. **Check Health Endpoint**:
   ```bash
   curl http://localhost:8081/actuator/health
   ```
   Expected response: `{"status":"UP"}`

3. **Check Eureka Dashboard**:
   - Open http://localhost:8761
   - Look for `AUTH-SERVICE` in the registered services list

4. **Check Service Info**:
   ```bash
   curl http://localhost:8081/actuator/info
   ```

### Service Port

Default port: **8081**

To change the port, set the environment variable:
```bash
export AUTH_SERVICE_PORT=8082
```

Or modify `application.yml`:
```yaml
server:
  port: 8082
```

## API Endpoints

### Authentication Endpoints

#### Register User
```http
POST /auth/signup
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890"
}
```

**Response:**
```json
{
  "status": 201,
  "success": true,
  "message": "User registered successfully. Please check your email for verification."
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "usernameOrEmail": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Response (Normal Login):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh-token-here",
  "tokenType": "Bearer",
  "userId": 1,
  "username": "johndoe",
  "email": "john@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "roles": ["ROLE_STUDENT"]
}
```

**Response (2FA Required):**
```json
{
  "requires2FA": true,
  "email": "john@example.com",
  "message": "Two-factor authentication required"
}
```

#### 2FA Login
```http
POST /auth/login/2fa
Content-Type: application/json

{
  "usernameOrEmail": "john@example.com",
  "code": "123456"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh-token-here",
  "tokenType": "Bearer",
  "userId": 1,
  "username": "johndoe",
  "email": "john@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "roles": ["ROLE_STUDENT"]
}
```

#### Refresh Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh-token-here"
}
```

**Response:**
```json
{
  "status": 200,
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "new-refresh-token-here",
    "tokenType": "Bearer",
    "userId": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "roles": ["ROLE_STUDENT"]
  }
}
```

#### Logout
```http
POST /auth/logout
Authorization: Bearer {token}
```

**Response:**
```json
{
  "status": 200,
  "success": true,
  "message": "Logged out successfully"
}
```

### User Management Endpoints

#### Get Current User
```http
GET /users/me
Authorization: Bearer {token}
```

**Response:**
```json
{
  "status": 200,
  "success": true,
  "message": "User details retrieved successfully",
  "data": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "+1234567890",
    "roles": ["ROLE_STUDENT"],
    "isActive": true,
    "isEmailVerified": true,
    "profilePictureUrl": "https://cloudinary.com/profile.jpg",
    "createdAt": "2025-01-20T10:00:00",
    "lastLoginAt": "2025-01-20T15:30:00"
  }
}
```

#### Get User by ID
```http
GET /users/{id}
Authorization: Bearer {token}
```

**Access:** Admin or Teacher only

**Response:** Same structure as Get Current User

### Email Verification Endpoints

#### Verify Email
```http
GET /auth/verify-email?token={verification-token-from-email}
```

**Example:**
```http
GET /auth/verify-email?token=abc123xyz789
```

**Response:**
```json
{
  "status": 200,
  "success": true,
  "message": "Email verified successfully! You can now log in.",
  "data": null
}
```

#### Resend Verification Email
```http
POST /auth/resend-verification
Content-Type: application/json

{
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "status": 200,
  "success": true,
  "message": "Verification email sent! Please check your inbox.",
  "data": null
}
```

### Password Reset Endpoints

#### Request Password Reset
```http
POST /auth/password/forgot
Content-Type: application/json

{
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "status": 200,
  "success": true,
  "message": "If your email exists in our system, you will receive a password reset link.",
  "data": null
}
```

#### Validate Reset Token
```http
GET /auth/password/validate-token?token={reset-token-from-email}
```

**Response:**
```json
{
  "status": 200,
  "success": true,
  "message": "Token is valid",
  "data": {
    "valid": true,
    "email": "john@example.com"
  }
}
```

#### Confirm Password Reset
```http
POST /auth/password/reset
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePassword123!",
  "confirmPassword": "NewSecurePassword123!"
}
```

**Response:**
```json
{
  "status": 200,
  "success": true,
  "message": "Password reset successfully! You can now log in with your new password.",
  "data": null
}
```

### Two-Factor Authentication Endpoints

#### Setup 2FA
```http
POST /auth/2fa/setup
Authorization: Bearer {token}
```

**Response:**
```json
{
  "status": 200,
  "success": true,
  "message": "2FA setup generated. Scan QR code with your authenticator app.",
  "data": {
    "qrCodeUrl": "data:image/png;base64,iVBORw0KG...",
    "secret": "JBSWY3DPEHPK3PXP",
    "backupCodes": ["12345678", "87654321", ...]
  }
}
```

#### Verify 2FA Setup
```http
POST /auth/2fa/verify
Authorization: Bearer {token}
Content-Type: application/json

{
  "code": "123456",
  "secret": "JBSWY3DPEHPK3PXP"
}
```

**Response:**
```json
{
  "status": 200,
  "success": true,
  "message": "Two-factor authentication enabled successfully!",
  "data": {
    "enabled": true,
    "backupCodes": ["12345678", "87654321", ...]
  }
}
```

#### Disable 2FA
```http
POST /auth/2fa/disable
Authorization: Bearer {token}
Content-Type: application/json

{
  "password": "user-password",
  "code": "123456"
}
```

**Response:**
```json
{
  "status": 200,
  "success": true,
  "message": "Two-factor authentication disabled successfully.",
  "data": {
    "enabled": false
  }
}
```

#### Get 2FA Status
```http
GET /auth/2fa/status
Authorization: Bearer {token}
```

**Response:**
```json
{
  "status": 200,
  "success": true,
  "message": "2FA status retrieved",
  "data": {
    "enabled": true
  }
}
```

#### Regenerate Backup Codes
```http
POST /auth/2fa/backup-codes
Authorization: Bearer {token}
Content-Type: application/json

{
  "password": "user-password"
}
```

**Response:**
```json
{
  "status": 200,
  "success": true,
  "message": "Backup codes regenerated successfully. Save them in a secure location.",
  "data": {
    "backupCodes": ["11111111", "22222222", ...]
  }
}
```

### Admin Endpoints

#### Create Teacher Account
```http
POST /admin/users/teacher
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "username": "teacher1",
  "email": "teacher1@example.com",
  "password": "SecurePassword123!",
  "firstName": "Jane",
  "lastName": "Smith",
  "phoneNumber": "+1234567890",
  "roles": ["ROLE_TEACHER"]
}
```

#### Create Admin Account
```http
POST /admin/users/admin
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "username": "admin2",
  "email": "admin2@example.com",
  "password": "SecurePassword123!",
  "firstName": "Admin",
  "lastName": "User",
  "phoneNumber": "+1234567890",
  "roles": ["ROLE_ADMIN"]
}
```

#### Get All Users
```http
GET /admin/users?page=0&size=10&sortBy=createdAt
Authorization: Bearer {admin-token}
```

**Query Parameters:**
- `page` (default: 0) - Page number
- `size` (default: 10) - Page size
- `sortBy` (default: createdAt) - Sort field

**Response:**
```json
{
  "status": 200,
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "content": [
      {
        "id": 1,
        "username": "johndoe",
        "email": "john@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "roles": ["ROLE_STUDENT"],
        "isActive": true,
        "createdAt": "2025-01-20T10:00:00"
      }
    ],
    "totalElements": 100,
    "totalPages": 10,
    "size": 10,
    "number": 0
  }
}
```

#### Get Users by Role
```http
GET /admin/users/role/{roleName}?page=0&size=10
Authorization: Bearer {admin-token}
```

**Example:**
```http
GET /admin/users/role/TEACHER?page=0&size=10
Authorization: Bearer {admin-token}
```

**Response:** Same paginated structure as Get All Users

#### Update User Roles
```http
PUT /admin/users/{userId}/role
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "roles": ["ROLE_TEACHER", "ROLE_STUDENT"]
}
```

#### Toggle User Status (Enable/Disable)
```http
PATCH /admin/users/{userId}/status?enabled=true
Authorization: Bearer {admin-token}
```

**Query Parameters:**
- `enabled` (required) - true to enable, false to disable

**Example:**
```http
PATCH /admin/users/1/status?enabled=false
Authorization: Bearer {admin-token}
```

#### Delete User
```http
DELETE /admin/users/{userId}
Authorization: Bearer {admin-token}
```

**Note:** This performs a soft delete.

#### Get All Teacher Applications
```http
GET /admin/users/applications?status=PENDING&page=0&size=10&sortBy=createdAt
Authorization: Bearer {admin-token}
```

**Query Parameters:**
- `status` (optional) - Filter by status: PENDING, APPROVED, REJECTED
- `page` (default: 0) - Page number
- `size` (default: 10) - Page size
- `sortBy` (default: createdAt) - Sort field

**Example:**
```http
GET /admin/users/applications?status=PENDING&page=0&size=10
Authorization: Bearer {admin-token}
```

#### Get Application by ID
```http
GET /admin/users/applications/{id}
Authorization: Bearer {admin-token}
```

#### Get All Trial Teachers
```http
GET /admin/users/trial-teachers?page=0&size=10
Authorization: Bearer {admin-token}
```

**Response:**
```json
{
  "status": 200,
  "success": true,
  "message": "Trial teachers retrieved successfully",
  "data": {
    "content": [
      {
        "userId": 1,
        "username": "teacher1",
        "email": "teacher1@example.com",
        "firstName": "Jane",
        "lastName": "Smith",
        "trialStartDate": "2025-01-01T00:00:00",
        "trialEndDate": "2025-01-31T23:59:59",
        "isTrialExpired": false,
        "daysRemaining": 15
      }
    ],
    "totalElements": 5,
    "totalPages": 1
  }
}
```

#### Upgrade Trial Teacher to Full Teacher
```http
POST /admin/users/trial-teachers/{userId}/upgrade
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "adminNotes": "Upgraded after successful trial period"
}
```

**Note:** `adminNotes` is optional.

### Teacher Application Endpoints

#### Submit Teacher Application
```http
POST /teacher-application/submit
Authorization: Bearer {token}
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "subject": "Mathematics",
  "experienceYears": 5,
  "qualifications": "Masters in Education",
  "bio": "Experienced teacher with 5 years of teaching experience",
  "motivation": "I want to share my knowledge with students",
  "documents": [
    {
      "url": "https://cloudinary.com/image1.jpg",
      "type": "certificate",
      "name": "Teaching Certificate.pdf"
    },
    {
      "url": "https://cloudinary.com/image2.jpg",
      "type": "degree",
      "name": "Master Degree.pdf"
    }
  ]
}
```

**Access:** Student or Guest only

#### Get My Application
```http
GET /teacher-application/my-application
Authorization: Bearer {token}
```

**Response:**
```json
{
  "status": 200,
  "success": true,
  "message": "Application retrieved successfully",
  "data": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "subject": "Mathematics",
    "experienceYears": 5,
    "qualifications": "Masters in Education",
    "bio": "Experienced teacher",
    "motivation": "I want to share my knowledge",
    "status": "PENDING",
    "documents": [...],
    "createdAt": "2025-01-20T10:00:00",
    "updatedAt": "2025-01-20T10:00:00"
  }
}
```

#### Get Trial Status
```http
GET /teacher-application/trial-status
Authorization: Bearer {token}
```

**Access:** Teacher Trial only

**Response:**
```json
{
  "status": 200,
  "success": true,
  "message": "Trial status retrieved",
  "data": {
    "userId": 1,
    "username": "teacher1",
    "email": "teacher1@example.com",
    "trialStartDate": "2025-01-01T00:00:00",
    "trialEndDate": "2025-01-31T23:59:59",
    "isTrialExpired": false,
    "daysRemaining": 15
  }
}
```

#### Review Application (Admin)
```http
POST /admin/users/applications/{id}/review
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "action": "APPROVE",
  "teacherType": "TRIAL",
  "adminNotes": "Approved for 30-day trial period"
}
```

**For Rejection:**
```http
POST /admin/users/applications/{id}/review
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "action": "REJECT",
  "rejectionReason": "Insufficient qualifications",
  "adminNotes": "Please provide additional certificates"
}
```

**Note:** `teacherType` can be `TRIAL` (30 days) or `FULL` (permanent). Only required when `action` is `APPROVE`.

### File Upload Endpoints

#### Upload Document
```http
POST /upload/document
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: [binary file]
folder: teacher-documents (optional, default: teacher-documents)
```

**Response:**
```json
{
  "status": 200,
  "success": true,
  "message": "Document uploaded successfully",
  "data": {
    "url": "https://cloudinary.com/document.pdf",
    "publicId": "teacher-documents/abc123",
    "resourceType": "raw",
    "format": "pdf",
    "size": 1024000
  }
}
```

#### Upload Image (Avatar/Profile Picture)
```http
POST /upload/image
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: [binary image file]
folder: avatars (optional, default: avatars)
```

**Response:**
```json
{
  "status": 200,
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "url": "https://cloudinary.com/image.jpg",
    "publicId": "avatars/abc123",
    "resourceType": "image",
    "format": "jpg",
    "width": 800,
    "height": 600,
    "size": 204800
  }
}
```

#### Delete File
```http
DELETE /upload?url={cloudinary-url}
Authorization: Bearer {token}
```

**Example:**
```http
DELETE /upload?url=https://cloudinary.com/image.jpg
Authorization: Bearer {token}
```

**Response:**
```json
{
  "status": 200,
  "success": true,
  "message": "File deleted successfully",
  "data": null
}
```

### OAuth2 Endpoints

#### Google OAuth2 Login
```http
GET /oauth2/authorization/google
```

After successful authentication, user will be redirected to the configured redirect URI.

## Database Migrations

The service uses Flyway for database version control. Migrations are located in:
```
src/main/resources/db/migration/
```

### Migration Files

- `V1__Create_users_table.sql` - Initial users table
- `V2__Create_roles_table.sql` - Roles table
- `V3__Create_user_roles_table.sql` - User-Role mapping
- `V4__Create_refresh_tokens_table.sql` - Refresh tokens
- `V5__Insert_default_roles.sql` - Default roles (ADMIN, TEACHER, STUDENT, GUEST)
- `V6__Insert_demo_users.sql` - Demo users for testing
- `V7__Create_teacher_applications_table.sql` - Teacher applications
- `V8__Add_trial_fields_to_users.sql` - Trial period fields
- `V10__Create_application_status_history.sql` - Application history
- `V11__Fix_teacher_applications_fullname.sql` - Fix fullname field
- `V12__Insert_teacher_trial_role.sql` - Teacher trial role
- `V13__Create_email_verification_tokens.sql` - Email verification
- `V14__Create_password_reset_tokens.sql` - Password reset tokens
- `V15__Add_2fa_fields_to_users.sql` - Two-factor authentication
- `V16__Add_oauth2_fields_to_users.sql` - OAuth2 integration

### Running Migrations

Migrations run automatically on application startup. To check migration status:

```bash
# Check Flyway migration status in logs
# Look for: "Flyway migration completed successfully"
```

### Manual Migration (if needed)

If you need to run migrations manually:

```bash
mvn flyway:migrate
```

## Demo Users

The service includes demo users for testing (inserted via migration `V6__Insert_demo_users.sql`):

| Role | Email | Password | Description |
|------|-------|----------|-------------|
| Admin | `admin@edumind.com` | `password123` | Full system access |
| Teacher | `teacher@edumind.com` | `password123` | Teacher account |
| Student | `student@edumind.com` | `password123` | Student account |
| Guest | `guest@edumind.com` | `password123` | Guest account |

**⚠️ Warning**: These are demo accounts. Change passwords in production!

## Troubleshooting

### Common Issues

#### 1. Service fails to start - Database connection error

**Error:**
```
org.postgresql.util.PSQLException: Connection refused
```

**Solution:**
- Ensure PostgreSQL is running: `docker-compose ps` or `pg_isready`
- Check database credentials in environment variables
- Verify database exists: `psql -U postgres -l | grep edumind_auth`

#### 2. Service fails to register with Eureka

**Error:**
```
com.netflix.discovery.shared.transport.TransportException: Cannot execute request on any known server
```

**Solution:**
- Ensure Eureka Discovery Service is running on port 8761
- Check `EUREKA_DEFAULT_ZONE` environment variable
- Verify network connectivity: `curl http://localhost:8761/eureka/`

#### 3. JWT token validation fails

**Error:**
```
io.jsonwebtoken.security.SignatureException: JWT signature does not match
```

**Solution:**
- Ensure `JWT_SECRET` is set and consistent across services
- Verify `JWT_SECRET` is at least 32 characters long
- Check if token was signed with a different secret

#### 4. Email sending fails

**Error:**
```
javax.mail.AuthenticationFailedException: 535-5.7.8 Username and Password not accepted
```

**Solution:**
- For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833), not your regular password
- Enable "Less secure app access" (not recommended) or use OAuth2
- Verify `MAIL_USERNAME` and `MAIL_PASSWORD` are correct

#### 5. Flyway migration fails

**Error:**
```
org.flywaydb.core.api.FlywayException: Validate failed
```

**Solution:**
- Check if database schema was manually modified
- Review migration files for syntax errors
- Use `baseline-on-migrate: true` for existing databases (already configured)

#### 6. OAuth2 login fails

**Error:**
```
Invalid client_id or redirect_uri
```

**Solution:**
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Check redirect URI matches Google Console configuration
- Ensure OAuth2 consent screen is configured in Google Cloud Console

#### 7. File upload fails (Cloudinary)

**Error:**
```
Invalid cloud_name or api_key
```

**Solution:**
- Verify Cloudinary credentials are correct
- Check `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Ensure Cloudinary account is active

### Logs

Logs are written to:
```
logs/auth-service.log
```

To view logs in real-time:
```bash
tail -f logs/auth-service.log
```

Log levels can be configured in `application.yml`:
- `DEBUG`: Detailed debugging information
- `INFO`: General information (default)
- `WARN`: Warning messages
- `ERROR`: Error messages only

### Health Checks

Check service health:
```bash
curl http://localhost:8081/actuator/health
```

Check service info:
```bash
curl http://localhost:8081/actuator/info
```

Check metrics:
```bash
curl http://localhost:8081/actuator/metrics
```

## Additional Resources

- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [Spring Security Documentation](https://spring.io/projects/spring-security)
- [JWT.io](https://jwt.io/) - JWT token decoder and debugger
- [Flyway Documentation](https://flywaydb.org/documentation/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

## Support

For issues or questions, please contact the development team or create an issue in the project repository.

---

**Last Updated**: 2025-01-20

