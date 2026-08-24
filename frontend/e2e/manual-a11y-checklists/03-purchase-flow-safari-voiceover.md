# Checklist Safari + VoiceOver — Flow 3: Purchase

Phạm vi: `Cart → Checkout → (PayPal redirect | SePay QR) → Success / Failed`.
Quy ước điền bảng, template ghi `Fail` và setup máy bắt buộc: xem [README.md](README.md).

**Trước khi bắt đầu**: đã bật `Safari → Advanced → Press Tab to highlight each item`, đã bật Full Keyboard Access, đã bật VoiceOver Caption Panel.

> Yêu cầu test data: sandbox thanh toán phải ép được cả kịch bản **success** và **failed** một cách xác định (deterministic) — không skip vì thiếu dữ liệu. Cần cả đường PayPal (redirect) và SePay (QR + countdown) vì hai đường có rủi ro a11y khác nhau.

## Thông tin kiểm thử

| Trường | Giá trị |
| --- | --- |
| Ngày kiểm thử | 20/08/2026|
| macOS version | macOs Sequoia - Version 15.1|
| Safari version | Version 18.1|
| VoiceOver verbosity (default: Medium) | Medium|
| Kết luận flow (Pass / Fail) | Pass|

---

## A. Cart & Cart Drawer

| # | WCAG SC | Thao tác | Kỳ vọng | Kết quả | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| A0 | 2.4.2 | `VO + F2` ×2 tại trang Cart | Page title mô tả đúng trang Cart | Pass |  |
| A1 | 1.3.1 | Mở Cart page, Rotor → Headings | Có `Heading level 1`; số lượng item được đọc tự nhiên (vd "3 items in cart") | Pass |  |
| A2 | 1.3.1 | Duyệt danh sách item bằng `VO + Right Arrow` | Cart item đọc như list (item 1 of N...); tên khoá học/giá không bị lặp thừa | Pass |  |
| A3 | 4.1.2, 2.4.4 | Duyệt tới nút Remove của 1 item | Tên nút chứa **tên khoá học cụ thể** (vd "Remove Advanced React from cart"), không chỉ "Remove" | Pass |  |
| A4 | 4.1.3, 2.4.3 | Kích hoạt Remove | Có announce item đã xoá + tổng tiền mới; focus chuyển tới item kế tiếp hoặc heading cart/empty-state | Pass |  |
| A5 | 1.3.1, 2.4.4 | Xoá hết item về cart rỗng | Empty state có heading + link "Browse Courses" đọc rõ | Pass |  |
| A6 | 4.1.2, 2.4.3 | Mở cart drawer (từ icon giỏ hàng trên header hoặc sau Add to Cart) | Drawer là dialog có tên; focus vào trong drawer ngay khi mở | Pass |  |
| A7 | 2.4.3 | Trong drawer, nhấn `Escape` | Drawer đóng; focus quay lại đúng nút/icon đã mở nó | Pass |  |
| A8 | 2.1.2 | Trong drawer, thử `VO + Right Arrow` liên tục | Focus không thoát ra nội dung nền phía sau | Pass |  |
| A9 | 1.3.1 | Duyệt giá gốc/giảm giá/tổng trong cart | Có label rõ ràng, đọc dễ hiểu, không lẫn số cũ/mới | Pass |  |
| A10 | 4.1.2, 3.3.1 | Nếu CTA Checkout đang disabled | Lý do disabled được đọc rõ (không chỉ im lặng vô hiệu hoá) | Pass |  |
| A11 | 4.1.2, 2.4.3 | Nếu Remove có dialog xác nhận | Dialog có tên, focus vào trong, `Escape` huỷ được, focus quay lại nút Remove sau khi huỷ | Pass |  |
| A12 | 4.1.3 | Giả lập lỗi khi xoá item/clear cart (chặn `DELETE /api/cart/items/{courseId}` hoặc `DELETE /api/cart` trong Network) | Lỗi được announce qua alert/live region **không cần focus di chuyển tới** (không bắt buộc nút Retry riêng — nút Remove/Clear gốc vẫn bấm lại được ngay là đủ); nút đó phải trở lại trạng thái bấm được (không kẹt loading/disabled) sau khi fail | Pass |  |

