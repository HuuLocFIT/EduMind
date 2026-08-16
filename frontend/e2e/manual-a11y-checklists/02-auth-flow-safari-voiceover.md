# Checklist Safari + VoiceOver — Flow 2: Authentication

Phạm vi: `Login / Signup / Forgot Password / Reset Password` (+ OAuth và protected-route redirect).
Tham chiếu yêu cầu: mục 4 trong [`4-flow-a11y.md`](../../../4-flow-a11y.md).
Quy ước điền bảng, template ghi `Fail` và setup máy bắt buộc: xem [README.md](README.md).

**Trước khi bắt đầu**: đã bật `Safari → Advanced → Press Tab to highlight each item`, đã bật Full Keyboard Access, đã bật VoiceOver Caption Panel.

## Thông tin lần test

| Trường | Giá trị |
| --- | --- |
| Ngày test (R1) | |
| Ngày retest (R2) | |
| Môi trường test (Production / Staging / Local) | |
| URL / commit của bản được test | |
| macOS version | |
| Safari version | |
| VoiceOver verbosity (mặc định: Medium) | |
| Người test | |
| Kết luận flow (Pass / Fail / Blocked) | |

## Test data cần có sẵn

- 1 tài khoản student hợp lệ (biết password, **không** ghi password vào file này).
- 1 email đã tồn tại trong hệ thống (để test lỗi trùng tài khoản khi Signup).
- 1 reset token còn hạn **và** 1 token hết hạn/không hợp lệ.
- Tài khoản có bật 2FA (nếu không có → các bước 2FA ghi `Blocked`, không ghi `Pass`).
- 1 password manager hoặc clipboard có sẵn chuỗi password để test paste (SC 3.3.8).

## Core pass (~15 phút) — dùng khi retest nhanh sau mỗi vòng fix

`A3 · A4 · B1 · B2 · B3 · B4 · B6 · B7 · B12 · C2 · C3 · C5 · D3 · E1 · E3 · W1 · W2 · W6 · H1 · H2`

Lượt **đầy đủ** (toàn bộ bảng bên dưới) bắt buộc chạy ít nhất một lần trước khi cập nhật README dự án. Xem [00-summary.md](00-summary.md) mục 6.

## Ví dụ cách ghi (mẫu tham chiếu — không phải bước test thật)

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| VD1 | P0 | 3.3.1 | Submit form Login trống | Focus chuyển tới field lỗi đầu tiên, lỗi đọc bằng `role="alert"` | Pass | | VO đọc "Email is required, alert" ngay sau khi submit |
| VD2 | P0 | 3.3.8 | Paste password từ clipboard vào ô Password | Paste thành công, không bị chặn | Fail | Pass | [A11Y-A03] VO đọc: "Password, secure edit text, blank" sau khi `Cmd + V`<br>Focus đang ở: `input#password`<br>Kỳ vọng: giá trị được dán vào; chặn paste vi phạm SC 3.3.8 vì buộc người dùng gõ tay/nhớ mật khẩu<br>Evidence: docs/a11y-evidence/2026-08-20/auth/password-paste-blocked.png<br>Fixed commit `def5678`, retest 2026-08-22 → Pass |
| VD3 | C | 3.3.1 | Nhập sai mã 2FA | Lỗi đọc rõ nội dung + còn bao nhiêu lần thử | Blocked | | Tài khoản test chưa bật được 2FA trong môi trường staging — cần chủ dự án cấp account, xem A11Y-A11 |

---

## A. AuthLayout dùng chung

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A1 | P0 | 1.3.1 | Mở Login, Rotor → Landmarks | Có đúng một `main`; page heading phù hợp | | | |
| A2 | P0 | 4.1.2, 1.1.1 | Duyệt logo/link về Home | Có accessible name rõ (không chỉ "image") | | | |
| A3 | P0 | 2.4.2 | Chuyển Login → Signup → Forgot → Reset, mỗi trang `VO + F2` ×2 | Mỗi route có **page title riêng biệt**, mô tả đúng trang, không trùng nhau | | | |
| A4 | P0 | 2.4.3 | Sau khi chuyển route | Focus/VO cursor chuyển tới heading của trang mới, không bị "kẹt" ở vị trí cũ | | | |
| A5 | P0 | 1.1.1 | Kiểm tra background/illustration trang trí | Không bị VoiceOver đọc | | | |
| A6 | P0 | 3.2.3 | So sánh 4 trang auth | Vị trí logo, heading, link phụ nhất quán giữa các trang | | | |

