# Checklist 5 — Cross-cutting: zoom, reflow, contrast, motion, page title

Các tiêu chí dưới đây **cắt ngang cả 4 flow** nên được tách riêng thay vì lặp lại trong từng file.
Tham chiếu yêu cầu: mục 1 (Definition of Done) và mục 8 (Manual test matrix) trong [`4-flow-a11y.md`](../../../4-flow-a11y.md).
Quy ước điền bảng và template ghi `Fail`: xem [README.md](README.md).

Khác với 4 file kia, phần lớn checklist này **không cần VoiceOver** — chủ yếu dùng mắt, DevTools và cấu hình hệ thống.
Chạy 1 lần mỗi milestone là đủ (không cần chạy lại sau mỗi vòng fix nhỏ), nhưng phải chạy lại trước khi cập nhật README dự án.

## Thông tin lần test

| Trường | Giá trị |
| --- | --- |
| Ngày test (R1) | |
| Ngày retest (R2) | |
| Môi trường test (Production / Staging / Local) | |
| URL / commit của bản được test | |
| macOS version | |
| Safari version | |
| Chrome version (dùng cho mục F) | |
| Độ phân giải màn hình test | |
| Người test | |
| Kết luận (Pass / Fail / Blocked) | |

## Route được test trong file này

Mỗi bước dưới đây phải chạy trên **toàn bộ** các route sau, ghi kết quả theo route xấu nhất và nêu tên route đó trong Ghi chú:

`/` · `/courses` · `/courses/:slug` · `/login` · `/signup` · `/forgot-password` · `/reset-password` · `/cart` · `/checkout` · `/checkout/sepay-qr` · `/checkout/success` · `/checkout/failed` · `/my-learning` · Course Player (video lesson) · Course Player (quiz lesson)

## Core pass (~15 phút) — dùng khi retest nhanh sau mỗi vòng fix

`A1 · B1 · B4 · C1 · D3 · D4 · E1 · F1`

Lượt **đầy đủ** (toàn bộ bảng bên dưới) bắt buộc chạy ít nhất một lần trước khi cập nhật README dự án. Xem [00-summary.md](00-summary.md) mục 6.

## Ví dụ cách ghi (mẫu tham chiếu — không phải bước test thật)

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| VD1 | P0 | 1.4.10 | Đặt viewport 320×256, duyệt `/checkout` | Không có scroll ngang | Fail | Pass | [A11Y-X02] Order Summary bị tràn ngang 47px tại 320px do bảng giá dùng `min-width: 360px`<br>Route xấu nhất: `/checkout`<br>Kỳ vọng: không có horizontal scroll ở 320 CSS px<br>Evidence: docs/a11y-evidence/2026-08-20/cross-cutting/checkout-320-overflow.png<br>Fixed commit `4f2a9c1`, retest → Pass |
| VD2 | C | 1.4.1 | Bật Windows High Contrast để test `forced-colors` | UI vẫn dùng được | N/A | | Không có máy Windows trong kỳ test này. macOS chỉ hỗ trợ `prefers-contrast` chứ không phải `forced-colors` — đã test thay bằng mục D2. Ghi thành known limitation, **không** claim đã test forced-colors |

---

## A. Zoom & Resize text (SC 1.4.4)

Zoom trong Safari bằng `Cmd + "+"`. Reset về 100% bằng `Cmd + 0`. Ghi mức zoom vào Ghi chú.

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A1 | P0 | 1.4.4 | Zoom 200% trên toàn bộ route ở danh sách trên | Mọi nội dung và chức năng vẫn dùng được; không mất text, không bị cắt chữ, không chồng chữ | | | |
| A2 | P0 | 1.4.4 | Zoom 200% ở `/checkout` và Course Player | Nút Place Order / Mark complete / video controls vẫn bấm được, không bị đẩy ra ngoài màn hình | | | |
| A3 | P0 | 1.4.4 | Zoom 200% khi đang mở cart drawer, mobile filter drawer, AI Tutor panel, modal lỗi | Dialog không bị tràn khỏi viewport; vẫn cuộn được tới nút đóng | | | |
| A4 | P0 | 1.4.4 | Zoom 200% ở form Signup có nhiều lỗi hiển thị cùng lúc | Error message không đè lên field, vẫn đọc được đầy đủ | | | |
| A5 | P0 | 1.4.4 | Zoom 200%, kiểm tra sticky header | Header không chiếm quá nhiều chiều cao đến mức che hết nội dung; vẫn cuộn tới được cuối trang | | | |

