# Hướng Dẫn Viết Test cho Spring Boot 🧪

> Hướng dẫn chi tiết từ cơ bản đến nâng cao, dành cho người mới bắt đầu.

---

## Mục Lục

1. [Giới thiệu về Testing](#1-giới-thiệu-về-testing)
2. [Các loại Test trong Spring Boot](#2-các-loại-test-trong-spring-boot)
3. [Cấu trúc một Test cơ bản](#3-cấu-trúc-một-test-cơ-bản)
4. [JUnit 5 - Framework Testing](#4-junit-5---framework-testing)
5. [Mockito - Giả lập Dependencies](#5-mockito---giả-lập-dependencies)
6. [Unit Test cho Service](#6-unit-test-cho-service)
7. [Repository Test với @DataJpaTest](#7-repository-test-với-datajpatest)
8. [Controller Test với @WebMvcTest](#8-controller-test-với-webmvctest)
9. [Integration Test với @SpringBootTest](#9-integration-test-với-springboottest)
10. [Best Practices](#10-best-practices)

---

## 1. Giới thiệu về Testing

### Tại sao cần viết Test?

```
┌─────────────────────────────────────────────────────────┐
│  Không có Test              │  Có Test                  │
├─────────────────────────────────────────────────────────┤
│  ❌ Sợ thay đổi code        │  ✅ Tự tin refactor       │
│  ❌ Bug phát hiện muộn      │  ✅ Phát hiện bug sớm     │
│  ❌ Debug thủ công          │  ✅ Tự động kiểm tra      │
│  ❌ Khó bảo trì             │  ✅ Code dễ maintain      │
└─────────────────────────────────────────────────────────┘
```

### Test Pyramid (Kim tự tháp Test)

```
          ┌───────────┐
          │Integration│  ← Ít test, chạy chậm, test toàn bộ flow
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
    │      Unit Tests       │  ← Nhiều test, chạy nhanh, test logic
    │   (Service layer)     │
    └───────────────────────┘
```

---

## 2. Các loại Test trong Spring Boot

| Loại Test | Annotation | Mục đích | Tốc độ |
|-----------|------------|----------|--------|
| Unit Test | `@ExtendWith(MockitoExtension.class)` | Test business logic riêng lẻ | ⚡ Rất nhanh |
| Repository Test | `@DataJpaTest` | Test database queries | 🚀 Nhanh |
| Controller Test | `@WebMvcTest` | Test REST endpoints | 🚀 Nhanh |
| Integration Test | `@SpringBootTest` | Test toàn bộ flow | 🐢 Chậm |

---

## 3. Cấu trúc một Test cơ bản

### Pattern AAA (Arrange - Act - Assert)

Mọi test đều tuân theo 3 bước:

```java
@Test
void testMethodName_WhenCondition_ShouldExpectedResult() {
    // ========== ARRANGE (Given) ==========
    // Chuẩn bị dữ liệu đầu vào và mock
    String input = "test data";
    when(mockRepository.findById(1L)).thenReturn(Optional.of(testUser));
    
    // ========== ACT (When) ==========
    // Thực hiện hành động cần test
    String result = serviceUnderTest.processData(input);
    
    // ========== ASSERT (Then) ==========
    // Kiểm tra kết quả
    assertEquals("expected result", result);
    verify(mockRepository).findById(1L);
}
```

### Cấu trúc file Test

```
src/
├── main/java/com/edumind/auth/
│   └── service/
│       └── AuthService.java          ← Code chính
│
└── test/java/com/edumind/auth/
    └── service/
        └── AuthServiceTest.java      ← Test cho AuthService
```

> **Quy tắc đặt tên**: `[TênClass]Test.java` - Ví dụ: `AuthService.java` → `AuthServiceTest.java`

---

## 4. JUnit 5 - Framework Testing

### Các Annotation quan trọng

```java
import org.junit.jupiter.api.*;  // Import JUnit 5

class MyServiceTest {

    @BeforeAll
    static void setupOnce() {
        // Chạy 1 lần TRƯỚC TẤT CẢ tests
        // Dùng cho setup tốn kém (database connection, etc.)
    }

    @BeforeEach
    void setupEachTest() {
        // Chạy TRƯỚC MỖI test
        // Dùng để reset trạng thái, tạo test data mới
    }

    @Test
    @DisplayName("Mô tả dễ đọc cho test này")
    void myTest() {
        // Code test ở đây
    }

    @AfterEach
    void cleanupEachTest() {
        // Chạy SAU MỖI test
        // Dùng để dọn dẹp resources
    }

    @AfterAll
    static void cleanupOnce() {
        // Chạy 1 lần SAU TẤT CẢ tests
    }
}
```

### Các Assertion phổ biến

```java
import static org.junit.jupiter.api.Assertions.*;

// ===== So sánh giá trị =====
assertEquals(expected, actual);           // Kiểm tra bằng nhau
assertEquals("msg", expected, actual);    // Với message tùy chỉnh
assertNotEquals(unexpected, actual);      // Kiểm tra khác nhau

// ===== Boolean =====
assertTrue(condition);                    // Kiểm tra true
assertFalse(condition);                   // Kiểm tra false

// ===== Null check =====
assertNull(object);                       // Kiểm tra null
assertNotNull(object);                    // Kiểm tra không null

// ===== Exception =====
assertThrows(ExceptionClass.class, () -> {
    // Code sẽ throw exception
    service.methodThatThrows();
});

// ===== Instance check =====
assertInstanceOf(ExpectedClass.class, object);

// ===== Không throw exception =====
assertDoesNotThrow(() -> {
    service.safeMethod();
});
```

### Tổ chức Tests với @Nested

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Nested
    @DisplayName("getCurrentUser Tests")
    class GetCurrentUserTests {
        
        @Test
        @DisplayName("Trả về user khi đã xác thực")
        void getCurrentUser_WhenAuthenticated_ShouldReturnUser() {
            // test code
        }

        @Test
        @DisplayName("Throw exception khi user không tồn tại")
        void getCurrentUser_WhenUserNotFound_ShouldThrowException() {
            // test code
        }
    }

    @Nested
    @DisplayName("updateProfile Tests")
    class UpdateProfileTests {
        // Các tests cho updateProfile
    }
}
```

> `@Nested` giúp nhóm các tests liên quan lại với nhau, dễ đọc và maintain hơn.

---

## 5. Mockito - Giả lập Dependencies

### Tại sao cần Mock?

Khi test `AuthService`, ta KHÔNG muốn:
- Kết nối database thật
- Gửi email thật
- Gọi API bên ngoài

→ Ta dùng **Mock** để giả lập các dependencies này.

```
┌──────────────────────────────────────────────────────────┐
│                    AuthService                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │UserRepository│  │PasswordEncoder│  │ EmailService │   │
│  │    (MOCK)    │  │    (MOCK)    │  │    (MOCK)    │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### Các Annotation của Mockito

```java
@ExtendWith(MockitoExtension.class)  // Kích hoạt Mockito
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;    // Tạo mock object

    @Mock
    private PasswordEncoder passwordEncoder;  // Tạo mock object

    @InjectMocks
    private AuthService authService;          // Inject các mocks vào đây
}
```

### Cú pháp `when().thenReturn()`

```java
// ===== Trả về giá trị =====
when(userRepository.findById(1L))
    .thenReturn(Optional.of(testUser));

// ===== Trả về giá trị khác nhau mỗi lần gọi =====
when(tokenProvider.generateToken())
    .thenReturn("token1")
    .thenReturn("token2");

// ===== Trả về giá trị dựa trên input =====
when(passwordEncoder.encode(anyString()))
    .thenAnswer(invocation -> {
        String input = invocation.getArgument(0);
        return "encoded_" + input;
    });

// ===== Throw exception =====
when(userRepository.findById(999L))
    .thenThrow(new ResourceNotFoundException("User not found"));

// ===== Cho void method =====
doNothing().when(emailService).sendEmail(any());
doThrow(new RuntimeException()).when(emailService).sendEmail(any());
```

### Argument Matchers

```java
import static org.mockito.ArgumentMatchers.*;

// ===== Bất kỳ giá trị nào =====
when(repo.findByEmail(anyString())).thenReturn(Optional.empty());
when(repo.findById(anyLong())).thenReturn(Optional.of(user));

// ===== Bất kỳ object nào =====
when(repo.save(any(User.class))).thenReturn(savedUser);

// ===== Kiểm tra argument cụ thể =====
when(repo.save(argThat(user -> 
    user.getEmail().endsWith("@example.com")
))).thenReturn(savedUser);
```

### Verify - Kiểm tra method có được gọi không

```java
// ===== Verify method được gọi =====
verify(emailService).sendEmail(any());

// ===== Verify gọi đúng số lần =====
verify(repository, times(2)).save(any());
verify(repository, never()).delete(any());
verify(repository, atLeastOnce()).findById(anyLong());

// ===== Verify với argument cụ thể =====
verify(repository).save(argThat(user -> 
    "newuser".equals(user.getUsername())
));
```

---

## 6. Unit Test cho Service

### Ví dụ đầy đủ: Test registerUser

```java
package com.edumind.auth.service;

import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)  // ① Kích hoạt Mockito
class AuthServiceTest {

    // ② Tạo các mock objects
    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private EmailVerificationService emailVerificationService;

    // ③ Inject mocks vào service cần test
    @InjectMocks
    private AuthService authService;

    // ④ Test data
    private SignupRequest signupRequest;
    private Role studentRole;

    @BeforeEach
    void setUp() {
        // ⑤ Chuẩn bị test data trước mỗi test
        signupRequest = new SignupRequest();
        signupRequest.setUsername("newuser");
        signupRequest.setEmail("newuser@example.com");
        signupRequest.setPassword("Password123!");

        studentRole = new Role();
        studentRole.setId(1L);
        studentRole.setName(RoleName.ROLE_STUDENT);
    }

    @Test
    @DisplayName("Đăng ký thành công với dữ liệu hợp lệ")
    void registerUser_WithValidData_ShouldCreateUser() {
        // ========== ARRANGE ==========
        // Giả lập: username và email chưa tồn tại
        when(userRepository.existsByUsername("newuser")).thenReturn(false);
        when(userRepository.existsByEmail("newuser@example.com")).thenReturn(false);
        
        // Giả lập: encode password
        when(passwordEncoder.encode("Password123!")).thenReturn("encoded_password");
        
        // Giả lập: tìm role STUDENT
        when(roleRepository.findByName(RoleName.ROLE_STUDENT))
            .thenReturn(Optional.of(studentRole));
        
        // Giả lập: save user và trả về user với ID
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User user = inv.getArgument(0);
            user.setId(1L);  // Giả lập database tạo ID
            return user;
        });

        // ========== ACT ==========
        authService.registerUser(signupRequest);

        // ========== ASSERT ==========
        // Verify user được lưu
        verify(userRepository).save(argThat(user -> {
            assertEquals("newuser", user.getUsername());
            assertEquals("newuser@example.com", user.getEmail());
            assertEquals("encoded_password", user.getPassword());
            return true;
        }));
        
        // Verify email được gửi
        verify(emailVerificationService).sendVerificationEmail(any(User.class));
    }

    @Test
    @DisplayName("Throw exception khi username đã tồn tại")
    void registerUser_WithExistingUsername_ShouldThrowException() {
        // ========== ARRANGE ==========
        when(userRepository.existsByUsername("newuser")).thenReturn(true);

        // ========== ACT & ASSERT ==========
        BadRequestException exception = assertThrows(
            BadRequestException.class,
            () -> authService.registerUser(signupRequest)
        );

        assertEquals("Username is already taken!", exception.getMessage());
        
        // Verify: KHÔNG gọi save
        verify(userRepository, never()).save(any(User.class));
    }
}
```

### Giải thích từng phần

```java
@ExtendWith(MockitoExtension.class)
```
> Kích hoạt Mockito cho test class này. Tương đương câu "Tôi muốn dùng mock trong class này".

```java
@Mock
private UserRepository userRepository;
```
> Tạo một object giả của `UserRepository`. Object này không kết nối database thật, mà ta phải định nghĩa behavior cho nó.

```java
@InjectMocks
private AuthService authService;
```
> Tạo `AuthService` thật và tự động inject các `@Mock` objects vào các fields của nó.

```java
when(userRepository.existsByUsername("newuser")).thenReturn(false);
```
> "Khi ai đó gọi `existsByUsername("newuser")`, hãy trả về `false`"

```java
verify(userRepository).save(any(User.class));
```
> "Kiểm tra xem `save()` có được gọi đúng 1 lần với User nào đó không"

---

## 7. Repository Test với @DataJpaTest

### Đặc điểm của @DataJpaTest

- Chỉ load các components liên quan đến JPA
- Tự động dùng H2 in-memory database
- Mỗi test chạy trong transaction và rollback sau khi xong
- Nhanh hơn `@SpringBootTest`

### Ví dụ đầy đủ

```java
package com.edumind.auth.repository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest  // ① Load JPA components
@ActiveProfiles("test")  // ② Dùng application-test.yaml
class UserRepositoryTest {

    @Autowired
    private UserRepository userRepository;  // ③ Repository thật

    @Autowired
    private TestEntityManager entityManager;  // ④ Để setup test data

    private User testUser;

    @BeforeEach
    void setUp() {
        // ⑤ Tạo user trong database
        testUser = User.builder()
                .username("testuser")
                .email("test@example.com")
                .password("encodedPassword")
                .isActive(true)
                .isEmailVerified(true)
                .is2faEnabled(false)
                .provider(AuthProvider.LOCAL)
                .build();
        
        entityManager.persistAndFlush(testUser);  // Lưu vào DB
        entityManager.clear();  // Xóa cache để đảm bảo query DB thật
    }

    @Test
    @DisplayName("Tìm user theo username")
    void findByUsername_WhenExists_ShouldReturnUser() {
        // ACT - Query thực sự vào H2 database
        Optional<User> result = userRepository.findByUsername("testuser");

        // ASSERT
        assertTrue(result.isPresent());
        assertEquals("testuser", result.get().getUsername());
        assertEquals("test@example.com", result.get().getEmail());
    }

    @Test
    @DisplayName("Trả về empty khi username không tồn tại")
    void findByUsername_WhenNotExists_ShouldReturnEmpty() {
        Optional<User> result = userRepository.findByUsername("nonexistent");
        
        assertTrue(result.isEmpty());
    }

    @Test
    @DisplayName("Không trả về user đã bị xóa (soft delete)")
    void findByUsername_ShouldExcludeDeletedUsers() {
        // ARRANGE - Đánh dấu user đã xóa
        User fetchedUser = entityManager.find(User.class, testUser.getId());
        fetchedUser.setDeletedAt(LocalDateTime.now());
        entityManager.persistAndFlush(fetchedUser);
        entityManager.clear();

        // ACT
        Optional<User> result = userRepository.findByUsername("testuser");

        // ASSERT - Không tìm thấy user đã xóa
        assertTrue(result.isEmpty());
    }
}
```

### TestEntityManager vs Repository

| TestEntityManager | Repository |
|-------------------|------------|
| Dùng để **setup** test data | Dùng để **test** queries |
| `persistAndFlush()` | `save()`, `findById()`, etc. |
| Đảm bảo data có trong DB trước khi test | Đây là thứ ta đang test |

---

## 8. Controller Test với @WebMvcTest

### Đặc điểm của @WebMvcTest

- Chỉ load Web layer (Controllers, Filters, etc.)
- Dùng `MockMvc` để gửi HTTP requests giả
- Service dependencies phải mock bằng `@MockBean`

### Ví dụ đầy đủ

```java
package com.edumind.auth.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)  // ① Chỉ test AuthController
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;  // ② Dùng để gửi HTTP requests

    @Autowired
    private ObjectMapper objectMapper;  // ③ Convert object ↔ JSON

    @MockBean
    private AuthService authService;  // ④ Mock service dependency

    @Test
    @DisplayName("POST /auth/signup - Đăng ký thành công")
    void signup_WithValidData_Returns201() throws Exception {
        // ARRANGE
        SignupRequest request = new SignupRequest();
        request.setUsername("newuser");
        request.setEmail("newuser@example.com");
        request.setPassword("Password123!");

        // Giả lập service không throw exception
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
    @DisplayName("POST /auth/signup - Username trống → 400")
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
    @DisplayName("POST /auth/login - Đăng nhập thành công")
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

## 9. Integration Test với @SpringBootTest

### Đặc điểm

- Load **toàn bộ** application context
- Test end-to-end flow
- Chạy chậm nhất nhưng đảm bảo mọi thứ hoạt động cùng nhau

### Ví dụ

```java
@SpringBootTest  // ① Load full context
@AutoConfigureMockMvc  // ② Vẫn dùng MockMvc
@ActiveProfiles("test")
@Transactional  // ③ Rollback sau mỗi test
class AuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;  // Repository THẬT

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    @DisplayName("Full flow: Đăng ký → Đăng nhập")
    void fullAuthenticationFlow() throws Exception {
        // 1. ĐĂNG KÝ
        SignupRequest signup = new SignupRequest();
        signup.setUsername("integrationuser");
        signup.setEmail("integration@example.com");
        signup.setPassword("Password123!");

        mockMvc.perform(post("/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(signup)))
            .andExpect(status().isCreated());

        // 2. VERIFY USER TRONG DATABASE
        Optional<User> savedUser = userRepository.findByUsername("integrationuser");
        assertTrue(savedUser.isPresent());
        
        // 3. GIẢ LẬP XÁC THỰC EMAIL (bình thường qua email link)
        User user = savedUser.get();
        user.setIsEmailVerified(true);
        userRepository.save(user);

        // 4. ĐĂNG NHẬP
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

### ✅ Nên làm

```java
// 1. Tên test mô tả rõ ràng
void registerUser_WithExistingEmail_ShouldThrowBadRequestException()

// 2. Mỗi test chỉ test 1 thứ
@Test void shouldReturnUserWhenUsernameExists() { ... }
@Test void shouldReturnEmptyWhenUsernameNotExists() { ... }

// 3. Dùng @DisplayName cho dễ đọc
@DisplayName("Trả về 400 khi email không hợp lệ")

// 4. Arrange-Act-Assert rõ ràng
// ARRANGE
User user = createTestUser();
when(repo.findById(1L)).thenReturn(Optional.of(user));
// ACT
UserResponse result = service.getUserById(1L);
// ASSERT
assertEquals("testuser", result.getUsername());

// 5. Test cả happy path và error cases
@Test void login_Success() { ... }
@Test void login_WrongPassword_ThrowsException() { ... }
@Test void login_UserNotFound_ThrowsException() { ... }
```

### ❌ Không nên làm

```java
// 1. Test quá nhiều thứ trong 1 test
@Test void testEverything() {
    // 100 dòng code...
}

// 2. Phụ thuộc vào thứ tự tests
@Test void step1_CreateUser() { ... }
@Test void step2_LoginUser() { ... }  // Fail nếu step1 không chạy trước

// 3. Hardcode dữ liệu nhạy cảm
when(service.authenticate("admin", "realPassword123")).thenReturn(user);

// 4. Không verify side effects
authService.registerUser(request);
// Thiếu: verify(emailService).sendEmail(any());
```

---

## Chạy Tests

```bash
# Chạy tất cả tests
./mvnw test

# Chạy test class cụ thể
./mvnw test -Dtest=AuthServiceTest

# Chạy nhiều test classes
./mvnw test -Dtest=AuthServiceTest,UserServiceTest

# Chạy test method cụ thể
./mvnw test -Dtest=AuthServiceTest#registerUser_WithValidData_ShouldCreateUser

# Chạy với coverage report
./mvnw test jacoco:report
# Report ở: target/site/jacoco/index.html
```

---

## Tài liệu tham khảo

- [JUnit 5 User Guide](https://junit.org/junit5/docs/current/user-guide/)
- [Mockito Documentation](https://javadoc.io/doc/org.mockito/mockito-core/latest/org/mockito/Mockito.html)
- [Spring Boot Testing](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.testing)