## B. CheckoutPage

| # | WCAG SC | Thao tác | Kỳ vọng | Kết quả | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| B0 | 2.4.2 | `VO + F2` ×2 tại Checkout | Page title mô tả đúng bước Checkout | Pass |  |
| B1 | 1.3.1 | Mở Checkout, Rotor → Headings | `Heading level 1` cho trang; `Heading level 2` cho Order Summary và Payment Method | Pass |  |
| B2 | 1.3.1 | Duyệt Order Summary | Đọc như list/description có cấu trúc, không phải một khối text dài không ngắt | Pass |  |
| B3 | 1.3.1, 4.1.2 | Duyệt Total | Có label rõ, đơn vị tiền tệ đọc chuẩn (vd "Total: 499,000 Vietnamese dong" hoặc tương đương) | Pass |  |
| B4 | 1.3.1, 2.1.1 | Vào nhóm Payment Methods bằng `VO + Command + J` | Đọc được tên nhóm (fieldset/legend); dùng Arrow Left/Right đổi được giữa các phương thức | Pass |  |
| B5 | 1.4.1, 4.1.2 | Chọn 1 payment method | Trạng thái "selected" được đọc, không chỉ hiện bằng border/màu | Pass |  |
| B6 | 3.3.2 | Nếu có checkbox Terms/confirmation | Label đầy đủ, không viết tắt gây khó hiểu khi đọc | N/A | Hiện tại không có checkbox Terms/confirmation |
| B7 | 4.1.3, 4.1.2 | `[LOCAL]` Kích hoạt Place Order (trên production chỉ chạy được nếu có khóa học miễn phí) | Trạng thái loading/processing có announce; tên nút giữ ổn định (không đổi thành spinner vô danh); Enter/Space thêm lần nữa **không** submit trùng | Pass |  |
| B8 | 3.3.1, 2.4.3 | Submit thiếu thông tin (validation) | Focus chuyển tới error/summary phù hợp | Pass |  |
| B9 | 4.1.3, 2.4.3 | `[LOCAL]` Giả lập backend failure ở bước submit | Lỗi đọc bằng alert/error summary, focus chuyển đúng | Pass |  |
| B10 | 2.4.4, 3.2.2 | `[LOCAL]` Chọn PayPal → trước khi redirect sang cổng thanh toán ngoài | Có thông báo rõ "bạn sắp rời EduMind sang PayPal" được screen reader đọc trước khi chuyển | Pass |  |
| B11 | 3.3.3, 2.4.4 | Test route Direct Checkout khi thiếu item/course | Có recovery action rõ ràng (không phải trang trắng/lỗi im lặng) | Pass |  |
| B12 | 4.1.2 | Nút Back | Là link/button hoạt động chuẩn kể cả khi lịch sử trình duyệt trống | Pass |  |

## C. SePay QR Page (`/checkout/sepay-qr` — đường thanh toán QR)

> Trang này nằm giữa Checkout và Success/Failed. Rủi ro cao vì QR là hình ảnh, có countdown hết hạn và có polling đổi trạng thái nền.