## B. LoginPage

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| B1 | P0 | 3.3.2, 4.1.2 | Vào ô Email/Username bằng `VO + Command + J` | Label được đọc, gắn đúng với input | Pass| | |
| B2 | P0 | 3.3.2 | Vào ô Password | Label đọc đúng; tìm nút "Show/Hide password" | Pass| | |
| B3 | P0 | 4.1.2 | Kích hoạt "Show password" bằng `VO + Space` | Tên nút đổi thành "Hide password"; giá trị đã nhập **không bị mất**, tab order không đổi | Pass | | Code đúng (`aria-label`/`aria-pressed` đổi đúng theo state, `PasswordInput.tsx:20-21`), giá trị/tab order không đổi. VO chỉ đọc "selected" thay vì đọc lại full label — đã xác nhận qua Accessibility Inspector là AX name đổi đúng, đây là giới hạn announcement của VoiceOver khi focus không rời phần tử, không phải lỗi code. |
| B4 | P0 | 3.3.1, 4.1.3 | Submit form trống | Focus chuyển tới error summary hoặc field lỗi đầu tiên; lỗi đọc bằng `role="alert"` | Pass| | |
| B5 | P0 | 4.1.3 | Sửa 1 field, submit lại còn lỗi khác | Lỗi cũ đã sửa không còn được đọc lại; chỉ lỗi hiện tại được announce | Pass| | |
| B6 | P0 | 3.3.1, 4.1.3 | Nhập sai password nhiều lần (server error) | Lỗi server đọc rõ nội dung; **không** bị đọc trùng giữa toast và inline error | Pass | | A11y đạt (message đọc rõ, không trùng). [SEC-AUTH-01] Ngoài scope a11y: backend chưa handle account lockout/brute-force — sai bao nhiêu lần cũng cùng 1 response, không giới hạn số lần thử (`AuthService.java:98-120`) |
| B7 | P0 | 4.1.3, 4.1.2 | Submit hợp lệ, quan sát lúc loading | Trạng thái loading có `aria-busy`/announce, tên nút Submit không đổi lung tung; không thể bấm Enter submit lần 2 (double-submit) | Pass| | |
| B8 | C | 3.3.2, 3.3.1 | Nếu tài khoản có 2FA | Ô nhập code có label, hint định dạng, và validate/announce lỗi nếu sai | | | |
| B9 | P0 | 4.1.2 | Duyệt tới link Forgot password / Sign up | Đây là `link` thật (Rotor → Links thấy chúng), không phải button giả điều hướng | Pass| | |
| B10 | P0 | 2.1.1 | Hoàn tất đăng nhập chỉ bằng bàn phím + VoiceOver, không dùng chuột | Đăng nhập thành công, có thông báo rõ trạng thái | Pass| | |
| B11 | C | 4.1.2, 2.4.4 | Nếu có nút OAuth ("Continue with Google") | Là button/link có accessible name rõ nêu nhà cung cấp; người dùng biết mình sắp rời EduMind sang trang bên thứ ba | Pass| | |
| B12 | P0 | 2.4.3, 4.1.3 | Truy cập protected route khi chưa đăng nhập (vd `/my-learning`) | Bị đưa về Login **và** VoiceOver hiểu được lý do (thông báo cần đăng nhập); sau khi login thành công quay lại đúng destination ban đầu | Pass| | |

