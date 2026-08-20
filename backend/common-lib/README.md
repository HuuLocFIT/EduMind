# Common Library

Shared library for EduMind Platform microservices - Provides common utilities, response models, exception handling, security services, and file-upload support used across all microservices.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Components](#components)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Response Models](#response-models)
- [Exception Handling](#exception-handling)
- [Security Utilities](#security-utilities)
- [File Upload (Cloudinary)](#file-upload-cloudinary)
- [Constants](#constants)
- [Known Issues / Backlog](#known-issues--backlog)
- [Best Practices](#best-practices)

## Overview

The Common Library is a shared Maven dependency that provides reusable components for all EduMind Platform microservices. It ensures:

- **Consistency** - Standardized response formats across all services
- **Code Reuse** - DRY (Don't Repeat Yourself) principle
- **Maintainability** - Single source of truth for common functionality
- **Type Safety** - Strongly typed response models and exceptions

**Technology Stack:**
- Spring Boot 3.5.6
- Spring Web (for REST controllers)
- Spring Security (for security utilities)
- Spring Validation (`spring-boot-starter-validation`)
- Lombok (for reducing boilerplate)
- Jackson (for JSON serialization)
- Cloudinary SDK (`cloudinary-http5`, for file/image upload)
- Java 21

**Packaging:** JAR (Maven dependency)

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    Common Library                          │
│                  (common-lib.jar)                          │
│                                                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Response Models                                   │    │
│  │  • ApiResponse<T>                                  │    │
│  │  • PagedResponse<T>                                │    │
│  │  • ErrorResponse                                   │    │
│  │  • MessageResponse                                 │    │
│  └────────────────────────────────────────────────────┘    │
│                                                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Exception Handling                                │    │
│  │  • GlobalExceptionHandler                          │    │
│  │  • Custom Exceptions                               │    │
│  │  • Error Response Formatting                       │    │
│  └────────────────────────────────────────────────────┘    │
│                                                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Security Utilities                                │    │
│  │  • EncryptionService                               │    │
│  │  • RateLimitService                                │    │
│  └────────────────────────────────────────────────────┘    │
│                                                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │  File Upload (Cloudinary)                          │    │
│  │  • CloudinaryConfig                                │    │
│  │  • CloudinaryService                               │    │
│  │  • FileUploadResponse                              │    │
│  │  • FileTypeSniffer / SvgSanitizer                  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Constants                                         │    │
│  │  • ErrorCode                                       │    │
│  │  • ResponseStatus                                  │    │
│  └────────────────────────────────────────────────────┘    │
└───────────────────────┬────────────────────────────────────┘
                        │
        ┌───────────────┼─────────────────┐
        │               │                 │
┌───────▼──────┐  ┌─────▼────────┐  ┌─────▼────────┐
│ Auth Service │  │ API Gateway  │  │ Other        │
│              │  │              │  │ Services     │
│ Uses:        │  │ Uses:        │  │ (e.g. LMS    │
│ • Responses  │  │ • Responses  │  │  Core)       │
│ • Exceptions │  │ • Exceptions │  │ • Responses  │
│ • Security   │  │              │  │ • Exceptions │
│              │  │              │  │ • Security   │
│              │  │              │  │ • File Upload│
└──────────────┘  └──────────────┘  └──────────────┘
```

### Dependency Structure

All microservices depend on `common-lib`:

```xml
<dependency>
    <groupId>com.edumind</groupId>
    <artifactId>common-lib</artifactId>
    <version>1.0.0-SNAPSHOT</version>
</dependency>
```

## Components

Quick reference — see the linked sections below for field-level detail and usage examples.

| Package | Class | Purpose |
|---|---|---|
| `com.edumind.common.response` | [`ApiResponse<T>`](#apiresponset) | Generic success response wrapper |
| | [`PagedResponse<T>`](#pagedresponset) | Paginated list response wrapper |
| | [`ErrorResponse`](#errorresponse) | Standardized error response |
| | [`MessageResponse`](#messageresponse) | Simple message-only response |
| `com.edumind.common.exception` | [`GlobalExceptionHandler`](#globalexceptionhandler) | `@RestControllerAdvice` handling all exceptions below |
| | `ResourceNotFoundException` | 404 Not Found |
| | `BadRequestException` | 400 Bad Request |
| | `TokenRefreshException` | 403 - refresh token invalid/expired |
| | `EmailSendException` | 500 - email delivery failure |
| | `FileUploadException` | 400 - file upload failure |
| | `TooManyRequestsException` | 429 - rate limit exceeded |
| `com.edumind.common.security` | [`EncryptionService`](#encryptionservice) | AES-256/GCM encrypt/decrypt |
| | [`RateLimitService`](#ratelimitservice) | Per-user lockout with exponential backoff |
| `com.edumind.common.config` | [`CloudinaryConfig`](#file-upload-cloudinary) | Builds the `Cloudinary` bean |
| `com.edumind.common.service` | [`CloudinaryService`](#file-upload-cloudinary) | Upload/delete files, images, icons on Cloudinary |
| `com.edumind.common.dto` | `FileUploadResponse` | Result DTO for Cloudinary uploads |
| `com.edumind.common.util` | `FileTypeSniffer`, `SvgSanitizer` | Magic-byte content sniffing, XXE-hardened SVG sanitization |
| `com.edumind.common.constants` | [`ErrorCode`](#errorcode) | Standardized error codes |
| | [`ResponseStatus`](#responsestatus) | Standardized status messages |

## Installation

### Building the Library

```bash
# From backend/common-lib directory
mvn clean install
```

This will:
1. Compile the library
2. Run tests (if any)
3. Install to local Maven repository
4. Create JAR file: `target/common-lib-1.0.0-SNAPSHOT.jar`

### Adding to a Service

Add the dependency to your service's `pom.xml`:

```xml
<dependencies>
    <dependency>
        <groupId>com.edumind</groupId>
        <artifactId>common-lib</artifactId>
        <version>1.0.0-SNAPSHOT</version>
    </dependency>
</dependencies>
```

**Note:** Since `common-lib` is part of the parent POM, it's automatically available to all child modules.

### Building All Services

When building from the parent directory:

```bash
# From backend directory
mvn clean install
```

This will:
1. Build `common-lib` first
2. Build all services that depend on it
3. Install all artifacts to local Maven repository

## Quick Start

A minimal controller showing the pieces working together — see the sections below for the full API of each.

```java
import com.edumind.common.response.ApiResponse;
import com.edumind.common.exception.ResourceNotFoundException;
import com.edumind.common.exception.BadRequestException;
import com.edumind.common.constants.ResponseStatus;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<User>> getUser(@PathVariable Long id) {
        User user = userService.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        return ResponseEntity.ok(ApiResponse.success(user));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<User>> createUser(@Valid @RequestBody UserRequest request) {
        if (userService.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already exists");
        }
        User user = userService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.created(ResponseStatus.CREATED, user));
    }
}
```

`ResourceNotFoundException` / `BadRequestException` and `@Valid` validation failures are automatically caught by [`GlobalExceptionHandler`](#globalexceptionhandler) and turned into a standard [`ErrorResponse`](#errorresponse) — no manual error handling needed in the controller.

## Response Models

### ApiResponse&lt;T&gt;

Generic API response wrapper for all successful responses.

**Fields:** `status` (int), `success` (boolean, always `true`), `message` (String), `data` (T), `timestamp` (LocalDateTime), `requestId` (String, optional), `path` (String, optional)

**Factory Methods:**
```java
ApiResponse.success(data)                              // 200, default message
ApiResponse.success("User retrieved successfully", data)
ApiResponse.created("User created successfully", data) // 201
```

**Example Response:**
```json
{
  "status": 200,
  "success": true,
  "message": "Success",
  "data": { "id": 1, "username": "johndoe", "email": "john@example.com" },
  "timestamp": "2026-08-14T10:30:00"
}
```

### PagedResponse&lt;T&gt;

Paginated response wrapper for list endpoints.

**Fields:** `status`, `success` (always `true`), `message`, `data` (`List<T>`), `pagination` (`PageMetadata`), `timestamp`, `requestId`, `path`

**PageMetadata:** `page`, `size`, `totalElements`, `totalPages`, `first`, `last`, `hasNext`, `hasPrevious`

**Factory Methods:**
```java
PagedResponse.of(page.getContent(), page.getNumber(), page.getSize(),
                 page.getTotalElements(), page.getTotalPages())
PagedResponse.ofList(data) // simple list, no pagination
```

**Example Response:**
```json
{
  "status": 200,
  "success": true,
  "message": "Success",
  "data": [{"id": 1, "username": "user1"}, {"id": 2, "username": "user2"}],
  "pagination": {
    "page": 0, "size": 10, "totalElements": 25, "totalPages": 3,
    "first": true, "last": false, "hasNext": true, "hasPrevious": false
  },
  "timestamp": "2026-08-14T10:30:00"
}
```

### ErrorResponse

Standardized error response format, built automatically by [`GlobalExceptionHandler`](#globalexceptionhandler) — you normally don't construct it manually.

**Fields:** `status` (int), `success` (always `false`), `error` (String — human-readable HTTP label, e.g. `"Bad Request"`, `"Not Found"`), `errorCode` (String — machine-readable code from `ErrorCode`, e.g. `"ERR_4000"`), `message`, `details` (`List<String>`, optional), `fieldErrors` (`Map<String,String>`, optional), `timestamp`, `requestId`, `path`, `trace` (String, optional, for debug scenarios)

`error` and `errorCode` always play these fixed roles — `error` is never a code and `errorCode` is never a label. Consumers that need to branch on error type (e.g. a frontend retry/refresh-token flow) should always read `errorCode`, never parse `error`.

**Factory Methods** (for building an error response outside the global handler, e.g. in a service that needs a specific shape directly):
```java
ErrorResponse.badRequest("Email already exists")
ErrorResponse.badRequest("Email already exists", ErrorCode.EMAIL_TAKEN) // errorCode overload
ErrorResponse.unauthorized("Invalid credentials")
ErrorResponse.forbidden("Access denied")
ErrorResponse.notFound("User not found")
ErrorResponse.conflict("Resource already exists")
ErrorResponse.internalServerError("Unexpected error")

ErrorResponse.notFound("User not found")   // fluent enrichment
    .withPath(request.getRequestURI())
    .withRequestId(requestId);
```

**Example Response:**
```json
{
  "status": 404,
  "success": false,
  "error": "Not Found",
  "errorCode": "ERR_4000",
  "message": "User not found with id: 123",
  "timestamp": "2026-08-14T10:30:00",
  "requestId": "abc12345",
  "path": "/api/users/123"
}
```

**Validation Error Example** (`details`/`fieldErrors` populated):
```json
{
  "status": 400,
  "success": false,
  "error": "Bad Request",
  "errorCode": "ERR_1001",
  "message": "Validation failed for one or more fields",
  "details": ["email: must be a well-formed email address", "password: size must be between 8 and 20"],
  "fieldErrors": {"email": "must be a well-formed email address", "password": "size must be between 8 and 20"},
  "timestamp": "2026-08-14T10:30:00",
  "requestId": "abc12345",
  "path": "/api/users"
}
```

### MessageResponse

Simple message response for operations that don't return data.

**Fields:** `status`, `success`, `message`, `timestamp`, `requestId` (optional)

**Factory Methods:**
```java
MessageResponse.success("User deleted successfully") // 200
MessageResponse.created("Resource created successfully") // 201
```

## Exception Handling

### GlobalExceptionHandler

A `@RestControllerAdvice` that automatically handles all exceptions thrown by controllers when `common-lib` is on the classpath — no per-service wiring needed. It provides centralized handling, a consistent `ErrorResponse` shape, a generated request ID per error, and structured logging.

| Exception | HTTP Status | `error` | `errorCode` | Notes |
|---|---|---|---|---|
| `ResourceNotFoundException` | 404 | `Not Found` | `ErrorCode.RESOURCE_NOT_FOUND` | Missing resource |
| `BadRequestException` | 400 | `Bad Request` | `ErrorCode.INVALID_INPUT` | Invalid client input |
| `FileUploadException` | 400 | `Bad Request` | `ErrorCode.INVALID_INPUT` | File upload failure |
| `EmailSendException` | 500 | `Internal Server Error` | `ErrorCode.INTERNAL_SERVER_ERROR` | Email delivery failure |
| `TokenRefreshException` | 403 | `Forbidden` | `ErrorCode.TOKEN_REFRESH_FAILED` | Refresh token invalid/expired |
| `TooManyRequestsException` | 429 | `Too Many Requests` | *(none)* | Rate limit exceeded |
| `BadCredentialsException` | 401 | `Unauthorized` | `ErrorCode.INVALID_CREDENTIALS` | Spring Security auth failure |
| `UsernameNotFoundException` | 404 | `Not Found` | `ErrorCode.RESOURCE_NOT_FOUND` | Spring Security - user lookup failure |
| `IllegalArgumentException` | 400 | `Bad Request` | `ErrorCode.INVALID_INPUT` | Invalid argument |
| `MethodArgumentNotValidException` | 400 | `Bad Request` | `ErrorCode.VALIDATION_ERROR` | `@Valid` failure — populates `details`/`fieldErrors` |
| `TaskRejectedException` | 429 | `Queue Full` | *(none)* | Async task queue saturated (e.g. AI processing) |
| `Exception` (catch-all) | 500 | `Internal Server Error` | `ErrorCode.INTERNAL_SERVER_ERROR` | Any unhandled exception |

`error` is always a fixed human-readable label per exception type; `errorCode` is always the matching `ErrorCode` constant (or absent for the two infrastructure-level errors above, which aren't domain error codes).

```java
throw new ResourceNotFoundException("User not found with id: " + id);
throw new BadRequestException("Email already exists");
throw new TokenRefreshException("Refresh token is invalid or expired");
```

See [ErrorResponse](#errorresponse) above for the exact JSON shapes (a plain error vs. a validation error with `details`/`fieldErrors`).

### Custom Exceptions

To add your own exception on top of `common-lib`'s handler:

```java
public class CustomException extends RuntimeException {
    public CustomException(String message) { super(message); }
    public CustomException(String message, Throwable cause) { super(message, cause); }
}
```

```java
@ExceptionHandler(CustomException.class)
public ResponseEntity<ErrorResponse> handleCustomException(CustomException ex, HttpServletRequest request) {
    ErrorResponse errorResponse = ErrorResponse.badRequest(ex.getMessage(), ErrorCode.INVALID_INPUT)
        .withPath(request.getRequestURI());
    return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
}
```

## Security Utilities

### EncryptionService

AES-256/GCM encryption service for encrypting sensitive data (e.g., 2FA secrets, OAuth tokens). Uses per-service keys, a secure random IV per call, and Base64 encoding for storage.

```java
@Autowired
private EncryptionService encryptionService;

String encrypted = encryptionService.encrypt("sensitive-data");
String decrypted = encryptionService.decrypt(encrypted);
```

**Configuration:**
```yaml
app:
  encryption:
    key: ${AUTH_SERVICE_ENCRYPTION_KEY}  # service-specific, 32 bytes
```

Each service should use its own key, stored in an env var / secrets manager (never committed), with different keys per environment.

### RateLimitService

In-memory rate limiting with exponential backoff lockout, used for login attempts, 2FA verification, password reset requests, and similar abuse-prone actions.

**Behavior:** keyed by `Long userId` (not a generic string key) · max **5** failed attempts before lockout · lockout starts at 60s and doubles on each subsequent lockout, capped at 3600s (1 hour) · state is an in-memory `ConcurrentHashMap` — per instance, lost on restart.

> Acceptable for dev/test and single-instance deployments. For production with horizontal scaling or cross-service rate limiting, replace with a Redis-backed implementation.

```java
@Autowired
private RateLimitService rateLimitService;

public void login(Long userId, String password) {
    rateLimitService.checkRateLimit(userId); // throws TooManyRequestsException if locked out

    boolean authenticated = /* ... verify password ... */ true;
    if (!authenticated) {
        rateLimitService.recordFailedAttempt(userId);
        throw new BadCredentialsException("Invalid credentials");
    }
    rateLimitService.recordSuccessfulAttempt(userId);
}
```

**API:** `checkRateLimit(userId)` · `recordFailedAttempt(userId)` · `recordSuccessfulAttempt(userId)` (clears state) · `clearLockout(userId)` (admin) · `getRemainingAttempts(userId)` · `isLockedOut(userId)`

## File Upload (Cloudinary)

Cloudinary-backed subsystem for uploading/deleting documents, images, and icons.

- **`CloudinaryConfig`** (`com.edumind.common.config`) — builds the `Cloudinary` bean from properties.
- **`CloudinaryService`** (`com.edumind.common.service`) — `uploadDocument`, `uploadPdf`, `uploadImage` (default 500x500 limit, or an overload with custom `maxWidth`/`maxHeight`), `uploadIcon` (JPEG/PNG/WEBP/SVG — SVG is sniffed and sanitized before upload), `deleteFile`, `extractPublicId`, `extractResourceType`. Max file size: 10MB.
- **`FileUploadResponse`** (`com.edumind.common.dto`) — result DTO: `publicId`, `url`, `fileName`, `fileType`, `resourceType`, `size`.
- **`FileTypeSniffer`** / **`SvgSanitizer`** (`com.edumind.common.util`) — magic-byte content detection (ignoring the client-supplied `Content-Type` header) and XXE-hardened, allowlist-based SVG sanitization.

```java
@Autowired
private CloudinaryService cloudinaryService;

// Custom max dimensions, e.g. for course thumbnails
FileUploadResponse thumb = cloudinaryService.uploadImage(file, "images/thumbnails", 1200, 900);

// Delete by URL
String publicId = cloudinaryService.extractPublicId(thumb.getUrl());
String resourceType = cloudinaryService.extractResourceType(thumb.getUrl());
cloudinaryService.deleteFile(publicId, resourceType);
```

**Configuration:**
```yaml
cloudinary:
  cloud-name: ${CLOUDINARY_CLOUD_NAME}
  api-key: ${CLOUDINARY_API_KEY}
  api-secret: ${CLOUDINARY_API_SECRET}
```

## Constants

### ErrorCode

Standardized error codes used across all services, grouped by category:

| Range | Category | Codes |
|---|---|---|
| 1xxx | General | `GENERAL_ERROR` (1000), `VALIDATION_ERROR` (1001), `INVALID_INPUT` (1002) |
| 2xxx | Authentication | `AUTH_FAILED` (2000), `INVALID_CREDENTIALS` (2001), `TOKEN_EXPIRED` (2002), `TOKEN_INVALID` (2003), `TOKEN_REFRESH_FAILED` (2004), `TOKEN_MISSING` (2005) |
| 3xxx | Authorization | `ACCESS_DENIED` (3000), `INSUFFICIENT_PERMISSIONS` (3001) |
| 4xxx | Resource | `RESOURCE_NOT_FOUND` (4000), `RESOURCE_ALREADY_EXISTS` (4001) |
| 5xxx | User | `USER_NOT_FOUND` (5000), `USERNAME_TAKEN` (5001), `EMAIL_TAKEN` (5002), `USER_INACTIVE` (5003) |
| 9xxx | Server | `INTERNAL_SERVER_ERROR` (9000), `DATABASE_ERROR` (9002) |

(Codes are strings, e.g. `ErrorCode.RESOURCE_NOT_FOUND` = `"ERR_4000"`.) These are applied automatically by `GlobalExceptionHandler`; reference them directly when building an `ErrorResponse` manually.

### ResponseStatus

Standardized response status messages:

- **Success:** `SUCCESS`, `CREATED`, `UPDATED`, `DELETED`
- **Auth:** `LOGIN_SUCCESS`, `LOGOUT_SUCCESS`, `REGISTER_SUCCESS`, `TOKEN_REFRESHED`
- **Error:** `INVALID_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `INTERNAL_ERROR`

```java
return ResponseEntity.ok(ApiResponse.success(ResponseStatus.CREATED, user));
```

## Known Issues / Backlog

### RateLimitService is single-instance only — blocker for multi-replica production

`RateLimitService` (see [Security Utilities](#ratelimitservice)) keeps state in an in-memory `ConcurrentHashMap`. This means lockout state is **not shared across service instances** — with multiple replicas behind a load balancer, an attacker can bypass the 5-attempt lockout simply by having requests land on different pods, and all lockout state resets on every restart/deploy.

This is acceptable for local dev, testing, and genuinely single-instance deployments, but is a **real blocker before running auth-service/lms-core-service with more than one replica in production**.

**Follow-up task (not yet scheduled):** replace the in-memory store with a Redis-backed implementation.
- Keep the exact same public method signatures (`checkRateLimit`, `recordFailedAttempt`, `recordSuccessfulAttempt`, `clearLockout`, `getRemainingAttempts`, `isLockedOut`, all keyed by `Long userId`) so no caller (e.g. auth-service's login flow) needs to change.
- Store per-user attempt count + lockout-until timestamp in Redis with a TTL matching the lockout window, using atomic operations (e.g. `INCR` + `EXPIRE`, or a Lua script) to avoid race conditions under concurrent requests.
- Requires Redis to be provisioned and reachable from every service that depends on `common-lib`'s rate limiting (auth-service today) — confirm this exists in the deployment target (docker-compose/k8s) before starting.

## Best Practices

**Response Models**
- Always wrap success responses in `ApiResponse` / `PagedResponse` — never return a raw entity/list from a controller.
- Provide meaningful `message` values instead of generic ones like `"OK"`.
- Use the right HTTP status via `ResponseEntity.status(...)`, matched to `ApiResponse.created`/`success`.

**Exception Handling**
- Throw the specific exception (`ResourceNotFoundException`, `BadRequestException`, ...) instead of a generic `RuntimeException`.
- Include context in messages (e.g. the id/email involved), but never leak internal/stack details to the client — that's what `requestId` and server-side logs are for.
- Let `GlobalExceptionHandler` build the `ErrorResponse`; don't hand-construct one in a controller unless you're adding a handler for a new exception type.

**Security**
- Always encrypt sensitive data (2FA secrets, tokens) via `EncryptionService` before persisting it.
- Use a distinct encryption key per service/environment; never commit keys.
- Call `RateLimitService.checkRateLimit()` at the start of any abuse-prone endpoint (login, 2FA, password reset).

**Code Organization**
- Import specific classes (`import com.edumind.common.response.ApiResponse;`), not wildcard imports.
- Don't duplicate common-lib functionality in a service — extend or contribute back to common-lib instead.

**Versioning**
- Don't remove or repurpose existing fields in response models; add new fields as optional.
- Update this README when adding or changing a public class/method in common-lib.

---

**Last Updated:** 2026-08-14  
**Version:** 1.0.0-SNAPSHOT  
**Maintainers:** EduMind Development Team