| # | WCAG SC | Thao tác | Kỳ vọng | Kết quả | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| S1 | 1.3.1, 2.4.2 | Vào trang QR, Rotor → Headings + `VO + F2` ×2 | Có `Heading level 1` ("Scan to Pay with SePay"); page title mô tả đúng bước đang chờ thanh toán | Pass |  |
| S2 | 1.1.1 | Duyệt tới ảnh QR bằng `VO + Right Arrow` | Ảnh QR hiện đang `aria-hidden` — kiểm tra người dùng screen reader **vẫn hoàn tất thanh toán được** bằng thông tin dạng text (số tài khoản, nội dung chuyển khoản, số tiền) đọc và copy được. Nếu QR là **cách duy nhất** → đây là fail chức năng, ghi rõ | Pass |  |
| S3 | 4.1.2 | Duyệt tới số tiền và Order number | Cả hai có label rõ khi đọc; giá trị đọc đúng đơn vị tiền tệ | Pass |  |
| S4 | 4.1.2, 4.1.3 | Kích hoạt nút Copy order number bằng `VO + Space` | Nút có accessible name (không chỉ `title`); sau khi copy có phản hồi được đọc ("Copied") chứ không chỉ đổi icon | Pass |  |
| S5 | 4.1.3 | Rotor → Headings/Landmarks hoặc Inspect Element tại dòng "Waiting for payment confirmation..." khi đang ở state `scanning` | Element (hoặc ancestor gần nhất) có `role="status"`/`aria-live="polite"` ngay khi mount, làm nền cho mọi cập nhật polite trong tương lai. **Không** yêu cầu tự đọc lại khi chuyển hẳn sang success/expired/error — vì mỗi state là 1 JSX block khác nhau (unmount/remount), việc announce khi chuyển state đã test riêng ở S7/S9, không lặp lại ở đây | Pass |  |
| S6 | 2.2.1 Timing Adjustable | `[LOCAL]` Quan sát bộ đếm "Time remaining" khi còn dưới 60s (ngưỡng cảnh báo hiện tại trong code) | Có cảnh báo **tiếp cận được** (announce qua live region, hoặc text/label đổi nội dung — không chỉ đổi màu) rằng sắp hết hạn, ít nhất 20 giây trước khi hết hạn | Pass |  |
| S6b | 2.2.1 Timing Adjustable | `[LOCAL]` Kiểm tra có cơ chế gia hạn/tạo lại QR **tại chỗ** (không rời trang, không phải làm lại checkout từ đầu) trước khi hết hạn | Có nút Extend/Regenerate tại chỗ, **hoặc** nếu không có, phải chứng minh thuộc **Essential Exception** của 2.2.1 (gia hạn tại chỗ sẽ làm mất hiệu lực hoạt động — vd QR/nội dung chuyển khoản gắn chặt với 1 giao dịch cụ thể, cho gia hạn dễ phát sinh rủi ro double-scan/mismatch số tiền) và ghi rõ căn cứ | N/A | Không có nút extend/regenerate tại chỗ trong `SepayQrPage.tsx` — chỉ có "Cancel Payment" khi đang `scanning`, và "Try Again" (quay lại `/checkout`, tạo đơn mới hoàn toàn) khi đã `expired`.<br>Chấp nhận là **Essential Exception**: QR SePay gắn với 1 order/nội dung chuyển khoản cụ thể — cho phép gia hạn tại chỗ có thể dẫn tới nhầm lẫn giao dịch cũ/mới hoặc bị lợi dụng. Restart toàn bộ checkout là chủ đích bảo mật, không phải thiếu sót kỹ thuật.<br>Lưu ý: exception này **không** miễn trừ yêu cầu cảnh báo tiếp cận được ở S6 — hai việc độc lập nhau. |
| S7 | 4.1.3 | `[LOCAL]` Để countdown chạy tới 0 | Chuyển sang state `expired` được **announce**; focus/VO cursor chuyển tới heading mới; không im lặng | Pass |  |
| S8 | 4.1.3 | Bộ đếm giây khi đang chờ | Bộ đếm **không** bị đọc lại mỗi giây (live region quá "nói nhiều" cũng là lỗi trải nghiệm — ghi rõ nếu VoiceOver đọc liên tục) | Pass |  |
| S9 | 4.1.3, 2.4.3 | `[LOCAL]` Ép webhook/polling trả success | **[ĐÃ ĐỔI]** Không còn state `success`/heading "Payment Received!" trên `SepayQrPage` nữa — khi phát hiện `COMPLETED`, `navigate()` gọi ngay lập tức (0 delay, kỹ thuật G110) sang `CheckoutSuccessPage`, nơi focus/announce thật sự diễn ra (test ở D2). Kỳ vọng ở đây chỉ còn: `navigate` được gọi đúng URL, không có UI/focus trung gian nào cần kiểm tra trên trang này | Pass | Xem ghi chú chi tiết ở **D5** (đã sửa `SepayQrPage.tsx`: bỏ hẳn state `success` + `setTimeout(2000ms)`, `navigate` ngay lập tức; giữ nguyên focus-management cho `expired`). |
| S10 | 3.3.3, 2.4.4 | Vào trang QR với session không hợp lệ/hết hạn | Có heading rõ + action "start a new checkout" tiếp cận được bằng bàn phím | Pass |  |
| S11 | 2.1.1 | Hoàn tất toàn bộ trang QR chỉ bằng bàn phím | Copy được thông tin, quay lại được, không cần chuột | Pass |  |

