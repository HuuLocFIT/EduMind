# Common Library

Shared library for EduMind Platform microservices - Provides common utilities, response models, exception handling, and security services used across all microservices.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Components](#components)
- [Installation](#installation)
- [Usage](#usage)
- [Response Models](#response-models)
- [Exception Handling](#exception-handling)
- [Security Utilities](#security-utilities)
- [Constants](#constants)
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
- Lombok (for reducing boilerplate)
- Jackson (for JSON serialization)
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
│ Uses:        │  │ Uses:        │  │              │
│ • Responses  │  │ • Responses  │  │ • Responses  │
│ • Exceptions │  │ • Exceptions │  │ • Exceptions │
│ • Security   │  │              │  │ • Security   │
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

### 1. Response Models (`com.edumind.common.response`)

Standardized response formats for all API endpoints:

- **`ApiResponse<T>`** - Generic API response wrapper
- **`PagedResponse<T>`** - Paginated response wrapper
- **`ErrorResponse`** - Standardized error response
- **`MessageResponse`** - Simple message response

### 2. Exception Handling (`com.edumind.common.exception`)

Centralized exception handling and custom exceptions:

- **`GlobalExceptionHandler`** - Global exception handler with `@RestControllerAdvice`
- **`ResourceNotFoundException`** - 404 Not Found
- **`BadRequestException`** - 400 Bad Request
- **`TokenRefreshException`** - Token refresh errors
- **`EmailSendException`** - Email sending errors
- **`FileUploadException`** - File upload errors
- **`TooManyRequestsException`** - 429 Rate Limit errors

### 3. Security Utilities (`com.edumind.common.security`)

Security-related utilities:

- **`EncryptionService`** - AES/GCM encryption/decryption
- **`RateLimitService`** - Rate limiting utilities

### 4. Constants (`com.edumind.common.constants`)

Shared constants across services:

- **`ErrorCode`** - Standardized error codes
- **`ResponseStatus`** - Response status messages

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

## Usage

### Using Response Models

#### ApiResponse

```java
import com.edumind.common.response.ApiResponse;

// Success response with data
@GetMapping("/users/{id}")
public ResponseEntity<ApiResponse<User>> getUser(@PathVariable Long id) {
    User user = userService.findById(id);
    return ResponseEntity.ok(ApiResponse.success(user));
}

// Success response with custom message
@PostMapping("/users")
public ResponseEntity<ApiResponse<User>> createUser(@RequestBody UserRequest request) {
    User user = userService.create(request);
    return ResponseEntity.ok(ApiResponse.success("User created successfully", user));
}

// Created response (201)
@PostMapping("/users")
public ResponseEntity<ApiResponse<User>> createUser(@RequestBody UserRequest request) {
    User user = userService.create(request);
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(ApiResponse.created("User created successfully", user));
}
```

#### PagedResponse

```java
import com.edumind.common.response.PagedResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@GetMapping("/users")
public ResponseEntity<PagedResponse<User>> getUsers(Pageable pageable) {
    Page<User> page = userService.findAll(pageable);
    
    return ResponseEntity.ok(PagedResponse.of(
        page.getContent(),
        page.getNumber(),
        page.getSize(),
        page.getTotalElements(),
        page.getTotalPages()
    ));
}
```

#### ErrorResponse

```java
import com.edumind.common.response.ErrorResponse;

// ErrorResponse is automatically created by GlobalExceptionHandler
// You don't need to create it manually in controllers
```

### Using Exception Handling

#### Global Exception Handler

The `GlobalExceptionHandler` is automatically active when `common-lib` is included. It handles:

- `ResourceNotFoundException` → 404 Not Found
- `BadRequestException` → 400 Bad Request
- `TokenRefreshException` → 403 Forbidden
- `TooManyRequestsException` → 429 Too Many Requests
- `BadCredentialsException` → 401 Unauthorized
- `MethodArgumentNotValidException` → 400 Bad Request (validation errors)
- `Exception` → 500 Internal Server Error

#### Throwing Custom Exceptions

```java
import com.edumind.common.exception.ResourceNotFoundException;
import com.edumind.common.exception.BadRequestException;

@GetMapping("/users/{id}")
public ResponseEntity<ApiResponse<User>> getUser(@PathVariable Long id) {
    User user = userService.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
    
    return ResponseEntity.ok(ApiResponse.success(user));
}

@PostMapping("/users")
public ResponseEntity<ApiResponse<User>> createUser(@RequestBody UserRequest request) {
    if (userService.existsByEmail(request.getEmail())) {
        throw new BadRequestException("Email already exists");
    }
    
    User user = userService.create(request);
    return ResponseEntity.ok(ApiResponse.success(user));
}
```

### Using Security Utilities

#### EncryptionService

```java
import com.edumind.common.security.EncryptionService;
import org.springframework.beans.factory.annotation.Autowired;

@Service
public class UserService {
    @Autowired
    private EncryptionService encryptionService;
    
    public void save2FASecret(Long userId, String secret) {
        // Encrypt sensitive data
        String encryptedSecret = encryptionService.encrypt(secret);
        userRepository.save2FASecret(userId, encryptedSecret);
    }
    
    public String get2FASecret(Long userId) {
        String encryptedSecret = userRepository.get2FASecret(userId);
        // Decrypt when needed
        return encryptionService.decrypt(encryptedSecret);
    }
}
```

**Configuration:**
```yaml
# application.yml
app:
  encryption:
    key: ${AUTH_SERVICE_ENCRYPTION_KEY}  # Service-specific key
```

#### RateLimitService

```java
import com.edumind.common.security.RateLimitService;
import org.springframework.beans.factory.annotation.Autowired;

@Service
public class AuthService {
    @Autowired
    private RateLimitService rateLimitService;
    
    public void login(String username, String password) {
        // Check rate limit
        if (!rateLimitService.isAllowed(username, 5, 60)) {
            throw new TooManyRequestsException("Too many login attempts");
        }
        
        // Proceed with login
        // ...
    }
}
```

### Using Constants

#### ErrorCode

```java
import com.edumind.common.constants.ErrorCode;

// Error codes are used automatically by GlobalExceptionHandler
// You can also use them in custom error handling
if (user == null) {
    throw new ResourceNotFoundException("User not found");
    // ErrorCode.RESOURCE_NOT_FOUND will be used automatically
}
```

#### ResponseStatus

```java
import com.edumind.common.constants.ResponseStatus;

@PostMapping("/users")
public ResponseEntity<ApiResponse<User>> createUser(@RequestBody UserRequest request) {
    User user = userService.create(request);
    return ResponseEntity.ok(ApiResponse.success(ResponseStatus.CREATED, user));
}
```

## Response Models

### ApiResponse<T>

Generic API response wrapper for all successful responses.

**Fields:**
- `status` (int) - HTTP status code
- `success` (boolean) - Always `true` for success responses
- `message` (String) - Success message
- `data` (T) - Response data (generic type)
- `timestamp` (LocalDateTime) - Response timestamp
- `requestId` (String) - Optional request ID for tracing
- `path` (String) - Optional request path

**Example Response:**
```json
{
  "status": 200,
  "success": true,
  "message": "Success",
  "data": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com"
  },
  "timestamp": "2025-01-20T10:30:00"
}
```

**Factory Methods:**
```java
// Simple success
ApiResponse.success(data)

// Success with message
ApiResponse.success("User retrieved successfully", data)

// Created (201)
ApiResponse.created("User created successfully", data)
```

### PagedResponse<T>

Paginated response wrapper for list endpoints.

**Fields:**
- `status` (int) - HTTP status code
- `success` (boolean) - Always `true`
- `message` (String) - Success message
- `data` (List<T>) - List of items
- `pagination` (PageMetadata) - Pagination metadata
- `timestamp` (LocalDateTime) - Response timestamp
- `requestId` (String) - Optional request ID
- `path` (String) - Optional request path

**PageMetadata Fields:**
- `page` (int) - Current page number (0-indexed)
- `size` (int) - Page size
- `totalElements` (long) - Total number of elements
- `totalPages` (int) - Total number of pages
- `first` (boolean) - Is first page
- `last` (boolean) - Is last page
- `hasNext` (boolean) - Has next page
- `hasPrevious` (boolean) - Has previous page

**Example Response:**
```json
{
  "status": 200,
  "success": true,
  "message": "Success",
  "data": [
    {"id": 1, "username": "user1"},
    {"id": 2, "username": "user2"}
  ],
  "pagination": {
    "page": 0,
    "size": 10,
    "totalElements": 25,
    "totalPages": 3,
    "first": true,
    "last": false,
    "hasNext": true,
    "hasPrevious": false
  },
  "timestamp": "2025-01-20T10:30:00"
}
```

**Factory Methods:**
```java
// From Spring Data Page
PagedResponse.of(page.getContent(), page.getNumber(), page.getSize(), 
                 page.getTotalElements(), page.getTotalPages())

// Simple list (no pagination)
PagedResponse.ofList(data)
```

### ErrorResponse

Standardized error response format.

**Fields:**
- `status` (int) - HTTP status code
- `success` (boolean) - Always `false`
- `error` (String) - Error code (from ErrorCode constants)
- `message` (String) - Error message
- `details` (List<String>) - Optional error details
- `fieldErrors` (Map<String, String>) - Field validation errors
- `timestamp` (LocalDateTime) - Error timestamp
- `requestId` (String) - Request ID for tracing
- `path` (String) - Request path

**Example Response:**
```json
{
  "status": 404,
  "success": false,
  "error": "ERR_4000",
  "message": "User not found with id: 123",
  "timestamp": "2025-01-20T10:30:00",
  "requestId": "abc12345",
  "path": "/api/users/123"
}
```

**Validation Error Example:**
```json
{
  "status": 400,
  "success": false,
  "error": "ERR_1001",
  "message": "Validation failed for one or more fields",
  "details": [
    "email: must be a well-formed email address",
    "password: size must be between 8 and 20"
  ],
  "fieldErrors": {
    "email": "must be a well-formed email address",
    "password": "size must be between 8 and 20"
  },
  "timestamp": "2025-01-20T10:30:00",
  "requestId": "abc12345",
  "path": "/api/users"
}
```

### MessageResponse

Simple message response for operations that don't return data.

**Fields:**
- `status` (int) - HTTP status code
- `success` (boolean) - Success status
- `message` (String) - Response message
- `timestamp` (LocalDateTime) - Response timestamp

**Example Response:**
```json
{
  "status": 200,
  "success": true,
  "message": "User deleted successfully",
  "timestamp": "2025-01-20T10:30:00"
}
```

## Exception Handling

### GlobalExceptionHandler

The `GlobalExceptionHandler` is a `@RestControllerAdvice` that automatically handles all exceptions thrown by controllers. It provides:

- **Centralized Error Handling** - All exceptions handled in one place
- **Consistent Error Format** - All errors follow the same `ErrorResponse` format
- **Request ID Generation** - Each error gets a unique request ID for tracing
- **Logging** - All errors are logged with context
- **Field Validation** - Special handling for validation errors

### Handled Exceptions

#### ResourceNotFoundException (404)

```java
throw new ResourceNotFoundException("User not found with id: 123");
```

**Response:**
```json
{
  "status": 404,
  "success": false,
  "error": "ERR_4000",
  "message": "User not found with id: 123",
  "timestamp": "2025-01-20T10:30:00",
  "requestId": "abc12345",
  "path": "/api/users/123"
}
```

#### BadRequestException (400)

```java
throw new BadRequestException("Email already exists");
```

**Response:**
```json
{
  "status": 400,
  "success": false,
  "error": "ERR_1002",
  "message": "Email already exists",
  "timestamp": "2025-01-20T10:30:00",
  "requestId": "abc12345",
  "path": "/api/users"
}
```

#### TokenRefreshException (403)

```java
throw new TokenRefreshException("Refresh token is invalid or expired");
```

**Response:**
```json
{
  "status": 403,
  "success": false,
  "error": "ERR_2004",
  "message": "Refresh token is invalid or expired",
  "timestamp": "2025-01-20T10:30:00",
  "requestId": "abc12345",
  "path": "/api/auth/refresh"
}
```

#### TooManyRequestsException (429)

```java
throw new TooManyRequestsException("Rate limit exceeded");
```

**Response:**
```json
{
  "status": 429,
  "success": false,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded",
  "timestamp": "2025-01-20T10:30:00"
}
```

#### BadCredentialsException (401)

Thrown by Spring Security when authentication fails.

**Response:**
```json
{
  "status": 401,
  "success": false,
  "error": "ERR_2001",
  "message": "Invalid username/email or password",
  "timestamp": "2025-01-20T10:30:00",
  "requestId": "abc12345",
  "path": "/api/auth/login"
}
```

#### MethodArgumentNotValidException (400)

Automatically handled when `@Valid` validation fails.

**Response:**
```json
{
  "status": 400,
  "success": false,
  "error": "ERR_1001",
  "message": "Validation failed for one or more fields",
  "details": [
    "email: must be a well-formed email address",
    "password: size must be between 8 and 20"
  ],
  "fieldErrors": {
    "email": "must be a well-formed email address",
    "password": "size must be between 8 and 20"
  },
  "timestamp": "2025-01-20T10:30:00",
  "requestId": "abc12345",
  "path": "/api/users"
}
```

#### Generic Exception (500)

All unhandled exceptions are caught and returned as 500 errors.

**Response:**
```json
{
  "status": 500,
  "success": false,
  "error": "ERR_9000",
  "message": "An unexpected error occurred. Please try again later.",
  "timestamp": "2025-01-20T10:30:00",
  "requestId": "abc12345",
  "path": "/api/users"
}
```

### Custom Exceptions

#### Creating Custom Exceptions

```java
package com.yourpackage.exception;

public class CustomException extends RuntimeException {
    public CustomException(String message) {
        super(message);
    }
    
    public CustomException(String message, Throwable cause) {
        super(message, cause);
    }
}
```

#### Adding Handler for Custom Exception

```java
@ExceptionHandler(CustomException.class)
public ResponseEntity<ErrorResponse> handleCustomException(
        CustomException ex, HttpServletRequest request) {
    
    String requestId = generateRequestId();
    logger.error("❌ [{}] Custom error: {}", requestId, ex.getMessage());
    
    ErrorResponse errorResponse = ErrorResponse.builder()
            .status(HttpStatus.BAD_REQUEST.value())
            .success(false)
            .error(ErrorCode.INVALID_INPUT)
            .message(ex.getMessage())
            .timestamp(LocalDateTime.now())
            .requestId(requestId)
            .path(request.getRequestURI())
            .build();
    
    return new ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
}
```

### Exception Best Practices

1. **Use Appropriate Exceptions**
   - `ResourceNotFoundException` for missing resources
   - `BadRequestException` for invalid input
   - `TokenRefreshException` for token issues

2. **Provide Clear Messages**
   ```java
   // Good
   throw new ResourceNotFoundException("User not found with id: " + id);
   
   // Bad
   throw new ResourceNotFoundException("Not found");
   ```

3. **Include Context**
   ```java
   throw new BadRequestException(
       String.format("Email %s is already registered", email)
   );
   ```

4. **Don't Expose Internal Details**
   - Error messages should be user-friendly
   - Internal details should only be in logs
   - Use request ID for tracing

## Security Utilities

### EncryptionService

AES/GCM encryption service for encrypting sensitive data (e.g., 2FA secrets, OAuth tokens).

**Features:**
- AES-256 encryption with GCM mode
- Per-service encryption keys (key isolation)
- Secure random IV generation
- Base64 encoding for storage

**Usage:**
```java
@Autowired
private EncryptionService encryptionService;

// Encrypt
String plaintext = "sensitive-data";
String encrypted = encryptionService.encrypt(plaintext);

// Decrypt
String decrypted = encryptionService.decrypt(encrypted);
```

**Configuration:**
```yaml
# application.yml
app:
  encryption:
    key: ${AUTH_SERVICE_ENCRYPTION_KEY}  # Service-specific key (32 bytes)
```

**Security Notes:**
- Each service should have its own encryption key
- Keys should be stored securely (environment variables, secrets manager)
- Never commit keys to version control
- Use different keys for dev/staging/production

### RateLimitService

Rate limiting service for preventing abuse.

**Features:**
- In-memory rate limiting
- Per-key rate limiting (e.g., per user, per IP)
- Configurable limits (max attempts, time window)

**Usage:**
```java
@Autowired
private RateLimitService rateLimitService;

// Check if allowed (5 attempts per 60 seconds)
String key = "user:" + userId;
if (!rateLimitService.isAllowed(key, 5, 60)) {
    throw new TooManyRequestsException("Too many attempts");
}

// Record attempt
rateLimitService.recordAttempt(key);
```

**Parameters:**
- `key` - Unique identifier (e.g., username, IP address)
- `maxAttempts` - Maximum number of attempts allowed
- `windowSeconds` - Time window in seconds

## Constants

### ErrorCode

Standardized error codes used across all services.

**Error Code Categories:**
- **1xxx** - General Errors
  - `ERR_1000` - General Error
  - `ERR_1001` - Validation Error
  - `ERR_1002` - Invalid Input

- **2xxx** - Authentication Errors
  - `ERR_2000` - Authentication Failed
  - `ERR_2001` - Invalid Credentials
  - `ERR_2002` - Token Expired
  - `ERR_2003` - Token Invalid
  - `ERR_2004` - Token Refresh Failed

- **3xxx** - Authorization Errors
  - `ERR_3000` - Access Denied
  - `ERR_3001` - Insufficient Permissions

- **4xxx** - Resource Errors
  - `ERR_4000` - Resource Not Found
  - `ERR_4001` - Resource Already Exists

- **5xxx** - User Errors
  - `ERR_5000` - User Not Found
  - `ERR_5001` - Username Taken
  - `ERR_5002` - Email Taken
  - `ERR_5003` - User Inactive

- **9xxx** - Server Errors
  - `ERR_9000` - Internal Server Error
  - `ERR_9002` - Database Error

**Usage:**
```java
import com.edumind.common.constants.ErrorCode;

// Error codes are automatically used by GlobalExceptionHandler
// You can also reference them in custom error handling
if (user == null) {
    throw new ResourceNotFoundException("User not found");
    // ErrorCode.RESOURCE_NOT_FOUND will be used automatically
}
```

### ResponseStatus

Standardized response status messages.

**Success Messages:**
- `SUCCESS` - "Operation completed successfully"
- `CREATED` - "Resource created successfully"
- `UPDATED` - "Resource updated successfully"
- `DELETED` - "Resource deleted successfully"

**Auth Messages:**
- `LOGIN_SUCCESS` - "Login successful"
- `LOGOUT_SUCCESS` - "Logout successful"
- `REGISTER_SUCCESS` - "Registration successful"
- `TOKEN_REFRESHED` - "Token refreshed successfully"

**Error Messages:**
- `INVALID_REQUEST` - "Invalid request"
- `UNAUTHORIZED` - "Authentication required"
- `FORBIDDEN` - "Access denied"
- `NOT_FOUND` - "Resource not found"
- `INTERNAL_ERROR` - "An unexpected error occurred"

**Usage:**
```java
import com.edumind.common.constants.ResponseStatus;

@PostMapping("/users")
public ResponseEntity<ApiResponse<User>> createUser(@RequestBody UserRequest request) {
    User user = userService.create(request);
    return ResponseEntity.ok(ApiResponse.success(ResponseStatus.CREATED, user));
}
```

## Best Practices

### Response Models

1. **Always Use ApiResponse for Success Responses**
   ```java
   // Good
   return ResponseEntity.ok(ApiResponse.success(user));
   
   // Bad
   return ResponseEntity.ok(user);
   ```

2. **Use PagedResponse for List Endpoints**
   ```java
   // Good
   return ResponseEntity.ok(PagedResponse.of(
       page.getContent(), page.getNumber(), page.getSize(),
       page.getTotalElements(), page.getTotalPages()
   ));
   ```

3. **Provide Meaningful Messages**
   ```java
   // Good
   ApiResponse.success("User created successfully", user)
   
   // Bad
   ApiResponse.success("OK", user)
   ```

4. **Use Appropriate HTTP Status Codes**
   ```java
   // Created resource
   return ResponseEntity.status(HttpStatus.CREATED)
       .body(ApiResponse.created("User created", user));
   
   // Updated resource
   return ResponseEntity.ok(ApiResponse.success("User updated", user));
   ```

### Exception Handling

1. **Use Specific Exceptions**
   ```java
   // Good
   throw new ResourceNotFoundException("User not found with id: " + id);
   
   // Bad
   throw new RuntimeException("Error");
   ```

2. **Provide Context in Error Messages**
   ```java
   // Good
   throw new BadRequestException(
       String.format("Email %s is already registered", email)
   );
   
   // Bad
   throw new BadRequestException("Invalid");
   ```

3. **Don't Catch and Swallow Exceptions**
   ```java
   // Good
   try {
       // operation
   } catch (SpecificException e) {
       logger.error("Error: {}", e.getMessage(), e);
       throw new BadRequestException("Operation failed: " + e.getMessage());
   }
   
   // Bad
   try {
       // operation
   } catch (Exception e) {
       // silently ignore
   }
   ```

4. **Let GlobalExceptionHandler Handle Exceptions**
   - Don't manually create ErrorResponse in controllers
   - Throw exceptions and let the handler format them
   - Use request ID for tracing

### Security

1. **Encrypt Sensitive Data**
   ```java
   // Always encrypt sensitive data before storing
   String encrypted = encryptionService.encrypt(plaintext);
   userRepository.saveSecret(userId, encrypted);
   ```

2. **Use Service-Specific Encryption Keys**
   ```yaml
   # Each service should have its own key
   app:
     encryption:
       key: ${AUTH_SERVICE_ENCRYPTION_KEY}  # Not shared across services
   ```

3. **Implement Rate Limiting**
   ```java
   // Protect sensitive endpoints
   if (!rateLimitService.isAllowed(key, maxAttempts, windowSeconds)) {
       throw new TooManyRequestsException("Rate limit exceeded");
   }
   ```

### Code Organization

1. **Import from Common Package**
   ```java
   // Good
   import com.edumind.common.response.ApiResponse;
   import com.edumind.common.exception.ResourceNotFoundException;
   
   // Bad
   import com.edumind.common.*;
   ```

2. **Don't Duplicate Common Code**
   - Use common-lib instead of creating duplicate utilities
   - Extend common-lib if you need additional functionality
   - Contribute back to common-lib if functionality is reusable

3. **Follow Naming Conventions**
   - Use `ApiResponse` for all API responses
   - Use `PagedResponse` for paginated responses
   - Use `ErrorResponse` for errors (handled automatically)

### Testing

1. **Test Response Formats**
   ```java
   @Test
   void testGetUser() {
       ResponseEntity<ApiResponse<User>> response = controller.getUser(1L);
       
       assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
       assertThat(response.getBody().isSuccess()).isTrue();
       assertThat(response.getBody().getData()).isNotNull();
   }
   ```

2. **Test Exception Handling**
   ```java
   @Test
   void testGetUserNotFound() {
       assertThrows(ResourceNotFoundException.class, () -> {
           controller.getUser(999L);
       });
   }
   ```

3. **Test Error Responses**
   ```java
   @Test
   void testValidationError() {
       // Trigger validation error
       ResponseEntity<ErrorResponse> response = // ...
       
       assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
       assertThat(response.getBody().getError()).isEqualTo(ErrorCode.VALIDATION_ERROR);
       assertThat(response.getBody().getFieldErrors()).isNotEmpty();
   }
   ```

### Versioning

1. **Keep Backward Compatibility**
   - Don't remove fields from response models
   - Add new fields as optional
   - Use versioning for breaking changes

2. **Document Changes**
   - Update README when adding new features
   - Document breaking changes
   - Provide migration guides

### Performance

1. **Use Builder Pattern**
   ```java
   // Response models use Lombok @Builder for efficient object creation
   ApiResponse.builder()
       .status(200)
       .success(true)
       .data(user)
       .build();
   ```

2. **Avoid Null Data**
   ```java
   // Good - use Optional or empty list
   ApiResponse.success(Collections.emptyList())
   
   // Bad - null data
   ApiResponse.success(null)
   ```

---

**Last Updated:** 2025-01-20  
**Version:** 1.0.0-SNAPSHOT  
**Maintainers:** EduMind Development Team