## B. Reflow (SC 1.4.10)

Dùng Responsive Design Mode (`Develop → Enter Responsive Design Mode`, bật menu Develop tại `Safari → Settings → Advanced → Show features for web developers`), đặt kích thước **320 × 256 CSS px** — tương đương zoom 400% ở 1280×1024.

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| B1 | P0 | 1.4.10 | Đặt 320×256, duyệt toàn bộ route trong danh sách | **Không có scroll ngang** ở bất kỳ route nào (trừ ngoại lệ hợp lệ: bảng dữ liệu lớn, code block — phải cuộn ngang trong chính khối đó, không phải cả trang) | | | |
| B2 | P0 | 1.4.10 | 320px ở `/courses` | Filter, search, danh sách course, pagination đều dùng được | | | |
| B3 | P0 | 1.4.10 | 320px ở `/checkout` và `/checkout/sepay-qr` | Order summary, payment method, QR code, countdown đều hiển thị đủ, không bị cắt | | | |
| B4 | P0 | 1.4.10 | 320px trong Course Player | Video player, curriculum drawer, quiz, nút Mark complete đều thao tác được | | | |
| B5 | P0 | 1.4.10 | 320px với các dialog/drawer đang mở | Nội dung dialog không bị tràn; nút đóng luôn tiếp cận được | | | |
| B6 | P0 | 1.3.4 | Xoay giữa portrait và landscape ở viewport nhỏ | Không khoá hướng màn hình; nội dung dùng được ở cả hai hướng | | | |
| B7 | P0 | 1.4.10 | Ở 320px, kiểm tra nút pill AI Tutor và các phần tử `position: fixed` | Không che mất nội dung/nút quan trọng đến mức không thao tác được | | | |

## C. Text spacing (SC 1.4.12)