## D. CheckoutSuccessPage

| # | WCAG SC | Thao tác | Kỳ vọng | Kết quả | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| D1 | 4.1.3 | `[LOCAL]` Vào trang ngay lúc đang capture/loading | Có `role="status"` + text loading đọc được | Pass |  |
| D2 | 1.3.1, 4.1.3 | `[LOCAL]` Đợi chuyển sang success | Có `Heading level 1` cho success; VoiceOver **biết** trạng thái đã đổi từ loading sang success (không im lặng) | Pass |  |
| D3 | 1.3.1 | Duyệt Order ID/number | Có label rõ ràng khi đọc | Pass |  |
| D4 | 4.1.2 | Duyệt các next action (My Learning/Orders...) | Đều là link/button đúng semantics, tên rõ | Pass |  |
| D5 | 2.2.1 | Quan sát có auto-redirect không | Không tự chuyển trang trước khi có đủ thời gian để nghe hết thông báo; nếu có thì phải tắt/hoãn được | N/A | Không có auto redirect nào |
| D6 | 4.1.3, 3.3.3 | `[LOCAL]` Giả lập capture error | Có error heading/alert + recovery action rõ | Pass |  |

## E. CheckoutFailedPage

> Toàn bộ mục này **chạy được trên production**: `/checkout/failed` render từ query string, không cần đơn hàng thật. Vào thẳng URL với từng mã lỗi để test 5 kịch bản bên dưới.

| # | WCAG SC | Thao tác | Kỳ vọng | Kết quả | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| E1 | 1.3.1, 3.3.3 | Test kịch bản **User cancelled** | `Heading level 1` phù hợp ngữ cảnh cancel; nội dung đọc rõ nguyên nhân | Pass |  |
| E2 | 1.3.1, 3.3.3 | Test kịch bản **Instrument declined** | Heading + nội dung khác với cancel, phản ánh đúng lý do | Pass |  |
| E3 | 4.1.2 | Test kịch bản **Retry limit exceeded** | Nút Retry **không xuất hiện** hoặc bị disabled với lý do rõ | Pass | Không có nút Retry, chỉ có nút Start New Order |
| E4 | 1.4.1 | Test kịch bản **Enrollment failed nhưng đã refund** | Trạng thái refund + timeline đọc rõ, không chỉ dựa vào màu | Pass |  |
| E5 | 4.1.3 | Test kịch bản **Manual refund required** | Trạng thái pending có status text đọc rõ | Pass |  |
| E6 | 2.1.1, 4.1.2 | Với mỗi kịch bản ở trên | Nút Retry/Back/Support hoạt động đúng bằng bàn phím, tên nút phản ánh đúng hành động | Pass |  |
| E7 | 3.3.3 | Khi vào trang bằng deep-link có query string lỗi | Không hiển thị message kỹ thuật thô/không giới hạn độ dài | Pass |  |
| E8 | 2.4.3 | Focus khi chuyển từ Checkout sang Failed page | Focus chuyển tới heading của trang Failed | Pass |  |

## F. WCAG 2.2 — tiêu chí mới (bắt buộc cho target 2.2 AA)

