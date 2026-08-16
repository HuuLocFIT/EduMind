# Manual Safari + VoiceOver Accessibility Checklists

Bộ checklist thủ công để chủ dự án tự kiểm thử 4 critical journey bằng **Safari + VoiceOver trên macOS**,
theo Definition of Done trong [`4-flow-a11y.md`](../../../4-flow-a11y.md). Kết quả Axe/Pa11y/Playwright
**không thay thế** cho các checklist này — chỉ Safari + VoiceOver mới được tính là bằng chứng "human validation".

## Vì sao phải là Safari, không phải Chrome

VoiceOver là screen reader native của macOS và được Apple/WebAIM khuyến nghị test cùng **Safari**, vì:

- Safari có lớp tích hợp trực tiếp với AX API của macOS (accessibility tree được VoiceOver đọc chính xác nhất từ Safari).
- Chrome + VoiceOver vẫn dùng được nhưng có nhiều khác biệt hành vi đã biết (đọc thiếu live region, đọc sai role một số custom control, thứ tự focus lệch ở dialog/modal) — không phản ánh đúng trải nghiệm người dùng VoiceOver thật.
- README của dự án cam kết "Safari + VoiceOver journeys" — nên bằng chứng phải đến từ đúng tổ hợp đó.

Kết quả đã test bằng Chrome + VoiceOver trước đó nên coi là **sơ bộ**, không dùng để đóng flow. Chỉ kết quả trên Safari mới được ghi vào README/Portfolio.

## Danh sách file

| # | File | Nội dung | Bước P0 |
| --- | --- | --- | --- |
| 0 | [00-summary.md](00-summary.md) | **Tổng hợp kết quả, issue log, evidence index, wording cho README dự án** — điền sau khi chạy xong 5 file dưới | — |
| 1 | [01-discover-flow-safari-voiceover.md](01-discover-flow-safari-voiceover.md) | Discover: Home → Browse Courses → Course Detail | 50 |
| 2 | [02-auth-flow-safari-voiceover.md](02-auth-flow-safari-voiceover.md) | Authentication: Login / Signup / Forgot / Reset | 54 |
| 3 | [03-purchase-flow-safari-voiceover.md](03-purchase-flow-safari-voiceover.md) | Purchase: Cart → Checkout → SePay QR → Success / Failed | 68 |
| 4 | [04-learning-flow-safari-voiceover.md](04-learning-flow-safari-voiceover.md) | Learning: My Learning → Course Player (video, quiz, AI Tutor) | 74 |
| 5 | [05-cross-cutting-zoom-reflow-motion.md](05-cross-cutting-zoom-reflow-motion.md) | Cắt ngang 4 flow: zoom 200%, reflow 320px, text spacing, contrast, reduced motion, page title, Chrome keyboard pass | 31 |

Thứ tự chạy đề xuất: 01 → 02 → 03 → 04 (cần VoiceOver, chạy trong buổi tập trung) → 05 (không cần VoiceOver, chạy riêng) → điền 00.

Mỗi file 01–05 có khối **Core pass (~15 phút)** liệt kê tập con các bước dùng để retest nhanh sau mỗi vòng fix. Lượt đầy đủ bắt buộc chạy ít nhất một lần trước khi cập nhật README dự án.

---

## Bắt buộc: cấu hình máy trước khi test

Bỏ qua các bước dưới đây sẽ cho **kết quả sai** (đặc biệt phần Keyboard-only sẽ fail giả toàn bộ).
Chỉ cần làm một lần trên máy, nhưng phải xác nhận lại trước mỗi buổi test.

### 1. Bật Tab tới link trong Safari — quan trọng nhất

Safari **mặc định không cho `Tab` dừng tại link**, chỉ dừng ở form control.

`Safari → Settings (Cmd + ,) → Advanced → tick "Press Tab to highlight each item on a webpage"`

Kiểm tra nhanh: mở Home, nhấn `Tab` một lần — nếu không thấy **Skip to main content** nhận focus thì tuỳ chọn này chưa bật.

> Mẹo: nếu quên bật, có thể tạm dùng `Option + Tab` để duyệt đầy đủ. Nhưng phần Keyboard-only phải test với `Tab` thuần, nên hãy bật hẳn tuỳ chọn trên.

### 2. Bật Full Keyboard Access của macOS

`System Settings → Keyboard → Keyboard navigation` (bật).

Ảnh hưởng trực tiếp tới hành vi focus của radio group (payment method), checkbox, tab list và các control trong dialog.

### 3. Bật VoiceOver Caption Panel — nguồn bằng chứng duy nhất chụp được

Caption Panel hiển thị **đúng chuỗi text VoiceOver đang đọc** lên màn hình, cho phép screenshot làm evidence
(audio không commit vào repo được).

