# Checklist Safari + VoiceOver — Flow 3: Purchase

Phạm vi: `Cart → Checkout → (PayPal redirect | SePay QR) → Success / Failed`.
Tham chiếu yêu cầu: mục 5 trong [`4-flow-a11y.md`](../../../4-flow-a11y.md).
Quy ước điền bảng, template ghi `Fail` và setup máy bắt buộc: xem [README.md](README.md).

**Trước khi bắt đầu**: đã bật `Safari → Advanced → Press Tab to highlight each item`, đã bật Full Keyboard Access, đã bật VoiceOver Caption Panel.

> Yêu cầu test data: sandbox thanh toán phải ép được cả kịch bản **success** và **failed** một cách xác định (deterministic) — không skip vì thiếu dữ liệu. Cần cả đường PayPal (redirect) và SePay (QR + countdown) vì hai đường có rủi ro a11y khác nhau.

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

## Core pass (~15 phút) — dùng khi retest nhanh sau mỗi vòng fix

`A1 · A3 · A4 · A6 · A7 · B1 · B4 · B5 · B7 · B10 · S1 · S2 · S5 · S7 · D2 · E1 · E8 · W4 · W5 · H1 · H3`

Lượt **đầy đủ** (toàn bộ bảng bên dưới) bắt buộc chạy ít nhất một lần trước khi cập nhật README dự án. Xem [00-summary.md](00-summary.md) mục 6.

## Ví dụ cách ghi (mẫu tham chiếu — không phải bước test thật)

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| VD1 | P0 | 4.1.2 | Duyệt tới nút Remove của 1 item trong cart | Tên nút chứa tên khoá học cụ thể | Pass | | VO đọc "Remove Advanced React Patterns from cart, button" |
| VD2 | P0 | 4.1.3 | Đợi countdown SePay hết hạn | Trạng thái expired được announce | Fail | | [A11Y-P12] VO đọc: "" (hoàn toàn im lặng khi trang đổi sang state expired)<br>Focus đang ở: `<body>`, VO cursor vẫn nằm ở QR cũ đã bị unmount<br>Kỳ vọng: live region đọc "Payment session expired. Start a new checkout." và focus chuyển tới heading mới<br>Evidence: docs/a11y-evidence/2026-08-20/purchase/sepay-expired-silent.png<br>Chưa fix — chờ commit |
| VD3 | C | 2.5.8 | Đo nút copy order number ở trang SePay QR | ≥ 24×24 CSS px | Fail | Pass | [A11Y-P13] Đo được 20×20 px (`p-1` + icon 16px)<br>Kỳ vọng: ≥24×24 hoặc tăng padding<br>Evidence: docs/a11y-evidence/2026-08-20/purchase/copy-btn-size.png<br>Fixed commit `9ab3c21` (đổi thành `p-2`), retest → 24×24 Pass |

---

## A. Cart & Cart Drawer

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A0 | P0 | 2.4.2 | `VO + F2` ×2 tại trang Cart | Page title mô tả đúng trang Cart | Pass| | |
| A1 | P0 | 1.3.1 | Mở Cart page, Rotor → Headings | Có `Heading level 1`; số lượng item được đọc tự nhiên (vd "3 items in cart") | Pass| | |
| A2 | P0 | 1.3.1 | Duyệt danh sách item bằng `VO + Right Arrow` | Cart item đọc như list (item 1 of N...); tên khoá học/giá không bị lặp thừa | Pass| | |
| A3 | P0 | 4.1.2, 2.4.4 | Duyệt tới nút Remove của 1 item | Tên nút chứa **tên khoá học cụ thể** (vd "Remove Advanced React from cart"), không chỉ "Remove" | Pass| | |
| A4 | P0 | 4.1.3, 2.4.3 | Kích hoạt Remove | Có announce item đã xoá + tổng tiền mới; focus chuyển tới item kế tiếp hoặc heading cart/empty-state | | | |
| A5 | P0 | 1.3.1, 2.4.4 | Xoá hết item về cart rỗng | Empty state có heading + link "Browse Courses" đọc rõ | Pass| | |
| A6 | P0 | 4.1.2, 2.4.3 | Mở cart drawer (từ icon giỏ hàng trên header hoặc sau Add to Cart) | Drawer là dialog có tên; focus vào trong drawer ngay khi mở | Pass| | |
| A7 | P0 | 2.4.3 | Trong drawer, nhấn `Escape` | Drawer đóng; focus quay lại đúng nút/icon đã mở nó | Pass| | |
| A8 | P0 | 2.1.2 | Trong drawer, thử `VO + Right Arrow` liên tục | Focus không thoát ra nội dung nền phía sau | Pass| | |
| A9 | P0 | 1.3.1 | Duyệt giá gốc/giảm giá/tổng trong cart | Có label rõ ràng, đọc dễ hiểu, không lẫn số cũ/mới | Pass| | |
| A10 | C | 4.1.2, 3.3.1 | Nếu CTA Checkout đang disabled | Lý do disabled được đọc rõ (không chỉ im lặng vô hiệu hoá) | | | |
| A11 | C | 4.1.2, 2.4.3 | Nếu Remove có dialog xác nhận | Dialog có tên, focus vào trong, `Escape` huỷ được, focus quay lại nút Remove sau khi huỷ | Pass| | |
| A12 | P0 | 4.1.3 | Giả lập lỗi khi xoá item/clear cart (chặn `DELETE /api/cart/items/{courseId}` hoặc `DELETE /api/cart` trong Network) | Lỗi được announce qua alert/live region **không cần focus di chuyển tới** (không bắt buộc nút Retry riêng — nút Remove/Clear gốc vẫn bấm lại được ngay là đủ); nút đó phải trở lại trạng thái bấm được (không kẹt loading/disabled) sau khi fail | | | |