| # | WCAG SC | Thao tác | Kỳ vọng | Kết quả | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| W1 | 3.3.7 Redundant Entry | Đi Cart → Checkout → quay lại sửa → Checkout lại | Thông tin đã nhập trước đó (payment method đã chọn, thông tin billing nếu có) **không bắt nhập lại** hoặc cho chọn lại giá trị cũ | Pass | Không chọn lại payment method khi qua trở lại |
| W2 | 3.3.7 | Thanh toán fail → bấm Retry | Không phải nhập lại từ đầu toàn bộ thông tin đã cung cấp | Pass | Không chọn lại payment method |
| W3 | 2.2.1 Timing Adjustable | SePay QR countdown + order expiry | Xem chi tiết mục **S6/S6b/S7**. Kết luận chung ở đây: có time limit → phải turn-off/adjust/extend được, hoặc chứng minh thuộc exception. Ghi rõ căn cứ | Pass |  |
| W4 | 2.4.11 Focus Not Obscured (Min) | Tab qua Checkout khi trang đã cuộn, và khi cart drawer đang mở | Element focus không bị header sticky/drawer/summary bar cố định che khuất hoàn toàn | Pass |  |
| W5 | 2.5.8 Target Size (Min) | Đo: nút Remove item, nút đóng drawer, nút copy order number ở SePay, radio payment method, nút Back | ≥ 24×24 CSS px hoặc có spacing đủ | Pass |  |
| W6 | 2.5.7 Dragging Movements | Kiểm tra có thao tác kéo nào trong flow không (kéo để xoá item, slider số lượng, swipe-to-delete trên mobile) | Mọi thao tác kéo đều có phương án single-pointer/bàn phím tương đương | N/A | Không có thao tác Kéo/Thả nào |
| W7 | 3.2.6 Consistent Help | So sánh vị trí link Support/Contact ở Cart, Checkout, SePay QR, Success, Failed | Nếu có, luôn ở cùng vị trí tương đối. Trang Failed thường có "Contact support" — kiểm tra các trang khác có nhất quán không | Pass | Link Support các trang đều nằm dưới footer |

## G. Trải nghiệm & nội dung nghiệp vụ

| # | WCAG SC | Nội dung cần xác nhận | Kết quả | Ghi chú |
| --- | --- | --- | --- | --- |
| G1 | 2.1.1 | Add/remove course hoàn tất trọn vẹn chỉ bằng VoiceOver | Pass |  |
| G2 | 1.3.1 | Order summary đọc đúng, dễ hiểu, không gây hiểu nhầm về số tiền | Pass |  |
| G3 | 2.1.1 | Payment method chọn được hoàn toàn bằng bàn phím + VoiceOver | Pass |  |
| G4 | 2.1.1 | Cả Success **và** Failed flow hoàn tất được bằng VoiceOver trong cùng buổi test | Pass |  |
| G5 | 4.1.3 | Loading/success/error mỗi trạng thái chỉ được announce **đúng một lần** | Pass |  |
| G6 | 3.3.3 | Nội dung hướng dẫn xử lý refund/payment đúng nghiệp vụ thực tế (không chỉ đúng kỹ thuật) | Pass |  |

## H. Keyboard-only nhanh

| # | WCAG SC | Thao tác | Kỳ vọng | Kết quả | Ghi chú |
| --- | --- | --- | --- | --- | --- |
| H1 | 2.4.3 | Tab toàn bộ Cart → Checkout → SePay QR → Success/Failed | Focus order hợp lý | Pass |  |
| H2 | 2.1.1 | Arrow Left/Right đổi payment method | Hoạt động đúng, không cần Tab qua từng option | Pass |  |
| H3 | 2.4.3 | Escape đóng cart drawer | Focus quay lại đúng trigger | Pass |  |
| H4 | 2.1.2 | Tab liên tục qua các bước không phải dialog (Cart page, Checkout page, SePay page) | Không có bẫy phím tại bất kỳ vùng non-modal nào; nếu Tab vào vùng có hành vi trap riêng (ví dụ drawer/dialog) thì phải có cách thoát bằng bàn phím (đã kiểm ở A6–A8) | Pass |  |
| H5 | 2.4.7 | Quan sát focus indicator ở mọi trang trong flow | Luôn nhìn thấy rõ, kể cả trên nền card/gradient | Pass |  |

---

### Kết luận

- Tổng số bước: 70
- Pass: 66
- Fail: 0
- N/A: 4
- Issue còn mở: Không
