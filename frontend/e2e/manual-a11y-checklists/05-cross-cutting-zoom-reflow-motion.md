# Checklist 5 — Cross-cutting: zoom, reflow, contrast, motion, page title

Quy ước điền bảng và template ghi `Fail`: xem [README.md](README.md).

Khác với 4 file kia, phần lớn checklist này **không cần VoiceOver** — chủ yếu dùng mắt, DevTools và cấu hình hệ thống.
Chạy 1 lần mỗi milestone là đủ (không cần chạy lại sau mỗi vòng fix nhỏ), nhưng phải chạy lại trước khi cập nhật README dự án.

## Thông tin kiểm thử

| Trường | Giá trị |
| --- | --- |
| Ngày kiểm thử | |
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

---

## A. Zoom & Resize text (SC 1.4.4)

Zoom trong Safari bằng `Cmd + "+"`. Reset về 100% bằng `Cmd + 0`. Ghi mức zoom vào Ghi chú.

| # | WCAG SC | Thao tác | Kỳ vọng | Kết quả | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| A1 | 1.4.4 | Zoom 200% trên toàn bộ route ở danh sách trên | Mọi nội dung và chức năng vẫn dùng được; không mất text, không bị cắt chữ, không chồng chữ | Pass |  |
| A2 | 1.4.4 | Zoom 200% ở `/checkout` và Course Player | Nút Place Order / Mark complete / video controls vẫn bấm được, không bị đẩy ra ngoài màn hình | Pass |  |
| A3 | 1.4.4 | Zoom 200% khi đang mở cart drawer, mobile filter drawer, AI Tutor panel, modal lỗi | Dialog không bị tràn khỏi viewport; vẫn cuộn được tới nút đóng | Pass |  |
| A4 | 1.4.4 | Zoom 200% ở form Signup có nhiều lỗi hiển thị cùng lúc | Error message không đè lên field, vẫn đọc được đầy đủ | Pass |  |
| A5 | 1.4.4 | Zoom 200%, kiểm tra sticky header | Header không chiếm quá nhiều chiều cao đến mức che hết nội dung; vẫn cuộn tới được cuối trang | Pass |  |

## B. Reflow (SC 1.4.10)

Dùng Responsive Design Mode (`Develop → Enter Responsive Design Mode`, bật menu Develop tại `Safari → Settings → Advanced → Show features for web developers`), đặt kích thước **320 × 256 CSS px** — tương đương zoom 400% ở 1280×1024.

| # | WCAG SC | Thao tác | Kỳ vọng | Kết quả | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| B1 | 1.4.10 | Đặt 320×256, duyệt toàn bộ route trong danh sách | **Không có scroll ngang** ở bất kỳ route nào (trừ ngoại lệ hợp lệ: bảng dữ liệu lớn, code block — phải cuộn ngang trong chính khối đó, không phải cả trang) | Pass |  |
| B2 | 1.4.10 | 320px ở `/courses` | Filter, search, danh sách course, pagination đều dùng được | Pass |  |
| B3 | 1.4.10 | 320px ở `/checkout` và `/checkout/sepay-qr` | Order summary, payment method, QR code, countdown đều hiển thị đủ, không bị cắt | Pass |  |
| B4 | 1.4.10 | 320px trong Course Player | Video player, curriculum drawer, quiz, nút Mark complete đều thao tác được | Pass |  |
| B5 | 1.4.10 | 320px với các dialog/drawer đang mở | Nội dung dialog không bị tràn; nút đóng luôn tiếp cận được | Pass |  |
| B6 | 1.3.4 | Xoay giữa portrait và landscape ở viewport nhỏ | Không khoá hướng màn hình; nội dung dùng được ở cả hai hướng | Pass |  |
| B7 | 1.4.10 | Ở 320px, kiểm tra nút pill AI Tutor và các phần tử `position: fixed` | Không che mất nội dung/nút quan trọng đến mức không thao tác được | Pass |  |

## C. Text spacing (SC 1.4.12)