## B. CheckoutPage

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| B0 | P0 | 2.4.2 | `VO + F2` ×2 tại Checkout | Page title mô tả đúng bước Checkout | Pass| | |
| B1 | P0 | 1.3.1 | Mở Checkout, Rotor → Headings | `Heading level 1` cho trang; `Heading level 2` cho Order Summary và Payment Method | | | |
| B2 | P0 | 1.3.1 | Duyệt Order Summary | Đọc như list/description có cấu trúc, không phải một khối text dài không ngắt | | | |
| B3 | P0 | 1.3.1, 4.1.2 | Duyệt Total | Có label rõ, đơn vị tiền tệ đọc chuẩn (vd "Total: 499,000 Vietnamese dong" hoặc tương đương) | | | |
| B4 | P0 | 1.3.1, 2.1.1 | Vào nhóm Payment Methods bằng `VO + Command + J` | Đọc được tên nhóm (fieldset/legend); dùng Arrow Left/Right đổi được giữa các phương thức | | | |
| B5 | P0 | 1.4.1, 4.1.2 | Chọn 1 payment method | Trạng thái "selected" được đọc, không chỉ hiện bằng border/màu | | | |
| B6 | C | 3.3.2 | Nếu có checkbox Terms/confirmation | Label đầy đủ, không viết tắt gây khó hiểu khi đọc | | | |
| B7 | P0 | 4.1.3, 4.1.2 | `[LOCAL]` Kích hoạt Place Order (trên production chỉ chạy được nếu có khóa học miễn phí) | Trạng thái loading/processing có announce; tên nút giữ ổn định (không đổi thành spinner vô danh); Enter/Space thêm lần nữa **không** submit trùng | | | |
| B8 | P0 | 3.3.1, 2.4.3 | Submit thiếu thông tin (validation) | Focus chuyển tới error/summary phù hợp | | | |
| B9 | P0 | 4.1.3, 2.4.3 | `[LOCAL]` Giả lập backend failure ở bước submit | Lỗi đọc bằng alert/error summary, focus chuyển đúng | | | |
| B10 | P0 | 2.4.4, 3.2.2 | `[LOCAL]` Chọn PayPal → trước khi redirect sang cổng thanh toán ngoài | Có thông báo rõ "bạn sắp rời EduMind sang PayPal" được screen reader đọc trước khi chuyển | | | |
| B11 | P0 | 3.3.3, 2.4.4 | Test route Direct Checkout khi thiếu item/course | Có recovery action rõ ràng (không phải trang trắng/lỗi im lặng) | | | |
| B12 | P0 | 4.1.2 | Nút Back | Là link/button hoạt động chuẩn kể cả khi lịch sử trình duyệt trống | | | |

## C. SePay QR Page (`/checkout/sepay-qr` — đường thanh toán QR)