Áp CSS sau qua DevTools (`Develop → Show Web Inspector → Elements → thêm style vào `*`) hoặc bookmarklet text-spacing:

```css
* { line-height: 1.5 !important; letter-spacing: 0.12em !important;
    word-spacing: 0.16em !important; }
p { margin-bottom: 2em !important; }
```

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C1 | P0 | 1.4.12 | Áp CSS trên ở Home, Course Detail, Checkout, Course Player | Không mất nội dung, không cắt chữ, không chồng text; nút vẫn đọc được đầy đủ nhãn | | | |
| C2 | P0 | 1.4.12 | Kiểm tra riêng các nút và badge có text ngắn trong khung cố định | Text không bị tràn ra ngoài khung hoặc bị `overflow: hidden` cắt mất | | | |

## D. Contrast & màu sắc (SC 1.4.1, 1.4.3, 1.4.11)

Axe/Pa11y đã phủ contrast của text trên nền phẳng. Phần dưới đây là những chỗ **automated tool không kiểm được**.

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| D1 | P0 | 1.4.3 | Kiểm tra text nằm **trên ảnh/gradient** (hero, course card overlay, video poster) | Contrast ≥ 4.5:1 với phần nền xấu nhất (ảnh sáng nhất). Dùng Digital Color Meter của macOS để đo, ghi tỉ lệ đo được | | | |
| D2 | P0 | 1.4.3 | Bật `System Settings → Accessibility → Display → Increase contrast`, duyệt lại 4 flow | Giao diện vẫn dùng được, không mất viền/ranh giới giữa các khối | | | |
| D3 | P0 | 1.4.1 | Bật `System Settings → Accessibility → Display → Differentiate without color` | Mọi trạng thái chỉ dùng màu (completed/locked, filter đang chọn, payment method đã chọn, refund status, quiz đúng/sai) vẫn phân biệt được bằng text/icon/hình dạng | | | |
| D4 | P0 | 1.4.11 | Kiểm tra focus indicator và viền input trên mọi nền | Contrast của indicator ≥ 3:1 so với nền liền kề, kể cả trên card tối/gradient | | | |
| D5 | P0 | 1.4.5 | Tìm ảnh chứa chữ (banner khuyến mãi, badge, biểu đồ) | Không dùng images of text khi CSS làm được; nếu buộc phải dùng thì có alt đầy đủ | | | |
| D6 | C | 1.4.1 | Test `forced-colors` mode thật (Windows High Contrast + Edge/Chrome) | UI không biến mất, icon vẫn thấy, focus indicator vẫn hiện. **macOS/Safari không hỗ trợ `forced-colors`** — nếu không có máy Windows thì ghi `N/A` + lý do, coi là known limitation, không claim đã test | | | |

## E. Motion (SC 2.3.3, 2.2.2)

Bật `System Settings → Accessibility → Display → Reduce motion` trước khi test mục này.

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E1 | P0 | 2.3.3 | Bật Reduce motion, duyệt lại Home, Browse, Course Player | Animation chuyển cảnh/parallax/slide bị giảm hoặc tắt; app tôn trọng `prefers-reduced-motion` | | | |
| E2 | P0 | 2.3.3 | Reduce motion + mở/đóng drawer, modal, AI Tutor panel | Không còn animation trượt/scale lớn gây khó chịu; dialog vẫn mở/đóng đúng chức năng | | | |
| E3 | P0 | 2.2.2 | Tìm mọi nội dung tự chuyển động > 5 giây (carousel, marquee, skeleton pulse, spinner chạy vô hạn, dot "waiting" ở SePay) | Có cách pause/stop/hide, hoặc nội dung không mang thông tin và không gây phân tán | | | |
| E4 | P0 | 2.3.1 | Kiểm tra không có nội dung nhấp nháy > 3 lần/giây | Không có flash nào vi phạm ngưỡng | | | |

## F. Page title toàn hệ thống (SC 2.4.2)

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F1 | P0 | 2.4.2 | Duyệt lần lượt toàn bộ route trong danh sách đầu file, ghi `document.title` của từng route | Mỗi route có title **duy nhất** và mô tả đúng nội dung; không có route nào để title mặc định của app | | | |
| F2 | P0 | 2.4.2 | Đổi lesson trong Course Player | Title cập nhật theo lesson hiện tại (không giữ nguyên title cũ) | | | |
| F3 | P0 | 2.4.2 | Trang 404 và trang lỗi | Title phản ánh đúng trạng thái lỗi, không dùng title của trang trước | | | |

Bảng ghi title thu thập được (điền khi test):

| Route | `document.title` thực tế | Duy nhất? | Mô tả đúng? |
| --- | --- | --- | --- |
| `/` | | | |
| `/courses` | | | |
| `/courses/:slug` | | | |
| `/login` | | | |
| `/signup` | | | |
| `/forgot-password` | | | |
| `/reset-password` | | | |
| `/cart` | | | |
| `/checkout` | | | |
| `/checkout/sepay-qr` | | | |
| `/checkout/success` | | | |
| `/checkout/failed` | | | |
| `/my-learning` | | | |
| Course Player (video) | | | |
| Course Player (quiz) | | | |
| 404 | | | |

## G. Chrome desktop keyboard-only (manual matrix mục 8)

Bắt buộc theo `4-flow-a11y.md` mục 8 nhưng **không** thay thế Safari + VoiceOver. Mục đích: bắt lỗi keyboard khác biệt giữa hai engine.

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| G1 | P0 | 2.1.1 | Chrome desktop, keyboard-only: chạy trọn 4 flow đại diện | Hoàn tất được cả 4 journey không dùng chuột | | | |
| G2 | P0 | 2.4.7 | Chrome desktop: quan sát focus indicator toàn bộ 4 flow | Luôn nhìn thấy rõ; không có chỗ nào chỉ dựa vào default outline bị `outline: none` | | | |
| G3 | P0 | 2.1.2 | Chrome desktop: mở mọi dialog/drawer/menu rồi Tab liên tục | Không keyboard trap | | | |
| G4 | P0 | 1.4.4 | Chrome desktop zoom 200% | Kết quả tương đương Safari; ghi rõ nếu có khác biệt giữa hai trình duyệt | | | |

---

### Kết luận

- Tổng số bước `P0` bị `Fail` (sau R2): ___
- Tổng số bước `Blocked` mức `P0`: ___
- Số bước ghi `N/A` (kèm lý do): ___
- Route có vấn đề reflow/zoom nghiêm trọng nhất: ___
- Cross-cutting đủ điều kiện để cập nhật README dự án? **Có / Chưa** — lý do: ___
- Danh sách Issue ID phát sinh: ___