`VO + F8` (mở VoiceOver Utility) `→ Visuals → Caption Panel → tick "Show caption panel"`

Mọi bước ghi `Fail` **nên** kèm 1 screenshot có Caption Panel.

### 4. Reset VoiceOver về mặc định trước buổi test đầu tiên

Verbosity/speech settings ảnh hưởng tới việc VoiceOver có đọc hay bỏ qua một số thông tin → kết quả sẽ không
reproducible giữa 2 lần test nếu mỗi lần một cấu hình.

`VO + F8 → General → Reset VoiceOver...` (hoặc xác nhận Verbosity đang ở mức **Medium** mặc định và ghi vào cột Ghi chú nếu đã đổi).

### 5. Ghi lại phiên bản

`Apple menu → About This Mac` (macOS) và `Safari → About Safari`. Bắt buộc điền vào bảng metadata của mỗi file —
README dự án chỉ được ghi ngày/phiên bản khi có bằng chứng này. VoiceOver không có số phiên bản riêng, nó đi theo macOS.

## Cách bật/tắt VoiceOver

| Loại máy | Cách bật/tắt |
| --- | --- |
| Mac có hàng phím F1–F12 vật lý | `Cmd + F5` |
| MacBook có Touch Bar (không có phím F5 vật lý) | `Cmd + Fn + F5` |
| MacBook có Touch ID | Giữ `Cmd` rồi bấm phím **Touch ID** 3 lần liên tiếp |
| Bất kỳ máy nào (cách chắc ăn nhất) | `System Settings → Accessibility → VoiceOver → bật toggle`, hoặc mở Siri và nói "Turn VoiceOver on" |

Ghi chú:

- Lần bật **đầu tiên** trên máy, macOS sẽ hiện hộp thoại VoiceOver Quick Start — bấm **Use VoiceOver** hoặc `Enter` để tiếp tục, `Cmd + F5` để huỷ nếu bật nhầm.
- Nếu tổ hợp phím không phản hồi, khả năng shortcut Accessibility đã bị tắt: kiểm tra `System Settings → Keyboard → Keyboard Shortcuts → Accessibility`.
- **Tắt VoiceOver**: `Cmd + F5` luôn có tác dụng kể cả khi bạn bật bằng System Settings; nếu phím tắt bị tắt thì tắt lại bằng toggle trong `System Settings → Accessibility → VoiceOver`.
- Kiểm tra VoiceOver có đang chạy không: nhìn VoiceOver status menu ở góc trên bên phải, hoặc nghe câu chào "VoiceOver on".

## Phím dùng trong checklist

Giả định modifier mặc định `VO = Control + Option`.

| Phím | Chức năng |
| --- | --- |
| `VO + Right/Left Arrow` | Di chuyển tới item kế tiếp/trước trong VO cursor |
| `VO + Space` | Kích hoạt item đang chọn (giống click) |
| `VO + U` | Mở Rotor (Headings, Links, Landmarks, Form Controls...) |
| `VO + Command + H` | Chuyển tới heading kế tiếp |
| `VO + Command + L` | Chuyển tới link kế tiếp |
| `VO + Command + J` | Chuyển tới form control kế tiếp |
| `VO + Shift + Down/Up Arrow` | Vào/ra khỏi một group (dialog, fieldset, web area) |
| `Tab` / `Shift + Tab` | Focus chuẩn trình duyệt (không phải VO cursor) — dùng cho phần keyboard-only |
| `VO + A` | Đọc liên tục từ vị trí hiện tại (Read All) |
| `VO + F2` (nhấn 2 lần) | Đọc lại **page title** của tab hiện tại (dùng cho SC 2.4.2) |
| `Escape` | Đóng modal/drawer đang mở |
| `Control` | Ngắt VoiceOver đang đọc (khi cần dừng giữa chừng) |

## Test data cần chuẩn bị sẵn

Không ghi password, token hay secret thật vào các file này.

- 1 tài khoản student hợp lệ (có cả trạng thái chưa enroll và đã enroll).
- 1 khóa học có curriculum nhiều section, có video có caption test, có quiz, có locked lesson.
- Giỏ hàng có ít nhất 1 sản phẩm để test Purchase flow.
- Token reset password còn hạn **và** token hết hạn/không hợp lệ.
- Sandbox thanh toán ép được cả kịch bản success và failed (PayPal và SePay QR).
- 1 khóa học có dữ liệu AI (embeddings/summary) để AI Tutor trả lời được — nếu không có, các bước AI Tutor ghi `Blocked`.

---

## Test trên production hay local?

Ghi rõ môi trường vào bảng metadata của từng file — **bằng chứng chỉ có giá trị cho đúng build đã test**.