> Trang này nằm giữa Checkout và Success/Failed. Rủi ro cao vì QR là hình ảnh, có countdown hết hạn và có polling đổi trạng thái nền.

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S1 | P0 | 1.3.1, 2.4.2 | Vào trang QR, Rotor → Headings + `VO + F2` ×2 | Có `Heading level 1` ("Scan to Pay with SePay"); page title mô tả đúng bước đang chờ thanh toán | | | |
| S2 | P0 | 1.1.1 | Duyệt tới ảnh QR bằng `VO + Right Arrow` | Ảnh QR hiện đang `aria-hidden` — kiểm tra người dùng screen reader **vẫn hoàn tất thanh toán được** bằng thông tin dạng text (số tài khoản, nội dung chuyển khoản, số tiền) đọc và copy được. Nếu QR là **cách duy nhất** → đây là fail chức năng, ghi rõ | | | |
| S3 | P0 | 4.1.2 | Duyệt tới số tiền và Order number | Cả hai có label rõ khi đọc; giá trị đọc đúng đơn vị tiền tệ | | | |
| S4 | P0 | 4.1.2, 4.1.3 | Kích hoạt nút Copy order number bằng `VO + Space` | Nút có accessible name (không chỉ `title`); sau khi copy có phản hồi được đọc ("Copied") chứ không chỉ đổi icon | | | |
| S5 | P0 | 4.1.3 | Duyệt tới dòng "Waiting for payment confirmation..." | Là live region `polite`/`role="status"` — khi trạng thái đổi, VoiceOver được thông báo | | | |
| S6 | P0 | 2.2.1 Timing Adjustable | `[LOCAL]` Quan sát bộ đếm "Time remaining" | Người dùng biết được có giới hạn thời gian **bằng âm thanh/text** chứ không chỉ nhìn số đếm; có cảnh báo trước khi hết hạn (ít nhất 20 giây) và có cách gia hạn/tạo lại phiên | | | |
| S7 | P0 | 4.1.3 | `[LOCAL]` Để countdown chạy tới 0 | Chuyển sang state `expired` được **announce**; focus/VO cursor chuyển tới heading mới; không im lặng | | | |
| S8 | P0 | 4.1.3 | Bộ đếm giây khi đang chờ | Bộ đếm **không** bị đọc lại mỗi giây (live region quá "nói nhiều" cũng là lỗi trải nghiệm — ghi rõ nếu VoiceOver đọc liên tục) | | | |
| S9 | P0 | 4.1.3, 2.4.3 | `[LOCAL]` Ép webhook/polling trả success | Chuyển từ scanning → success được announce; focus chuyển tới nội dung mới | | | |
| S10 | P0 | 3.3.3, 2.4.4 | Vào trang QR với session không hợp lệ/hết hạn | Có heading rõ + action "start a new checkout" tiếp cận được bằng bàn phím | | | |
| S11 | P0 | 2.1.1 | Hoàn tất toàn bộ trang QR chỉ bằng bàn phím | Copy được thông tin, quay lại được, không cần chuột | | | |

## D. CheckoutSuccessPage

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| D1 | P0 | 4.1.3 | `[LOCAL]` Vào trang ngay lúc đang capture/loading | Có `role="status"` + text loading đọc được | | | |
| D2 | P0 | 1.3.1, 4.1.3 | `[LOCAL]` Đợi chuyển sang success | Có `Heading level 1` cho success; VoiceOver **biết** trạng thái đã đổi từ loading sang success (không im lặng) | | | |
| D3 | P0 | 1.3.1 | Duyệt Order ID/number | Có label rõ ràng khi đọc | | | |
| D4 | P0 | 4.1.2 | Duyệt các next action (My Learning/Orders...) | Đều là link/button đúng semantics, tên rõ | | | |
| D5 | P0 | 2.2.1 | Quan sát có auto-redirect không | Không tự chuyển trang trước khi có đủ thời gian để nghe hết thông báo; nếu có thì phải tắt/hoãn được | | | |
| D6 | P0 | 4.1.3, 3.3.3 | `[LOCAL]` Giả lập capture error | Có error heading/alert + recovery action rõ | | | |

## E. CheckoutFailedPage

> Toàn bộ mục này **chạy được trên production**: `/checkout/failed` render từ query string, không cần đơn hàng thật. Vào thẳng URL với từng mã lỗi để test 5 kịch bản bên dưới.

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E1 | P0 | 1.3.1, 3.3.3 | Test kịch bản **User cancelled** | `Heading level 1` phù hợp ngữ cảnh cancel; nội dung đọc rõ nguyên nhân | | | |
| E2 | P0 | 1.3.1, 3.3.3 | Test kịch bản **Instrument declined** | Heading + nội dung khác với cancel, phản ánh đúng lý do | | | |
| E3 | P0 | 4.1.2 | Test kịch bản **Retry limit exceeded** | Nút Retry **không xuất hiện** hoặc bị disabled với lý do rõ | | | |
| E4 | P0 | 1.4.1 | Test kịch bản **Enrollment failed nhưng đã refund** | Trạng thái refund + timeline đọc rõ, không chỉ dựa vào màu | | | |
| E5 | P0 | 4.1.3 | Test kịch bản **Manual refund required** | Trạng thái pending có status text đọc rõ | | | |
| E6 | P0 | 2.1.1, 4.1.2 | Với mỗi kịch bản ở trên | Nút Retry/Back/Support hoạt động đúng bằng bàn phím, tên nút phản ánh đúng hành động | | | |
| E7 | P0 | 3.3.3 | Khi vào trang bằng deep-link có query string lỗi | Không hiển thị message kỹ thuật thô/không giới hạn độ dài | | | |
| E8 | P0 | 2.4.3 | Focus khi chuyển từ Checkout sang Failed page | Focus chuyển tới heading của trang Failed | | | |

