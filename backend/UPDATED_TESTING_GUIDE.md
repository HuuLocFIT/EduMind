# Spring Boot Testing Guide 🧪

> A comprehensive guide from basics to advanced integration testing using **Testcontainers** with **real PostgreSQL**.

---

## Table of Contents

1. [Introduction to Testing](#1-introduction-to-testing)
2. [Types of Tests in Spring Boot](#2-types-of-tests-in-spring-boot)
3. [Basic Test Structure](#3-basic-test-structure)
4. [JUnit 5 - Testing Framework](#4-junit-5---testing-framework)
5. [Mockito - Mocking Dependencies](#5-mockito---mocking-dependencies)
6. [Unit Test for Service](#6-unit-test-for-service)
7. [Configuration for Testcontainers](#7-configuration-for-testcontainers) (Setup Required)
8. [Repository Test with Testcontainers](#8-repository-test-with-testcontainers)
9. [Controller Test with @WebMvcTest](#9-controller-test-with-webmvctest)
10. [Integration Test with Testcontainers](#10-integration-test-with-testcontainers)
11. [Troubleshooting & CI/CD](#11-troubleshooting--cicd)

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
          │   Tests   │     (Now uses Real PostgreSQL)
         ─┴───────────┴─
        ┌───────────────┐
        │  Controller   │  ← Test API endpoints
        │    Tests      │     (Uses Mocks, Fast)
       ─┴───────────────┴─
      ┌───────────────────┐
      │   Repository      │  ← Test database queries
      │     Tests         │     (Now uses Real PostgreSQL)
     ─┴───────────────────┴─
    ┌───────────────────────┐
    │      Unit Tests       │  ← Many tests, fast, test logic
    │   (Service layer)     │     (Uses Mocks, NO Docker)
    └───────────────────────┘
```

---

## 2. Types of Tests in Spring Boot

| Test Type | Annotation | Database Strategy | Speed |
|-----------|------------|-------------------|--------|
| **Unit Test** | `@ExtendWith(MockitoExtension.class)` | **None** (Mock Repositories) | ⚡ Very Fast |
| **Controller Test** | `@WebMvcTest` | **None** (Mock Service) | 🚀 Fast |
| **Repository Test** | `@DataJpaTest` + Base Class | **Real PostgreSQL** (Testcontainers) | 🐢 Slower than H2 |
| **Integration Test** | `@SpringBootTest` + Base Class | **Real PostgreSQL** (Testcontainers) | 🐢 Slow |

> **Crucially**: We have moved away from H2 (in-memory DB) to **Testcontainers** (real Dockerized PostgreSQL) for database tests. This ensures our tests match production behavior.

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

> **Naming rule**: `[ClassName]Test.java` - Example: `AuthService.java` → `AuthServiceTest.java`

---

## 4. JUnit 5 - Testing Framework

### Important Annotations

```java
import org.junit.jupiter.api.*;

class MyServiceTest {

    @BeforeAll
    static void setupOnce() {
        // Runs ONCE BEFORE ALL tests (e.g., start containers)
    }

    @BeforeEach
    void setupEachTest() {
        // Runs BEFORE EACH test (e.g., reset mocks)
    }

    @Test
    @DisplayName("Readable description for this test")
    void myTest() {
        // Test code here
    }

    @AfterEach
    void cleanupEachTest() {
        // Runs AFTER EACH test
    }
}
```

### Common Assertions

```java
assertEquals(expected, actual);
assertNotEquals(unexpected, actual);
assertTrue(condition);
assertFalse(condition);
assertNotNull(object);
assertThrows(ExceptionClass.class, () -> service.method());
```

---

## 5. Mockito - Mocking Dependencies

**Used for**: Unit Tests (Service Layer) and Controller Tests. Do **NOT** use mocks for repository tests.

```java
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;    // Create mock object

    @InjectMocks
    private AuthService authService;          // Inject mocks here

    @Test
    void test() {
        // Define behavior
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        // Verify call
        verify(userRepository).save(any(User.class));
    }
}
```

---

## 6. Unit Test for Service

**Pure Java. No Spring Context. No Docker. Extremely Fast.**

```java
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @InjectMocks private AuthService authService;

    @Test
    void registerUser_Success() {
        // ARRANGE
        SignupRequest request = new SignupRequest("user", "pass");
        when(userRepository.existsByUsername("user")).thenReturn(false);
        when(passwordEncoder.encode("pass")).thenReturn("encoded");

        // ACT
        authService.registerUser(request);

        // ASSERT
        verify(userRepository).save(any(User.class));
    }
}
```

---

## 7. Configuration for Testcontainers

To use real PostgreSQL in tests, we need specific setup. This replaces H2 configuration.

### 1. Dependencies (`pom.xml`)

Remove `h2` and add `testcontainers`.

```xml
<dependencies>
    <!-- REMOVE THIS -->
    <!-- <dependency>
        <groupId>com.h2database</groupId>
        <artifactId>h2</artifactId>
        <scope>test</scope>
    </dependency> -->

    <!-- ADD THESE for Testcontainers -->
    <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>testcontainers</artifactId>
        <version>1.20.4</version>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>postgresql</artifactId>
        <version>1.20.4</version>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>junit-jupiter</artifactId>
        <version>1.20.4</version>
        <scope>test</scope>
    </dependency>
</dependencies>
```

### 2. Singleton Container Config

This ensures we reused **one** Docker container for all tests, speeding up execution.

`src/test/java/com/edumind/auth/config/PostgresTestContainerConfig.java`:

```java
public class PostgresTestContainerConfig {

    private static final PostgreSQLContainer<?> POSTGRES_CONTAINER;

    static {
        POSTGRES_CONTAINER = new PostgreSQLContainer<>(DockerImageName.parse("postgres:16-alpine"))
                .withDatabaseName("auth_test")
                .withUsername("test")
                .withPassword("test")
                .withReuse(true);

        POSTGRES_CONTAINER.start();
    }

    public static class Initializer implements ApplicationContextInitializer<ConfigurableApplicationContext> {
        @Override
        public void initialize(ConfigurableApplicationContext applicationContext) {
            TestPropertyValues.of(
                    "spring.datasource.url=" + POSTGRES_CONTAINER.getJdbcUrl(),
                    "spring.datasource.username=" + POSTGRES_CONTAINER.getUsername(),
                    "spring.datasource.password=" + POSTGRES_CONTAINER.getPassword(),
                    "spring.datasource.driver-class-name=org.postgresql.Driver",
                    "spring.jpa.hibernate.ddl-auto=none", // Let Flyway handle it
                    "spring.flyway.enabled=true"
            ).applyTo(applicationContext.getEnvironment());
        }
    }
}
```

### 3. Multi-Schema Config (LMS Core Service)

For **lms-core-service**, which uses multiple schemas (`course`, `payment`, `assessment`, etc.), the configuration requires listing all schemas for Flyway.

`src/test/java/com/edumind/lms/config/PostgresTestContainerConfig.java`:

```java
public class PostgresTestContainerConfig {

    // Define all schemas used in the monolith
    private static final String SCHEMAS = "course,assessment,gamification,payment,notification,public";

    private static final PostgreSQLContainer<?> POSTGRES_CONTAINER;

    static {
        POSTGRES_CONTAINER = new PostgreSQLContainer<>(DockerImageName.parse("postgres:16-alpine"))
                .withDatabaseName("lms_test")
                .withUsername("test")
                .withPassword("test")
                .withReuse(true);

        POSTGRES_CONTAINER.start();
    }

    public static class Initializer implements ApplicationContextInitializer<ConfigurableApplicationContext> {
        @Override
        public void initialize(ConfigurableApplicationContext applicationContext) {
            TestPropertyValues.of(
                    "spring.datasource.url=" + POSTGRES_CONTAINER.getJdbcUrl(),
                    // ... other configs same as Auth Service ...
                    "spring.flyway.schemas=" + SCHEMAS // CRITICAL: Register all schemas
            ).applyTo(applicationContext.getEnvironment());
        }
    }
}
```

### 4. Base Repository Class

Extend this class for any `@DataJpaTest`.

`src/test/java/com/edumind/auth/config/BaseRepositoryTest.java`:

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE) // Don't use H2
@ContextConfiguration(initializers = PostgresTestContainerConfig.Initializer.class) // Use Docker
@ActiveProfiles("test")
public abstract class BaseRepositoryTest {
    // Shared helper methods can go here
}
```

### 5. Base Integration Class

Extend this class for any `@SpringBootTest`.

`src/test/java/com/edumind/auth/config/BaseIntegrationTest.java` (or local equivalent):

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ContextConfiguration(initializers = PostgresTestContainerConfig.Initializer.class)
@ActiveProfiles("test")
@Transactional // Rollback after each test
public abstract class BaseIntegrationTest {

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;
}
```

---

## 8. Repository Test with Testcontainers

Instead of H2, this runs against the real Postgres Docker container.

```java
// EXTEND the base class!
class UserRepositoryTest extends BaseRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    void findByUsername_ShouldReturnUser() {
        // Arrange
        User user = new User();
        user.setUsername("testuser");
        user.setEmail("test@example.com");
        entityManager.persistAndFlush(user); // Sends real INSERT to Postgres

        // Act
        Optional<User> result = userRepository.findByUsername("testuser");

        // Assert
        assertTrue(result.isPresent());
    }
}

### LMS Core Service Example (Payment Module)

Since `lms-core-service` splits tables into schemas (e.g. `payment.orders`), tests work exactly the same way because the Base Class handles the schema creation.

```java
package com.edumind.lms.modules.payment.repository;

import com.edumind.lms.config.BaseRepositoryTest;

class OrderRepositoryTest extends BaseRepositoryTest {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    void findByOrderNumber_ShouldReturnOrder() {
        // Arrange
        Order order = new Order();
        order.setOrderNumber("ORD-123");
        order.setAmount(BigDecimal.TEN);
        entityManager.persistAndFlush(order); // Saves to 'payment.orders' table

        // Act
        Optional<Order> result = orderRepository.findByOrderNumber("ORD-123");

        // Assert
        assertTrue(result.isPresent());
        assertEquals(BigDecimal.TEN, result.get().getAmount());
    }
}
```
```

---

## 9. Controller Test with @WebMvcTest

**NOTE:** Controller tests usually utilize Mocks for the service layer. Therefore, **they do NOT need Testcontainers/Docker**. They remain fast.

```java
@WebMvcTest(AuthController.class)
class AuthControllerTest {

    @Autowired private MockMvc mockMvc;
    @MockBean private AuthService authService; // Mock the logic

    @Test
    void login_Success() throws Exception {
        // Mock service behavior
        when(authService.login(any())).thenReturn(token);

        // Perform HTTP request
        mockMvc.perform(post("/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content("..."))
            .andExpect(status().isOk());
    }
}
```

---

## 10. Integration Test with Testcontainers

Tests the full stack: Controller → Service → Repository → Real DB.

```java
// EXTEND the base class!
class AuthIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private UserRepository userRepository; // Real Repo

    @Test
    void fullLoginFlow() throws Exception {
        // 1. Setup Data in DB
        User user = new User("user", "pass");
        userRepository.save(user);

        // 2. Call API
        mockMvc.perform(post("/auth/login")
            .content(toJson(new LoginRequest("user", "pass"))))
            .andExpect(status().isOk());
    }
}
```

---

## 11. Troubleshooting & CI/CD

### Docker is Required!
If you see: `Could not connect to Docker daemon`
> **Solution**: Ensure Docker Desktop is running locally.

### CI/CD Pipeline (GitHub Actions / Jenkins)
Standard `mvn test` might fail in CI if Docker is not available.
- **GitHub Actions**: Use a `service` container for Postgres OR ensure the runner has Docker support.
- Since we use Testcontainers, the runner simply needs access to the Docker socket.

### Flyway Errors
Since we use real Postgres, Flyway runs actual migrations.
- If tests fail with `Migration checksum mismatch`, it means your local migration file matches production but not what the test expects. Ensure `src/main/resources/db/migration` is clean.