## C. SignupPage

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C1 | P0 | 3.3.2 | Duyệt các field bắt buộc | Có đọc là "required" (không chỉ dấu `*` hiển thị) | Pass| | |
| C2 | P0 | 3.3.2 | Focus vào ô Password trước khi gõ | Password requirements đã tồn tại và được đọc liên kết với ô (qua `aria-describedby`) | Pass| | |
| C3 | P0 | 1.4.1, 4.1.3 | Gõ password không đạt yêu cầu | Trạng thái từng yêu cầu (đủ ký tự, có số...) không chỉ đổi màu — VoiceOver đọc được pass/fail của từng yêu cầu | Fail | | Chỉ có **1 error message tại một thời điểm** (từ `zodResolver`/RHF, `errors.password?.message`), lấy từ rule đầu tiên fail trong `createPasswordSchema` (`auth.validation.ts`). Không có UI liệt kê từng tiêu chí (đủ ký tự / có số / có ký tự đặc biệt...) với trạng thái pass/fail riêng — nên VO không thể đọc được toàn bộ trạng thái từng yêu cầu cùng lúc, chỉ đọc được yêu cầu đang fail đầu tiên.<br>Kỳ vọng: mỗi tiêu chí hiển thị dòng riêng (vd "8+ characters — met", "Special character — not met"), nằm trong live region để VO đọc pass/fail từng dòng khi gõ.<br> |
| C4 | P0 | 3.3.1, 3.3.3 | Gõ 2 mật khẩu không khớp, submit | Lỗi mismatch được đọc rõ, focus chuyển đúng chỗ | | | Sign-up chỉ nhập password 1 lần và không có nhập confirm password|
| C5 | P0 | 3.3.1 | Submit để trống toàn bộ | Focus tới error summary/field lỗi đầu tiên | Pass| | |
| C6 | C | 3.3.2, 2.1.1 | Nếu có checkbox Terms | Label đầy đủ khi đọc (không chỉ "I agree"); link Terms bên trong vẫn bấm được bằng bàn phím riêng | | | Không có checkbox Terms|
| C7 | P0 | 3.3.1, 3.3.3 | Đăng ký với email đã tồn tại | Lỗi trùng tài khoản đọc rõ nội dung | Pass| | |
| C8 | P0 | 4.1.3 | Đăng ký thành công | Có announce trạng thái thành công **trước khi** redirect (không bị mất vì chuyển trang quá nhanh) | Pass| | |
| C9 | P0 | 2.4.3 | Dùng Tab qua toàn bộ form | Tab order hợp lý kể cả ở mobile layout (first/last name không bị đảo lộn) | Pass| | |

## D. ForgotPasswordPage

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| D1 | P0 | 3.3.1 | Submit email không hợp lệ | Lỗi validate đọc rõ | Pass| | |
| D2 | P0 | 3.3.3 | Submit email không tồn tại (backend generic response) | Thông báo **không tiết lộ** email có tồn tại hay không, nhưng vẫn đọc rõ hướng dẫn | Pass| | |
| D3 | P0 | 4.1.3 | Submit thành công | Có `role="status"`/live region `polite` đọc thông báo đã gửi email | Pass| | |
| D4 | P0 | 2.4.3 | Sau success, kiểm tra focus | Focus chuyển tới heading/status của confirmation | Pass| | |
| D5 | C | 4.1.2, 4.1.3 | Nếu có nút Resend | Trạng thái disabled/loading/thời gian chờ được đọc rõ | Fail| | [A11Y-A12] Nút "Resend" không có cooldown/thời gian chờ nào: chỉ disable tạm trong lúc request đang chạy (`isLoading`), reset về enabled ngay khi request xong (kể cả lỗi) → có thể bấm liên tục, không giới hạn số lần gửi lại (`ForgotPasswordPage.tsx:67-81`).<br>Ngoài ra nút không có `aria-disabled`/`aria-busy` nên VoiceOver không đọc được trạng thái loading tạm thời của chính nút (chỉ có `role="status"` cho message text, không gắn vào nút).<br>Kỳ vọng: (1) thêm cooldown N giây sau mỗi lần gửi, disable nút kèm đếm ngược hiển thị + đọc được (vd "Resend available in 30s"), (2) gắn `aria-disabled`/`aria-busy` vào nút trong lúc loading/cooldown.<br>Rủi ro liên quan: đây cũng là vấn đề rate-limiting/abuse ở tầng logic (có thể spam gọi API forgot-password), không chỉ là a11y — nên báo thêm cho backend/product. |
| D6 | P0 | 4.1.2 | Link quay lại Login | Là `link` thật, kích hoạt được bằng Enter | Pass| | |

## E. ResetPasswordPage

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E1 | P0 | 1.3.1, 3.3.3 | Mở link reset thiếu token | Heading rõ ràng kiểu "Invalid link"; có action xin link mới | | | |
| E2 | P0 | 1.3.1, 3.3.3 | Mở link reset hết hạn/không hợp lệ | Tương tự E1, không bị hiểu nhầm là link hợp lệ | | | |
| E3 | P0 | 1.3.5, 4.1.2 | Mở link hợp lệ, vào 2 ô mật khẩu mới | Mỗi ô có `autocomplete="new-password"`; 2 nút toggle show/hide có tên độc lập không lẫn nhau | | | |
| E4 | P0 | 1.4.1, 4.1.3 | Gõ mật khẩu không đạt policy | Giống Signup — yêu cầu policy đọc được, không chỉ màu | | | |
| E5 | P0 | 4.1.3 | Submit thành công | Có announce; có link Login rõ; **không redirect quá nhanh** khiến VoiceOver bỏ lỡ thông báo | | | |

