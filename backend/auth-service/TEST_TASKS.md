# Auth-Service Test Coverage - Task List 📋

> Danh sách các tests còn thiếu, sắp xếp từ **ưu tiên cao nhất** đến **thấp nhất**.

---

## Tiêu chí đánh giá độ ưu tiên

| Độ ưu tiên | Tiêu chí |
|------------|----------|
| 🔴 **Critical** | Core business logic, security-related, dễ có bug |
| 🟠 **High** | Chức năng quan trọng, được sử dụng nhiều |
| 🟡 **Medium** | Chức năng phụ trợ, ít thay đổi |
| 🟢 **Low** | Utility, integration với service bên ngoài |

---

## 🔴 CRITICAL - Ưu tiên cao nhất

### 1. TwoFactorAuthService (Security) ✅ DONE
- [x] **File**: `src/test/java/com/edumind/auth/service/TwoFactorAuthServiceTest.java`
- **16 tests** covering setup2FA, verify2FA, verifyCodeForLogin, disable2FA, get2FAStatus, regenerateBackupCodes

### 2. TwoFactorAuthController (Security) ✅ DONE
- [x] **File**: `src/test/java/com/edumind/auth/controller/TwoFactorAuthControllerTest.java`
- **12 tests** covering all 2FA endpoints

### 3. RefreshTokenRepository (Security) ✅ DONE
- [x] **File**: `src/test/java/com/edumind/auth/repository/RefreshTokenRepositoryTest.java`
- **13 tests** covering findByToken, findValidTokenByUser, revokeAllUserTokens, deleteExpiredTokens

---

## 🟠 HIGH - Ưu tiên cao

### 4. EmailVerificationController ✅ DONE
- [x] **File**: `src/test/java/com/edumind/auth/controller/EmailVerificationControllerTest.java`
- **12 tests** covering verify-email and resend-verification endpoints

### 5. RoleRepository ✅ DONE
- [x] **File**: `src/test/java/com/edumind/auth/repository/RoleRepositoryTest.java`  
- **13 tests** covering findByName, existsByName, and basic CRUD operations

### 6. EmailVerificationTokenRepository ✅ DONE
- [x] **File**: `src/test/java/com/edumind/auth/repository/EmailVerificationTokenRepositoryTest.java`
- **16 tests** covering all repository query methods

---

## 🟡 MEDIUM - Ưu tiên trung bình

### 7. PasswordResetTokenRepository
- [ ] **File**: `src/test/java/com/edumind/auth/repository/PasswordResetTokenRepositoryTest.java`
- **Lý do**: Đã có PasswordResetServiceTest, nhưng repository test vẫn cần
- **Test cases cần có**:
  - [ ] `findByToken` - tìm token
  - [ ] `findByUser` - tìm theo user
  - [ ] `countRecentRequestsByUser` - đếm requests gần đây (rate limiting)
  - [ ] `deleteExpiredAndUsedTokens` - cleanup

### 8. TeacherApplicationRepository
- [ ] **File**: `src/test/java/com/edumind/auth/repository/TeacherApplicationRepositoryTest.java`
- **Lý do**: Quản lý đơn đăng ký giáo viên
- **Test cases cần có**:
  - [ ] `findByUser` - tìm đơn theo user
  - [ ] `findByStatus` - lọc theo trạng thái
  - [ ] `existsByUserAndStatusIn` - kiểm tra đơn pending

### 9. ApplicationStatusHistoryRepository
- [ ] **File**: `src/test/java/com/edumind/auth/repository/ApplicationStatusHistoryRepositoryTest.java`
- **Lý do**: Lịch sử thay đổi trạng thái đơn
- **Test cases cần có**:
  - [ ] `findByApplication` - lịch sử của đơn
  - [ ] `findByApplicationOrderByCreatedAtDesc` - sắp xếp theo thời gian

### 10. FileUploadController
- [ ] **File**: `src/test/java/com/edumind/auth/controller/FileUploadControllerTest.java`
- **Lý do**: Upload file cần validate đúng
- **Test cases cần có**:
  - [ ] `POST /upload/avatar` - upload avatar thành công
  - [ ] `POST /upload/avatar` - file quá lớn → 400
  - [ ] `POST /upload/avatar` - file type không hợp lệ → 400

---

## 🟢 LOW - Ưu tiên thấp

### 11. EmailService
- [ ] **File**: `src/test/java/com/edumind/auth/service/EmailServiceTest.java`
- **Lý do**: Gửi email, thường mock trong các test khác
- **Test cases cần có**:
  - [ ] `sendVerificationEmail` - gửi email verify
  - [ ] `sendPasswordResetEmail` - gửi email reset
  - [ ] `sendPasswordChangedConfirmation` - gửi email confirm
  - [ ] `sendWelcomeEmail` - gửi email welcome

### 12. CloudinaryService
- [ ] **File**: `src/test/java/com/edumind/auth/service/CloudinaryServiceTest.java`
- **Lý do**: Integration với Cloudinary, thường mock
- **Test cases cần có**:
  - [ ] `uploadFile` - upload thành công
  - [ ] `deleteFile` - xóa file
  - [ ] `uploadFile` - xử lý lỗi từ Cloudinary

### 13. CustomOAuth2UserService
- [ ] **File**: `src/test/java/com/edumind/auth/service/CustomOAuth2UserServiceTest.java`
- **Lý do**: OAuth2 flow, phức tạp để test
- **Test cases cần có**:
  - [ ] `loadUser` - load user từ Google
  - [ ] `loadUser` - load user từ Facebook
  - [ ] `processOAuth2User` - xử lý user mới
  - [ ] `updateExistingUser` - update user đã tồn tại

---

## 📊 Tổng kết

| Độ ưu tiên | Số lượng | Estimate |
|------------|----------|----------|
| 🔴 Critical | 3 files | ~3-4 giờ |
| 🟠 High | 3 files | ~2-3 giờ |
| 🟡 Medium | 4 files | ~2-3 giờ |
| 🟢 Low | 3 files | ~2 giờ |
| **Tổng** | **13 files** | **~9-12 giờ** |

---

## 💡 Gợi ý

1. **Bắt đầu với Critical** - Đảm bảo security features được test kỹ
2. **Có thể skip Low priority** nếu thời gian hạn chế - các service này thường được mock
3. **Tham khảo TESTING_GUIDE.md** để biết cách viết test
4. **Chạy test thường xuyên**: `./mvnw test -Dtest=<TestClassName>`

---

## ✅ Đã hoàn thành (14 files, 160 tests)

- [x] AuthServiceTest
- [x] UserServiceTest
- [x] AdminServiceTest
- [x] EmailVerificationServiceTest
- [x] PasswordResetServiceTest
- [x] TeacherApplicationServiceTest
- [x] AuthControllerTest
- [x] UserControllerTest
- [x] AdminControllerTest
- [x] PasswordResetControllerTest
- [x] TeacherApplicationControllerTest
- [x] UserRepositoryTest
- [x] JwtTokenProviderTest
- [x] AuthIntegrationTest
