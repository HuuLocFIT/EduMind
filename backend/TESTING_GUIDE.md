# Spring Boot Testing Guide 🧪

> A detailed guide from basics to advanced, designed for beginners.

---

## Table of Contents

1. [Introduction to Testing](#1-introduction-to-testing)
2. [Types of Tests in Spring Boot](#2-types-of-tests-in-spring-boot)
3. [Basic Test Structure](#3-basic-test-structure)
4. [JUnit 5 - Testing Framework](#4-junit-5---testing-framework)
5. [Mockito - Mocking Dependencies](#5-mockito---mocking-dependencies)
6. [Unit Test for Service](#6-unit-test-for-service)
7. [Repository Test with @DataJpaTest](#7-repository-test-with-datajpatest)
8. [Controller Test with @WebMvcTest](#8-controller-test-with-webmvctest)
9. [Integration Test with @SpringBootTest](#9-integration-test-with-springboottest)
10. [Best Practices](#10-best-practices)

---

## 1. Introduction to Testing

### Why Write Tests?

```
┌─────────────────────────────────────────────────────────┐
│  Without Tests              │  With Tests               │
├─────────────────────────────────────────────────────────┤
│  ❌ Afraid to change code    │  ✅ Confident to refactor │
│  ❌ Bugs found late          │  ✅ Bugs found early      │
│  ❌ Manual debugging         │  ✅ Automated checking    │
│  ❌ Hard to maintain         │  ✅ Easy to maintain      │
└─────────────────────────────────────────────────────────┘
```

### Test Pyramid

```
          ┌───────────┐
          │Integration│  ← Few tests, slow, test entire flow
          │   Tests   │
         ─┴───────────┴─
        ┌───────────────┐
        │  Controller   │  ← Test API endpoints
        │    Tests      │
       ─┴───────────────┴─
      ┌───────────────────┐
      │   Repository      │  ← Test database queries
      │     Tests         │
     ─┴───────────────────┴─
    ┌───────────────────────┐
    │      Unit Tests       │  ← Many tests, fast, test logic
    │   (Service layer)     │
    └───────────────────────┘
```

---

## 2. Types of Tests in Spring Boot

| Test Type | Annotation | Purpose | Speed |
|-----------|------------|----------|--------|
| Unit Test | `@ExtendWith(MockitoExtension.class)` | Test individual business logic | ⚡ Very fast |
| Repository Test | `@DataJpaTest` | Test database queries | 🚀 Fast |
| Controller Test | `@WebMvcTest` | Test REST endpoints | 🚀 Fast |
| Integration Test | `@SpringBootTest` | Test entire flow | 🐢 Slow |

---

## 3. Basic Test Structure

### AAA Pattern (Arrange - Act - Assert)

Every test follows 3 steps:

```java
@Test
void testMethodName_WhenCondition_ShouldExpectedResult() {
    // ========== ARRANGE (Given) ==========
    // Prepare input data and mocks
    String input = "test data";
    when(mockRepository.findById(1L)).thenReturn(Optional.of(testUser));
    
    // ========== ACT (When) ==========
    // Execute the action to test
    String result = serviceUnderTest.processData(input);
    
    // ========== ASSERT (Then) ==========
    // Verify the result
    assertEquals("expected result", result);
    verify(mockRepository).findById(1L);
}
```

### Test File Structure

```
src/
├── main/java/com/edumind/auth/
│   └── service/
│       └── AuthService.java          ← Main code
│
└── test/java/com/edumind/auth/
    └── service/
        └── AuthServiceTest.java      ← Test for AuthService
```

> **Naming rule**: `[ClassName]Test.java` - Example: `AuthService.java` → `AuthServiceTest.java`

---

## 4. JUnit 5 - Testing Framework

### Important Annotations

```java
import org.junit.jupiter.api.*;  // Import JUnit 5

class MyServiceTest {

    @BeforeAll
    static void setupOnce() {
        // Runs ONCE BEFORE ALL tests
        // Used for expensive setup (database connection, etc.)
    }

    @BeforeEach
    void setupEachTest() {
        // Runs BEFORE EACH test
        // Used to reset state, create new test data
    }

    @Test
    @DisplayName("Readable description for this test")
    void myTest() {
        // Test code here
    }

    @AfterEach
    void cleanupEachTest() {
        // Runs AFTER EACH test
        // Used to clean up resources
    }

    @AfterAll
    static void cleanupOnce() {
        // Runs ONCE AFTER ALL tests
    }
}
```

### Common Assertions

```java
import static org.junit.jupiter.api.Assertions.*;

// ===== Value comparison =====
assertEquals(expected, actual);           // Check equality
assertEquals("msg", expected, actual);    // With custom message
assertNotEquals(unexpected, actual);      // Check inequality

// ===== Boolean =====
assertTrue(condition);                    // Check true
assertFalse(condition);                   // Check false

// ===== Null check =====
assertNull(object);                       // Check null
assertNotNull(object);                    // Check not null

// ===== Exception =====
assertThrows(ExceptionClass.class, () -> {
    // Code that will throw exception
    service.methodThatThrows();
});

// ===== Instance check =====
assertInstanceOf(ExpectedClass.class, object);

// ===== No exception thrown =====
assertDoesNotThrow(() -> {
    service.safeMethod();
});
```

### Organizing Tests with @Nested

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Nested
    @DisplayName("getCurrentUser Tests")
    class GetCurrentUserTests {
        
        @Test
        @DisplayName("Returns user when authenticated")
        void getCurrentUser_WhenAuthenticated_ShouldReturnUser() {
            // test code
        }

        @Test
        @DisplayName("Throws exception when user not found")
        void getCurrentUser_WhenUserNotFound_ShouldThrowException() {
            // test code
        }
    }

    @Nested
    @DisplayName("updateProfile Tests")
    class UpdateProfileTests {
        // Tests for updateProfile
    }
}
```

> `@Nested` helps group related tests together, making them easier to read and maintain.

---

## 5. Mockito - Mocking Dependencies

### Why Do We Need Mocks?

When testing `AuthService`, we DON'T want to:
- Connect to a real database
- Send real emails
- Call external APIs

→ We use **Mocks** to simulate these dependencies.

```
┌──────────────────────────────────────────────────────────┐
│                    AuthService                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │UserRepository│  │PasswordEncoder│  │ EmailService │   │
│  │    (MOCK)    │  │    (MOCK)    │  │    (MOCK)    │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### Mockito Annotations

```java
@ExtendWith(MockitoExtension.class)  // Activate Mockito
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;    // Create mock object

    @Mock
    private PasswordEncoder passwordEncoder;  // Create mock object

    @InjectMocks
    private AuthService authService;          // Inject mocks here
}
```

### `when().thenReturn()` Syntax

```java
// ===== Return a value =====
when(userRepository.findById(1L))
    .thenReturn(Optional.of(testUser));

// ===== Return different values on each call =====
when(tokenProvider.generateToken())
    .thenReturn("token1")
    .thenReturn("token2");

// ===== Return value based on input =====
when(passwordEncoder.encode(anyString()))
    .thenAnswer(invocation -> {
        String input = invocation.getArgument(0);
        return "encoded_" + input;
    });

// ===== Throw exception =====
when(userRepository.findById(999L))
    .thenThrow(new ResourceNotFoundException("User not found"));

// ===== For void methods =====
doNothing().when(emailService).sendEmail(any());
doThrow(new RuntimeException()).when(emailService).sendEmail(any());
```

### Argument Matchers

```java
import static org.mockito.ArgumentMatchers.*;

// ===== Any value =====
when(repo.findByEmail(anyString())).thenReturn(Optional.empty());
when(repo.findById(anyLong())).thenReturn(Optional.of(user));

// ===== Any object =====
when(repo.save(any(User.class))).thenReturn(savedUser);

// ===== Check specific argument =====
when(repo.save(argThat(user -> 
    user.getEmail().endsWith("@example.com")
))).thenReturn(savedUser);
```

### Verify - Check if Method Was Called

```java
// ===== Verify method was called =====
verify(emailService).sendEmail(any());

// ===== Verify called correct number of times =====
verify(repository, times(2)).save(any());
verify(repository, never()).delete(any());
verify(repository, atLeastOnce()).findById(anyLong());

// ===== Verify with specific argument =====
verify(repository).save(argThat(user -> 
    "newuser".equals(user.getUsername())
));
```

---

## 6. Unit Test for Service

### Complete Example: Testing registerUser

```java
package com.edumind.auth.service;

import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)  // ① Activate Mockito
class AuthServiceTest {

    // ② Create mock objects
    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private EmailVerificationService emailVerificationService;

    // ③ Inject mocks into service under test
    @InjectMocks
    private AuthService authService;

    // ④ Test data
    private SignupRequest signupRequest;
    private Role studentRole;

    @BeforeEach
    void setUp() {
        // ⑤ Prepare test data before each test
        signupRequest = new SignupRequest();
        signupRequest.setUsername("newuser");
        signupRequest.setEmail("newuser@example.com");
        signupRequest.setPassword("Password123!");

        studentRole = new Role();
        studentRole.setId(1L);
        studentRole.setName(RoleName.ROLE_STUDENT);
    }

    @Test
    @DisplayName("Register successfully with valid data")
    void registerUser_WithValidData_ShouldCreateUser() {
        // ========== ARRANGE ==========
        // Mock: username and email don't exist yet
        when(userRepository.existsByUsername("newuser")).thenReturn(false);
        when(userRepository.existsByEmail("newuser@example.com")).thenReturn(false);
        
        // Mock: encode password
        when(passwordEncoder.encode("Password123!")).thenReturn("encoded_password");
        
        // Mock: find STUDENT role
        when(roleRepository.findByName(RoleName.ROLE_STUDENT))
            .thenReturn(Optional.of(studentRole));
        
        // Mock: save user and return user with ID
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User user = inv.getArgument(0);
            user.setId(1L);  // Mock database creating ID
            return user;
        });

        // ========== ACT ==========
        authService.registerUser(signupRequest);

        // ========== ASSERT ==========
        // Verify user was saved
        verify(userRepository).save(argThat(user -> {
            assertEquals("newuser", user.getUsername());
            assertEquals("newuser@example.com", user.getEmail());
            assertEquals("encoded_password", user.getPassword());
            return true;
        }));
        
        // Verify email was sent
        verify(emailVerificationService).sendVerificationEmail(any(User.class));
    }

    @Test
    @DisplayName("Throw exception when username already exists")
    void registerUser_WithExistingUsername_ShouldThrowException() {
        // ========== ARRANGE ==========
        when(userRepository.existsByUsername("newuser")).thenReturn(true);

        // ========== ACT & ASSERT ==========
        BadRequestException exception = assertThrows(
            BadRequestException.class,
            () -> authService.registerUser(signupRequest)
        );

        assertEquals("Username is already taken!", exception.getMessage());
        
        // Verify: save was NOT called
        verify(userRepository, never()).save(any(User.class));
    }
}
```

### Explanation of Each Part

```java
@ExtendWith(MockitoExtension.class)
```
> Activates Mockito for this test class. Equivalent to saying "I want to use mocks in this class".

```java
@Mock
private UserRepository userRepository;
```
> Creates a fake object of `UserRepository`. This object doesn't connect to a real database; we must define its behavior.

```java
@InjectMocks
private AuthService authService;
```
> Creates a real `AuthService` and automatically injects the `@Mock` objects into its fields.

```java
when(userRepository.existsByUsername("newuser")).thenReturn(false);
```
> "When someone calls `existsByUsername("newuser")`, return `false`"

```java
verify(userRepository).save(any(User.class));
```
> "Check if `save()` was called exactly once with any User"

---

## 7. Repository Test with @DataJpaTest

### Characteristics of @DataJpaTest

- Only loads JPA-related components
- Automatically uses H2 in-memory database
- Each test runs in a transaction and rolls back after completion
- Faster than `@SpringBootTest`

### Complete Example

```java
package com.edumind.auth.repository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest  // ① Load JPA components
@ActiveProfiles("test")  // ② Use application-test.yaml
class UserRepositoryTest {

    @Autowired
    private UserRepository userRepository;  // ③ Real repository

    @Autowired
    private TestEntityManager entityManager;  // ④ For setting up test data

    private User testUser;

    @BeforeEach
    void setUp() {
        // ⑤ Create user in database
        testUser = User.builder()
                .username("testuser")
                .email("test@example.com")
                .password("encodedPassword")
                .isActive(true)
                .isEmailVerified(true)
                .is2faEnabled(false)
                .provider(AuthProvider.LOCAL)
                .build();
        
        entityManager.persistAndFlush(testUser);  // Save to DB
        entityManager.clear();  // Clear cache to ensure real DB query
    }

    @Test
    @DisplayName("Find user by username")
    void findByUsername_WhenExists_ShouldReturnUser() {
        // ACT - Real query to H2 database
        Optional<User> result = userRepository.findByUsername("testuser");

        // ASSERT
        assertTrue(result.isPresent());
        assertEquals("testuser", result.get().getUsername());
        assertEquals("test@example.com", result.get().getEmail());
    }

    @Test
    @DisplayName("Return empty when username doesn't exist")
    void findByUsername_WhenNotExists_ShouldReturnEmpty() {
        Optional<User> result = userRepository.findByUsername("nonexistent");
        
        assertTrue(result.isEmpty());
    }

    @Test
    @DisplayName("Don't return deleted users (soft delete)")
    void findByUsername_ShouldExcludeDeletedUsers() {
        // ARRANGE - Mark user as deleted
        User fetchedUser = entityManager.find(User.class, testUser.getId());
        fetchedUser.setDeletedAt(LocalDateTime.now());
        entityManager.persistAndFlush(fetchedUser);
        entityManager.clear();

        // ACT
        Optional<User> result = userRepository.findByUsername("testuser");

        // ASSERT - Deleted user not found
        assertTrue(result.isEmpty());
    }
}
```

### TestEntityManager vs Repository

| TestEntityManager | Repository |
|-------------------|------------|
| Used to **setup** test data | Used to **test** queries |
| `persistAndFlush()` | `save()`, `findById()`, etc. |
| Ensures data exists in DB before test | This is what we're testing |

---

## 8. Controller Test with @WebMvcTest

### Characteristics of @WebMvcTest

- Only loads Web layer (Controllers, Filters, etc.)
- Uses `MockMvc` to send fake HTTP requests
- Service dependencies must be mocked with `@MockBean`

### Complete Example

```java
package com.edumind.auth.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)  // ① Only test AuthController
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;  // ② Used to send HTTP requests

    @Autowired
    private ObjectMapper objectMapper;  // ③ Convert object ↔ JSON

    @MockBean
    private AuthService authService;  // ④ Mock service dependency

    @Test
    @DisplayName("POST /auth/signup - Register successfully")
    void signup_WithValidData_Returns201() throws Exception {
        // ARRANGE
        SignupRequest request = new SignupRequest();
        request.setUsername("newuser");
        request.setEmail("newuser@example.com");
        request.setPassword("Password123!");

        // Mock service doesn't throw exception
        doNothing().when(authService).registerUser(any(SignupRequest.class));

        // ACT & ASSERT
        mockMvc.perform(
                post("/auth/signup")                              // HTTP method + URL
                    .contentType(MediaType.APPLICATION_JSON)      // Content-Type header
                    .content(objectMapper.writeValueAsString(request))  // Request body
            )
            .andExpect(status().isCreated())                      // Expect 201
            .andExpect(jsonPath("$.success").value(true));        // Check JSON response
    }

    @Test
    @DisplayName("POST /auth/signup - Blank username → 400")
    void signup_WithBlankUsername_Returns400() throws Exception {
        SignupRequest request = new SignupRequest();
        request.setUsername("");  // Invalid!
        request.setEmail("test@example.com");
        request.setPassword("Password123!");

        mockMvc.perform(
                post("/auth/signup")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request))
            )
            .andExpect(status().isBadRequest());  // Expect 400
    }

    @Test
    @DisplayName("POST /auth/login - Login successfully")
    void login_WithValidCredentials_ReturnsJwt() throws Exception {
        // ARRANGE
        LoginRequest request = new LoginRequest("testuser", "password123");

        JwtResponse jwtResponse = JwtResponse.builder()
                .accessToken("mock-access-token")
                .tokenType("Bearer")
                .build();

        when(authService.authenticateUser(any(), any())).thenReturn(jwtResponse);

        // ACT & ASSERT
        mockMvc.perform(
                post("/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request))
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.accessToken").value("mock-access-token"))
            .andExpect(jsonPath("$.data.tokenType").value("Bearer"));
    }
}
```

### MockMvc Cheatsheet

```java
// ===== HTTP Methods =====
mockMvc.perform(get("/users/1"))
mockMvc.perform(post("/users"))
mockMvc.perform(put("/users/1"))
mockMvc.perform(delete("/users/1"))

// ===== Request Configuration =====
.contentType(MediaType.APPLICATION_JSON)
.accept(MediaType.APPLICATION_JSON)
.header("Authorization", "Bearer token123")
.cookie(new Cookie("refreshToken", "token"))
.param("page", "1")
.param("size", "10")

// ===== Response Assertions =====
.andExpect(status().isOk())           // 200
.andExpect(status().isCreated())      // 201
.andExpect(status().isBadRequest())   // 400
.andExpect(status().isUnauthorized()) // 401
.andExpect(status().isNotFound())     // 404

// ===== JSON Assertions =====
.andExpect(jsonPath("$.id").value(1))
.andExpect(jsonPath("$.name").value("John"))
.andExpect(jsonPath("$.data.items").isArray())
.andExpect(jsonPath("$.data.items.length()").value(5))
.andExpect(jsonPath("$.error").doesNotExist())
```

---

## 9. Integration Test with @SpringBootTest

### Characteristics

- Loads **entire** application context
- Test end-to-end flow
- Slowest but ensures everything works together

### Example

```java
@SpringBootTest  // ① Load full context
@AutoConfigureMockMvc  // ② Still use MockMvc
@ActiveProfiles("test")
@Transactional  // ③ Rollback after each test
class AuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;  // Real Repository

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    @DisplayName("Full flow: Register → Login")
    void fullAuthenticationFlow() throws Exception {
        // 1. REGISTER
        SignupRequest signup = new SignupRequest();
        signup.setUsername("integrationuser");
        signup.setEmail("integration@example.com");
        signup.setPassword("Password123!");

        mockMvc.perform(post("/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(signup)))
            .andExpect(status().isCreated());

        // 2. VERIFY USER IN DATABASE
        Optional<User> savedUser = userRepository.findByUsername("integrationuser");
        assertTrue(savedUser.isPresent());
        
        // 3. SIMULATE EMAIL VERIFICATION (normally via email link)
        User user = savedUser.get();
        user.setIsEmailVerified(true);
        userRepository.save(user);

        // 4. LOGIN
        LoginRequest login = new LoginRequest("integrationuser", "Password123!");

        mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(login)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.accessToken").exists());
    }
}
```

---

## 10. Best Practices

### ✅ Should Do

```java
// 1. Descriptive test names
void registerUser_WithExistingEmail_ShouldThrowBadRequestException()

// 2. Each test tests only one thing
@Test void shouldReturnUserWhenUsernameExists() { ... }
@Test void shouldReturnEmptyWhenUsernameNotExists() { ... }

// 3. Use @DisplayName for readability
@DisplayName("Returns 400 when email is invalid")

// 4. Clear Arrange-Act-Assert
// ARRANGE
User user = createTestUser();
when(repo.findById(1L)).thenReturn(Optional.of(user));
// ACT
UserResponse result = service.getUserById(1L);
// ASSERT
assertEquals("testuser", result.getUsername());

// 5. Test both happy path and error cases
@Test void login_Success() { ... }
@Test void login_WrongPassword_ThrowsException() { ... }
@Test void login_UserNotFound_ThrowsException() { ... }
```

### ❌ Should Not Do

```java
// 1. Test too many things in one test
@Test void testEverything() {
    // 100 lines of code...
}

// 2. Depend on test execution order
@Test void step1_CreateUser() { ... }
@Test void step2_LoginUser() { ... }  // Fails if step1 doesn't run first

// 3. Hardcode sensitive data
when(service.authenticate("admin", "realPassword123")).thenReturn(user);

// 4. Don't verify side effects
authService.registerUser(request);
// Missing: verify(emailService).sendEmail(any());
```

---

## Running Tests

```bash
# Run all tests
./mvnw test

# Run specific test class
./mvnw test -Dtest=AuthServiceTest

# Run multiple test classes
./mvnw test -Dtest=AuthServiceTest,UserServiceTest

# Run specific test method
./mvnw test -Dtest=AuthServiceTest#registerUser_WithValidData_ShouldCreateUser

# Run with coverage report
./mvnw test jacoco:report
# Report at: target/site/jacoco/index.html
```

---

## References

- [JUnit 5 User Guide](https://junit.org/junit5/docs/current/user-guide/)
- [Mockito Documentation](https://javadoc.io/doc/org.mockito/mockito-core/latest/org/mockito/Mockito.html)
- [Spring Boot Testing](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.testing)