## F. WCAG 2.2 — tiêu chí mới (bắt buộc cho target 2.2 AA)

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| W1 | P0 | 3.3.8 Accessible Authentication (Min) | `Cmd + V` paste password vào ô Password ở Login | Paste **thành công** — không bị chặn `onPaste`, không bị xoá ký tự | | | |
| W2 | P0 | 3.3.8 | Paste vào 2 ô New password / Confirm password ở Reset Password | Cả hai ô đều paste được (ô Confirm bị chặn paste là fail phổ biến) | | | |
| W3 | C | 3.3.8 | Paste mã 2FA/OTP vào ô nhập code | Paste được cả chuỗi; nếu ô tách thành nhiều ký tự riêng thì paste vẫn phải tự điền hết các ô | | | |
| W4 | P0 | 3.3.8 | Kiểm tra Safari/password manager có gợi ý điền tự động không ở Login và Signup | Trình duyệt/password manager nhận diện và điền được — không bị `autocomplete="off"` chặn ở field mật khẩu | | | |
| W5 | P0 | 3.3.8 | Kiểm tra có bước xác thực nào yêu cầu ghi nhớ/giải đố không (captcha chữ, câu đố, transcribe) | Không có cognitive function test bắt buộc mà không có phương án thay thế | | | |
| W6 | P0 | 1.3.5 Identify Input Purpose | Inspect thuộc tính `autocomplete` của toàn bộ field trong 4 trang | `email`/`username`, `current-password`, `new-password`, `given-name`, `family-name`, `one-time-code` được khai báo đúng. Ghi field nào thiếu vào Ghi chú | | | |
| W7 | P0 | 3.3.7 Redundant Entry | Signup nhiều bước hoặc Login → 2FA → quay lại | Không bắt nhập lại thông tin đã nhập ở bước trước trong cùng một process (hoặc cho chọn lại giá trị cũ) | | | |
| W8 | P0 | 2.4.11 Focus Not Obscured (Min) | Tab qua form Signup dài trên viewport thấp (thu nhỏ chiều cao cửa sổ) | Field đang focus không bị header sticky hoặc thanh submit cố định che khuất | | | |
| W9 | P0 | 2.5.8 Target Size (Min) | Đo nút toggle show/hide password, checkbox Terms, link phụ | Tối thiểu 24×24 CSS px hoặc có spacing đủ. Ghi số đo thực tế vào Ghi chú | | | |
| W10 | P0 | 3.2.6 Consistent Help | So sánh vị trí link hỗ trợ/liên hệ ở 4 trang auth | Nếu có, luôn ở cùng vị trí tương đối | | | |

## G. Trải nghiệm & nội dung tổng thể

| # | Mức | WCAG SC | Nội dung cần xác nhận | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- |
| G1 | P0 | 2.1.1 | Hoàn tất toàn bộ Login chỉ bằng VoiceOver, không nhìn màn hình | | | |
| G2 | P0 | 3.3.1 | Sửa một form có nhiều lỗi cùng lúc, xác nhận đọc lần lượt không bị chồng lấp | | | |
| G3 | P0 | 4.1.3 | Không có toast/error nào bị đọc lặp lại 2 lần ở bất kỳ bước nào trong flow | | | |
| G4 | P0 | 2.1.1 | Forgot → Reset với token test hoàn tất trọn vẹn bằng VoiceOver | | | |
| G5 | P0 | 3.3.3 | Nội dung error message hướng dẫn được cách khắc phục, không chỉ báo "Invalid" | | | |

## H. Keyboard-only nhanh

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| H1 | P0 | 2.4.3, 2.4.7 | Tab qua Login/Signup/Forgot/Reset | Focus order hợp lý, focus indicator luôn thấy rõ | | | |
| H2 | P0 | 2.1.1 | Enter submit form ở mọi trang | Submit đúng một lần | | | |
| H3 | P0 | 2.1.2 | Tab liên tục qua từng trang, kể cả khi đang mở dropdown/tooltip | Không có keyboard trap ở bất kỳ trang nào | | | |
| H4 | P0 | 2.4.3 | Tab qua form khi đang có lỗi hiển thị | Error summary/message nằm trong tab order hợp lý, không bị nhảy qua | | | |

---

### Kết luận

- Tổng số bước `P0` bị `Fail` (sau R2): ___
- Tổng số bước `Blocked` mức `P0`: ___
- Số bước ghi `N/A` (kèm lý do đã ghi trong bảng): ___
- Flow 2 đủ điều kiện đóng theo `4-flow-a11y.md`? **Có / Chưa** — lý do: ___
- Danh sách Issue ID phát sinh: ___