Có thể chạy phần lớn checklist trên production. Các bước "giả lập lỗi" **không** bị loại bỏ, vì error state là
phần a11y có giá trị nhất (happy path hầu như luôn accessible; lỗi thật nằm ở announce/focus/retry khi có lỗi).
Chỉ cần chọn đúng kỹ thuật giả lập.

### Kỹ thuật giả lập an toàn trên production

Những cách dưới đây chỉ tác động tới **trình duyệt của bạn**, không tạo dữ liệu và không chạm tới server.

| Cần giả lập | Cách làm trong Safari | An toàn trên production? |
| --- | --- | --- |
| API trả lỗi (500/404) cho một endpoint | Web Inspector → **Sources → Local Overrides** → thêm override cho URL, đặt status code và body | Có — override chỉ tồn tại trong trình duyệt |
| Mất mạng hoàn toàn / request fail | Tắt Wi-Fi, hoặc Network Link Conditioner profile **100% Loss** | Có |
| Loading state kéo dài để kịp nghe | Network Link Conditioner profile **Edge / Very Bad Network** | Có |
| Empty state | Dùng từ khoá search chắc chắn không có kết quả, hoặc filter không khớp | Có |
| 404 / invalid token / error deep-link | Gõ thẳng URL không hợp lệ: course slug không tồn tại, `/reset-password` thiếu token, `/checkout/failed?error=...` | Có — các trang này render từ URL, không cần đơn hàng thật |
| Lỗi lưu progress khi học | Local Override hoặc tắt mạng đúng lúc autosave | Có — cùng lắm là mất tiến độ của chính bạn |

Cài Network Link Conditioner: `Xcode → Additional Tools for Xcode` (Apple Developer), hoặc bỏ qua và dùng cách tắt Wi-Fi.

### Bước phải chạy ở local/staging — đánh dấu `[LOCAL]` trong checklist

Những bước tạo dữ liệu thật, tốn tiền thật, hoặc cần đổi state ở backend:

- Đặt đơn hàng thật, thanh toán thất bại thật, ép webhook success/failed, để phiên SePay hết hạn.
- Khóa học bị suspended/dropped để hiện access-error modal.
- Đăng ký tài khoản mới (dùng email demo nếu buộc phải làm trên production).

Mẹo giảm phụ thuộc local: nếu sản phẩm có **khóa học miễn phí**, luồng checkout free order chạy được trên
production mà không phát sinh tiền — dùng nó cho các bước checkout thay vì bỏ trắng.

### Ghi môi trường vào kết quả

Nếu một buổi test chạy hỗn hợp (phần lớn production, vài bước `[LOCAL]` chạy local), ghi ở cột Ghi chú của
đúng những bước đó: `chạy local, commit abc1234`. Không gộp chung rồi ghi mập mờ là "đã test".

## Cách ghi kết quả

Mỗi bảng có các cột sau:

| Cột | Ý nghĩa |
| --- | --- |
| **Mức** | `P0` = bắt buộc phải `Pass` mới được đóng flow. `C` = conditional, chỉ áp dụng khi tính năng đó tồn tại; nếu không tồn tại thì ghi `N/A` + lý do, và **không** tính là Fail |
| **WCAG SC** | Success Criterion mà bước này kiểm chứng. Dùng để map bước test ↔ tiêu chí khi viết remediation log và khi trả lời phỏng vấn |
| **R1** | Kết quả lần test đầu tiên |
| **R2** | Kết quả retest sau khi đã fix. Để trống nếu R1 đã `Pass` |
| **Ghi chú / Issue ID** | Với `Fail`: mô tả theo template bên dưới + mã issue để nối sang [BASELINE_ACCESSIBILITY_AUDIT.md](../BASELINE_ACCESSIBILITY_AUDIT.md) |

Giá trị hợp lệ cho `R1`/`R2`: `Pass`, `Fail`, `Blocked`, `N/A`.

- `Pass` — hành vi đúng như Kỳ vọng.
- `Fail` — sai lệch so với Kỳ vọng. Bắt buộc mô tả theo template.
- `Blocked` — thiếu account/data/caption/sandbox/quyền truy cập. Ghi rõ thiếu gì.
- `N/A` — chỉ dùng cho bước `C` khi tính năng không tồn tại trong sản phẩm. Ghi rõ lý do.

### Ghi chú cho bước `Pass` — ghi gì, khi nào để trống

**Mặc định để trống.** `Pass` đã có nghĩa là đúng như cột Kỳ vọng.

Chỉ ghi khi có một trong ba thứ mà cột Kỳ vọng không chứa:

| Trường hợp | Ví dụ ghi |
| --- | --- |
| **Chuỗi VoiceOver thật sự đọc ra** — bằng chứng dương, và là mốc để so sánh khi refactor sau này | `VO đọc "Remove Advanced React Patterns from cart, button"` |
| **Số đo cụ thể** ở các bước yêu cầu đo (target size, contrast, kích thước viewport) | `Play 40×40, CC 32×32, Settings 32×32 — nhỏ nhất 32px` · `Contrast đo được 5.2:1` |
| **Điều kiện khiến kết quả này đúng** — nếu điều kiện đổi thì kết quả có thể khác | `Pass với course có caption VTT; course không có caption xem bước C3` |

**Không** ghi lại thông tin môi trường (phiên bản Safari/macOS, đã bật tab preference...) ở từng dòng —
những thứ đó đã nằm ở bảng metadata đầu file và `00-summary.md` mục 1.

Riêng các bước yêu cầu **đo** (mọi bước SC 2.5.8, và các bước contrast ở checklist 05) thì số đo là **bắt buộc**
kể cả khi Pass — không có số đo thì người đọc không kiểm chứng được kết luận.

### Template mô tả một bước `Fail`

Ghi đúng 4 dòng sau vào cột Ghi chú (dùng `<br>` để xuống dòng trong bảng Markdown):

```text
[A11Y-<flow><số>] VO đọc: "<chuỗi copy từ Caption Panel>"
Focus đang ở: <element đang nhận focus>
Kỳ vọng: <hành vi đúng>
Evidence: docs/a11y-evidence/<ngày>/<flow>/<tên file>.png
```

### Ví dụ điền một bảng

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| X1 | P0 | 2.4.1 | Tab từ đầu trang | Item đầu tiên nhận focus là **Skip to main content** | Pass | | |
| X1b | P0 | 2.5.8 | Đo nút đóng drawer | ≥ 24×24 CSS px | Pass | | Đo được 40×40 |
| X2 | P0 | 4.1.3 | Xoá 1 item khỏi cart | Announce item đã xoá + tổng tiền mới | Fail | Pass | [A11Y-P04] VO đọc: "" (im lặng)<br>Focus đang ở: `body`<br>Kỳ vọng: đọc "Removed Advanced React from cart. New total 499,000 dong"<br>Evidence: docs/a11y-evidence/2026-08-20/purchase/cart-remove-silent.png<br>Fixed tại commit `abc1234`, retest 2026-08-22 → Pass |
| X3 | C | 3.3.1 | Nhập sai code 2FA | Lỗi đọc rõ nội dung | N/A | | Tài khoản test chưa bật 2FA — tính năng có tồn tại nhưng không ép được state, xem A11Y-A09 |

## Lưu evidence

- Thư mục: `docs/a11y-evidence/<YYYY-MM-DD>/<flow>/` (discover / auth / purchase / learning).
- Screenshot phải có **VoiceOver Caption Panel** trong khung hình thì mới chứng minh được VoiceOver đọc gì.
- **Redact trước khi commit**: email, số điện thoại, order ID/transaction ID thật, JWT/token trên URL, số tiền thật nếu là tài khoản thật, avatar/tên người dùng thật.
- Ưu tiên tài khoản demo. Không commit screen recording có audio chứa thông tin cá nhân.

## Điều kiện đóng một flow

Một flow chỉ được đánh dấu hoàn thành trong `4-flow-a11y.md` khi:

1. **Mọi bước `P0` = `Pass`** (ở R1 hoặc R2).
2. Không còn bước `Blocked` nào ở mức `P0`.
3. Bước `C` được ghi `Pass` hoặc `N/A` có lý do — không còn `Fail`.
4. Mỗi `Fail` đã fix đều có Issue ID nối sang remediation log và có commit tương ứng.

Không đánh dấu "validated" trong README dự án khi còn `Fail` hoặc `Blocked` ở mức `P0`.

## Sau khi test xong

Điền [00-summary.md](00-summary.md): số liệu theo flow, issue log, evidence index, known limitations.
Chỉ khi file đó đầy đủ mới cập nhật README dự án — mục 7 và 8 của `00-summary.md` quy định chính xác
được viết gì và **không** được viết gì.

## Phần chưa được bộ checklist này phủ

Ghi rõ để không hiểu nhầm phạm vi bằng chứng:

- **`forced-colors` mode thật** (Windows High Contrast) — macOS/Safari không hỗ trợ media query này; checklist 05 bước D6 thay bằng `Increase contrast` + `Differentiate without color` của macOS và ghi phần còn lại là known limitation.
- **Angular admin portal** — ngoài phạm vi milestone hiện tại.
- **Screen reader khác** (NVDA/JAWS trên Windows, TalkBack trên Android, VoiceOver iOS) — chỉ test macOS VoiceOver.
- **Người dùng thật khuyết tật** — đây là expert review, không phải usability testing với người dùng screen reader thực thụ. Không được diễn đạt thành "validated by users".