Áp CSS sau qua DevTools (`Develop → Show Web Inspector → Elements → thêm style vào `*`) hoặc bookmarklet text-spacing:

```css
* { line-height: 1.5 !important; letter-spacing: 0.12em !important;
    word-spacing: 0.16em !important; }
p { margin-bottom: 2em !important; }
```

| # | WCAG SC | Thao tác | Kỳ vọng | Kết quả | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| C1 | 1.4.12 | Áp CSS trên ở Home, Course Detail, Checkout, Course Player | Không mất nội dung, không cắt chữ, không chồng text; nút vẫn đọc được đầy đủ nhãn | Pass |  |
| C2 | 1.4.12 | Kiểm tra riêng các nút và badge có text ngắn trong khung cố định | Text không bị tràn ra ngoài khung hoặc bị `overflow: hidden` cắt mất | Pass |  |

## D. Contrast & màu sắc (SC 1.4.1, 1.4.3, 1.4.11)

Axe/Pa11y đã phủ contrast của text trên nền phẳng. Phần dưới đây là những chỗ **automated tool không kiểm được**.

| # | WCAG SC | Thao tác | Kỳ vọng | Kết quả | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| D1 | 1.4.3 | Kiểm tra text nằm **trên ảnh/gradient** (hero, course card overlay, video poster) | Contrast ≥ 4.5:1 với phần nền xấu nhất (ảnh sáng nhất) | Pass |  |
| D2 | 1.4.3 | Bật `System Settings → Accessibility → Display → Increase contrast`, duyệt lại 4 flow | Giao diện vẫn dùng được, không mất viền/ranh giới giữa các khối | Pass |  |
| D3 | 1.4.1 | Bật `System Settings → Accessibility → Display → Differentiate without color` | Mọi trạng thái chỉ dùng màu (completed/locked, filter đang chọn, payment method đã chọn, refund status, quiz đúng/sai) vẫn phân biệt được bằng text/icon/hình dạng | Pass |  |
| D4 | 1.4.11 | Kiểm tra focus indicator và viền input trên mọi nền | Contrast của indicator ≥ 3:1 so với nền liền kề, kể cả trên card tối/gradient | Pass |  |
| D5 | 1.4.5 | Tìm ảnh chứa chữ (banner khuyến mãi, badge, biểu đồ) | Không dùng images of text khi CSS làm được; nếu buộc phải dùng thì có alt đầy đủ | Pass |  |
| D6 | 1.4.1 | Test `forced-colors` mode thật (Windows High Contrast + Edge/Chrome) | UI không biến mất, icon vẫn thấy, focus indicator vẫn hiện. **macOS/Safari không hỗ trợ `forced-colors`** — nếu không có máy Windows thì ghi `N/A` + lý do, coi là known limitation, không claim đã test | N/A | Không có thiệt bị Windows để test, cần test lại nếu có thiết bị |

## E. Motion (SC 2.3.3, 2.2.2)

Bật `System Settings → Accessibility → Display → Reduce motion` trước khi test mục này.

| # | WCAG SC | Thao tác | Kỳ vọng | Kết quả | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| E1 | 2.3.3 | Bật Reduce motion, duyệt lại Home, Browse, Course Player | Animation chuyển cảnh/parallax/slide bị giảm hoặc tắt; app tôn trọng `prefers-reduced-motion` | Pass |  |
| E2 | 2.3.3 | Reduce motion + mở/đóng drawer, modal, AI Tutor panel | Không còn animation trượt/scale lớn gây khó chịu; dialog vẫn mở/đóng đúng chức năng | Pass |  |
| E3 | 2.2.2 | Tìm mọi nội dung tự chuyển động > 5 giây (carousel, marquee, skeleton pulse, spinner chạy vô hạn, dot "waiting" ở SePay) | Có cách pause/stop/hide, hoặc nội dung không mang thông tin và không gây phân tán | Pass |  |
| E4 | 2.3.1 | Kiểm tra không có nội dung nhấp nháy > 3 lần/giây | Không có flash nào vi phạm ngưỡng | N/A | Không có nội dung nào nhấp nháy > 3 lần/giây |

## F. Page title toàn hệ thống (SC 2.4.2)

| # | WCAG SC | Thao tác | Kỳ vọng | Kết quả | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| F1 | 2.4.2 | Duyệt lần lượt toàn bộ route trong danh sách đầu file, ghi `document.title` của từng route | Mỗi route có title **duy nhất** và mô tả đúng nội dung; không có route nào để title mặc định của app | Pass |  |
| F2 | 2.4.2 | Đổi lesson trong Course Player | Title cập nhật theo lesson hiện tại (không giữ nguyên title cũ) | Pass |  |
| F3 | 2.4.2 | Trang 404 và trang lỗi | Title phản ánh đúng trạng thái lỗi, không dùng title của trang trước | Pass |  |

---

### Kết luận

- Tổng số bước: 27
- Pass: 25
- Fail: 0
- Blocked: 0
- N/A: 2
- Issue còn mở: Không
- Route có vấn đề reflow/zoom nghiêm trọng nhất: ___
- Cross-cutting đủ điều kiện để cập nhật README dự án? **Có / Chưa** — lý do: ___