## F. WCAG 2.2 — tiêu chí mới (bắt buộc cho target 2.2 AA)

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| W1 | P0 | 3.3.7 Redundant Entry | Đi Cart → Checkout → quay lại sửa → Checkout lại | Thông tin đã nhập trước đó (payment method đã chọn, thông tin billing nếu có) **không bắt nhập lại** hoặc cho chọn lại giá trị cũ | | | |
| W2 | P0 | 3.3.7 | Thanh toán fail → bấm Retry | Không phải nhập lại từ đầu toàn bộ thông tin đã cung cấp | | | |
| W3 | P0 | 2.2.1 Timing Adjustable | SePay QR countdown + order expiry | Xem chi tiết mục **S6/S7**. Kết luận chung ở đây: có time limit → phải turn-off/adjust/extend được, hoặc chứng minh thuộc exception (real-time transaction). Ghi rõ căn cứ | | | |
| W4 | P0 | 2.4.11 Focus Not Obscured (Min) | Tab qua Checkout khi trang đã cuộn, và khi cart drawer đang mở | Element focus không bị header sticky/drawer/summary bar cố định che khuất hoàn toàn | | | |
| W5 | P0 | 2.5.8 Target Size (Min) | Đo: nút Remove item, nút đóng drawer, nút copy order number ở SePay, radio payment method, nút Back | ≥ 24×24 CSS px hoặc có spacing đủ. Ghi số đo từng nút vào Ghi chú | | | |
| W6 | P0 | 2.5.7 Dragging Movements | Kiểm tra có thao tác kéo nào trong flow không (kéo để xoá item, slider số lượng, swipe-to-delete trên mobile) | Mọi thao tác kéo đều có phương án single-pointer/bàn phím tương đương | | | |
| W7 | P0 | 3.2.6 Consistent Help | So sánh vị trí link Support/Contact ở Cart, Checkout, SePay QR, Success, Failed | Nếu có, luôn ở cùng vị trí tương đối. Trang Failed thường có "Contact support" — kiểm tra các trang khác có nhất quán không | | | |

## G. Trải nghiệm & nội dung nghiệp vụ

| # | Mức | WCAG SC | Nội dung cần xác nhận | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- |
| G1 | P0 | 2.1.1 | Add/remove course hoàn tất trọn vẹn chỉ bằng VoiceOver | | | |
| G2 | P0 | 1.3.1 | Order summary đọc đúng, dễ hiểu, không gây hiểu nhầm về số tiền | | | |
| G3 | P0 | 2.1.1 | Payment method chọn được hoàn toàn bằng bàn phím + VoiceOver | | | |
| G4 | P0 | 2.1.1 | Cả Success **và** Failed flow hoàn tất được bằng VoiceOver trong cùng buổi test | | | |
| G5 | P0 | 4.1.3 | Loading/success/error mỗi trạng thái chỉ được announce **đúng một lần** | | | |
| G6 | P0 | 3.3.3 | Nội dung hướng dẫn xử lý refund/payment đúng nghiệp vụ thực tế (không chỉ đúng kỹ thuật) | | | |

## H. Keyboard-only nhanh

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| H1 | P0 | 2.4.3 | Tab toàn bộ Cart → Checkout → SePay QR → Success/Failed | Focus order hợp lý | | | |
| H2 | P0 | 2.1.1 | Arrow Left/Right đổi payment method | Hoạt động đúng, không cần Tab qua từng option | | | |
| H3 | P0 | 2.4.3 | Escape đóng cart drawer | Focus quay lại đúng trigger | | | |
| H4 | P0 | 2.1.2 | Tab liên tục ở mọi bước, kể cả khi drawer/dialog mở | Không keyboard trap ở bất kỳ bước nào trong flow | | | |
| H5 | P0 | 2.4.7 | Quan sát focus indicator ở mọi trang trong flow | Luôn nhìn thấy rõ, kể cả trên nền card/gradient | | | |

---

### Kết luận

- Tổng số bước `P0` bị `Fail` (sau R2): ___
- Tổng số bước `Blocked` mức `P0`: ___
- Số bước ghi `N/A` (kèm lý do đã ghi trong bảng): ___
- Flow 3 đủ điều kiện đóng theo `4-flow-a11y.md`? **Có / Chưa** — lý do: ___
- Danh sách Issue ID phát sinh: ___
