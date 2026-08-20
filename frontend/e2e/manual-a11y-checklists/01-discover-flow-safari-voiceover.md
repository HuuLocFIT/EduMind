# Checklist Safari + VoiceOver — Flow 1: Discover

Phạm vi: `Home → Browse Courses → Course Detail → Add to Cart`.
Tham chiếu yêu cầu: mục 3 trong [`4-flow-a11y.md`](../../../4-flow-a11y.md).
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

## Core pass (~15 phút) — dùng khi retest nhanh sau mỗi vòng fix

`A0 · A1 · A2 · A3 · A4 · A5 · A6 · B1 · B2 · B5 · B7 · B9 · C1 · C5 · C8 · W1 · W4 · F1 · F2 · F4a · F4b · F5`

Lượt **đầy đủ** (toàn bộ bảng bên dưới) bắt buộc chạy ít nhất một lần trước khi cập nhật README dự án. Xem [00-summary.md](00-summary.md) mục 6.

## Ví dụ cách ghi (mẫu tham chiếu — không phải bước test thật)

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| VD1 | P0 | 2.4.1 | Tab từ đầu trang Home | Item đầu tiên nhận focus là **Skip to main content** | Pass | | VO đọc "Skip to main content, link" |
| VD2 | P0 | 1.1.1 | `VO + Right Arrow` qua ảnh thumbnail course card | Ảnh có `alt` mô tả mục đích, ảnh trang trí bị bỏ qua | Fail | Pass | [A11Y-D07] VO đọc: "image, course-thumb-482.webp"<br>Focus đang ở: `<img>` trong CourseCard<br>Kỳ vọng: đọc "Advanced React Patterns course thumbnail" hoặc bị bỏ qua nếu là trang trí<br>Evidence: docs/a11y-evidence/2026-08-20/discover/card-alt-filename.png<br>Fixed commit `abc1234`, retest 2026-08-22 → Pass |
| VD3 | C | 4.1.2 | Mở video preview modal ở Course Detail | Modal có tên, focus vào trong, Escape đóng được | N/A | | Course Detail hiện không có video preview modal — tính năng chưa tồn tại, không tính Fail |

---

## A. HomePage

| # | Mức | WCAG SC | Thao tác | Kỳ vọng (VoiceOver / focus) | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A0 | P0 | 2.4.2 | `VO + F2` nhấn 2 lần tại Home | Page title mô tả đúng trang (không phải "React App" hay title trùng với route khác) | Pass| | |
| A1 | P0 | 1.3.1 | Mở Home, bật `VO + U` → chọn **Landmarks** | Thấy đủ `banner`/`header`, `navigation`, `main`, `contentinfo`/`footer` | Pass| | |
| A2 | P0 | 1.3.1, 2.4.6 | Mở Rotor → chọn **Headings** | Chỉ có một `Heading level 1`; các heading con theo đúng thứ tự phân cấp (không nhảy cấp) | Pass| | |
| A3 | P0 | 2.4.1 | Tab từ đầu trang | Item đầu tiên nhận focus là **Skip to main content** | Pass| | |
| A4 | P0 | 2.4.1 | Kích hoạt skip link bằng `Enter` | Focus/VO cursor nhảy tới `main`, không phải quay lại đầu trang | Pass| | |
| A5 | P0 | 2.4.4, 4.1.2 | Dùng `VO + Right Arrow` duyệt qua một course card trong danh sách nổi bật | VoiceOver đọc **tên khóa học rõ nghĩa** (không chỉ "View course"), rating chỉ đọc **một** accessible description (không lặp từng ngôi sao), giá đọc tự nhiên | Pass| | |
| A6 | P0 | 1.1.1 | Duyệt qua ảnh course card/instructor | Ảnh mang thông tin có `alt` mô tả mục đích; ảnh trang trí **không** được đọc (VoiceOver bỏ qua) | Pass| | |
| A7 | P0 | 4.1.3, 3.3.1 | Giả lập API error (chặn request trong Network) hoặc quan sát empty state | State lỗi đọc được như alert; nút Retry có tên rõ ràng khi duyệt tới | Pass| | |
| A8 | P0 | 4.1.3 | Reload trang, ngay khi đang loading dùng `VO + Right Arrow` | Có text loading dành riêng cho screen reader (không phải im lặng chờ); skeleton không bị đọc như nội dung thật | Pass| | |
| A9 | P0 | 1.3.2, 2.1.2 | Mở mobile viewport (Responsive Design Mode), duyệt menu mobile | Thứ tự đọc menu hợp lý, không kẹt trong menu | Pass| | |
| A10 | C | 2.2.2 | Nếu hero/banner có carousel hoặc animation tự chạy > 5 giây | Có cách pause/stop/hide; animation không tự lặp vô hạn khi không tương tác | N/A| | Không có animation|

## B. BrowseCoursesPage

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| B0 | P0 | 2.4.2 | `VO + F2` ×2 tại `/courses` | Page title khác Home và mô tả đúng trang Browse | Pass| | |
| B1 | P0 | 3.3.2, 4.1.2 | Vào ô Search bằng `VO + Command + J` | VoiceOver đọc được **label** thật của ô search, không chỉ placeholder | Pass| | |
| B2 | P0 | 4.1.3 | Gõ từ khóa có kết quả, chờ debounce xong | Số lượng kết quả mới được announce **đúng một lần** (không đọc theo từng ký tự gõ) | Pass| | |
| B3 | P0 | 1.3.1, 3.3.3 | Gõ từ khóa không có kết quả | Focus tự động vào heading “No courses found”. Dùng VO + →, VoiceOver lần lượt đọc hướng dẫn và nút “Clear All Filters”. | Pass | | |
| B4 | P0 | 1.3.1 | Duyệt tới nhóm filter (category/level/price/rating) | Mỗi nhóm có tên nhóm rõ ràng (fieldset/legend hoặc group label) khi vào bằng VO | Pass| | |
| B5 | P0 | 4.1.2, 4.1.3 | Chọn 1 filter bằng `VO + Space` | Trạng thái checked được đọc; kết quả cập nhật và announce số lượng mới | Pass  | | |
| B6 | P0 | 2.4.4, 4.1.2 | Duyệt tới nút xoá 1 active filter | Tên nút chứa **tên filter cụ thể** (vd "Remove filter: Beginner"), không chỉ "Remove" | Pass| | |
| B7 | P0 | 4.1.2, 2.4.3 | Mở mobile filter drawer | Drawer được đọc như dialog có tên; `Escape` đóng được; focus quay lại đúng nút mở drawer | Pass| | |
| B8 | P0 | 2.1.2 | Trong drawer, thử `VO + Right Arrow` liên tục ra khỏi drawer | Focus **không thoát ra nền trang** khi drawer đang mở | Pass| | |
| B9 | P0 | 4.1.2, 2.4.3 | Chuyển trang bằng Pagination | Trang hiện tại đọc là "current page"; sau khi đổi trang, VO cursor/focus chuyển tới heading hoặc danh sách kết quả, **không** bị đẩy về đầu document | Pass| | |
| B10 | P0 | 3.2.2 | Chọn filter/đổi sort bằng bàn phím | Thay đổi không tự động chuyển ngữ cảnh bất ngờ (không tự submit/điều hướng ngoài dự đoán của người dùng) | Pass| | |

## C. CourseDetailPage

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C0 | P0 | 2.4.2 | `VO + F2` ×2 tại trang course detail | Page title chứa tên khóa học, khác các route trước | Pass| | |
| C1 | P0 | 1.3.1 | Mở 1 course detail, duyệt Rotor → Headings | Tên khóa học là `Heading level 1`; metadata (giá, rating...) không giả làm heading | Pass| | |
| C2 | P0 | 2.4.4 | Duyệt breadcrumb/back link | Text rõ nghĩa khi đọc độc lập, không phải "Click here" | Pass| | |
| C3 | P0 | 1.3.1 | Duyệt phần giá/discount | Đọc thành 1 câu dễ hiểu (vd "Original price \$X, now \$Y"), không đọc giá cũ/mới lẫn lộn không ngữ cảnh | Pass | | |
| C4 | P0 | 1.1.1, 4.1.2 | Duyệt tới rating stars | Chỉ có **một** giá trị accessible (vd "4.5 out of 5 stars"), không đọc từng icon sao | Pass | | |
| C5 | P0 | 4.1.2 | Vào curriculum, kích hoạt 1 section bằng `VO + Space` | Trạng thái expanded/collapsed được announce; `VO + Space` lần 2 thu gọn lại đúng | Pass| | |
| C6 | C | 4.1.2 | Dùng nút "Expand all / Collapse all" nếu có | Tên nút cập nhật theo trạng thái hiện tại | Pass| | |
| C7 | P0 | 1.4.1, 1.1.1 | Duyệt tới 1 lesson bị khoá (locked) | Trạng thái "locked" có text alternative khi đọc, không chỉ icon khoá im lặng | Pass| | |
| C8 | P0 | 4.1.3, 4.1.2 | Kích hoạt **Add to Cart** | Sau khi thêm: có announce thành công; nếu cart drawer tự mở, nó được xử lý như dialog (có tên, focus vào trong, `Escape` đóng được) | Pass| | |
| C9 | P0 | 4.1.2 | Với course chưa đăng nhập / đã enrolled | CTA đổi đúng theo trạng thái (Add to cart / Continue learning) và tên nút phản ánh đúng trạng thái đó | Pass| | |
| C10 | P0 | 1.3.1, 2.4.4 | Thử route course không tồn tại (404) | Có `Heading level 1` cho not-found, và link quay lại Browse có tên rõ | Pass| | |
| C11 | P0 | 1.3.1 | Duyệt danh sách review | Có heading khu vực review; thứ tự đọc từng review hợp lý (tên người, rating, nội dung) | Pass| | |
| C12 | C | 4.1.2, 2.1.2 | Nếu có video preview/trailer modal | Modal có accessible name, focus vào trong khi mở, `Escape` đóng, focus quay lại nút trigger; video không autoplay có âm thanh | N/A| | Chưa có tính năng xem video preview|

## D. WCAG 2.2 — tiêu chí mới (bắt buộc cho target 2.2 AA)

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| W1 | P0 | 2.4.11 Focus Not Obscured (Min) | Tab chậm từ đầu tới cuối Home và Browse trong khi trang **đã cuộn xuống giữa** | Element đang focus **không bị header sticky che khuất hoàn toàn**; luôn nhìn thấy được ít nhất một phần | Pass| | |
| W2 | P0 | 2.4.11 | Tab qua các control phía dưới màn hình khi có nút/banner nổi (floating CTA, cookie banner nếu có) | Không có element nào nhận focus mà bị phần tử nổi che hoàn toàn |  N/A| | Tại các pages này chưa có elements nào|
| W3 | P0 | 2.4.11 | Mở mobile filter drawer rồi Tab | Item nhận focus trong drawer không bị chính overlay/drawer che | Pass| | |
| W4 | P0 | 2.5.8 Target Size (Min) | Đo các target nhỏ: nút pagination, nút xoá active filter, icon giỏ hàng, nút đóng drawer, sao rating nếu bấm được | Vùng bấm **tối thiểu 24×24 CSS px** (hoặc có khoảng cách đủ để không chồng lấn). Dùng DevTools inspect để đo, ghi số đo vào Ghi chú | Pass| | Thỏa tối thiếu button nhỏ nhất 24x24px|
| W5 | P0 | 2.5.7 Dragging Movements | Nếu có filter dạng price range slider | Điều chỉnh được **hoàn toàn bằng bàn phím** (Arrow keys), không bắt buộc phải kéo chuột | Pass| | |
| W6 | P0 | 3.2.6 Consistent Help | So sánh vị trí link Help/Support/Contact ở Home, Browse, Course Detail | Nếu có, xuất hiện ở **cùng vị trí tương đối** trên mọi trang trong flow (vd luôn trong footer) | Pass| | |
| W7 | C | 1.4.13 Content on Hover or Focus | Nếu có tooltip (vd icon thông tin giá, badge level) | Tooltip: dismissible bằng `Escape` mà không mất focus, hoverable (rê chuột vào tooltip không làm nó biến mất), persistent (không tự ẩn sau vài giây) | N/A| | Tại các pages này không có sử dụng tooltip|

## E. Kiểm tra nội dung & trải nghiệm (không chỉ kỹ thuật)

| # | Mức | WCAG SC | Nội dung cần xác nhận | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- |
| E1 | P0 | 2.4.4 | Toàn bộ link/button trong flow đọc dễ hiểu khi đứng độc lập (không phụ thuộc ngữ cảnh nhìn thấy) | Pass| | |
| E2 | P0 | 4.1.3 | Không có thông báo (toast/alert/live region) bị VoiceOver đọc **hai lần** | Pass| | |
| E3 | P0 | 2.4.2, 3.2.3 | Chuyển route (Home → Browse → Detail) không làm mất ngữ cảnh — VoiceOver luôn biết đang ở trang nào | Pass| | |
| E4 | P0 | 1.1.1 | Alt text ảnh khóa học/giảng viên mô tả đúng mục đích, không mô tả sai nội dung | Pass | | `CourseCard.tsx:61` dùng `alt=""` cho thumbnail — cố ý, không phải thiếu sót: title đã đọc ngay sau qua `<a>` link, gán alt mô tả sẽ đọc trùng tên khóa học 2 lần (vi phạm E2). Các nơi khác đều dùng alt mô tả đầy đủ. Tồn đọng: quyết định này chưa có comment giải thích trong code (git blame: `eb1c60a`) — nên bổ sung |
| E5 | P0 | 3.2.3 | Header/nav giữ nguyên thứ tự và cách gọi tên giữa 3 trang trong flow | Pass| | |

## F. Keyboard-only nhanh (không dùng chuột)

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F1 | P0 | 2.4.3 | Tab toàn bộ trang Home → Browse → Detail | Focus order hợp lý theo thứ tự thị giác, không nhảy lộn xộn | Pass| | |
| F2 | P0 | 2.4.7 | Focus indicator | Luôn nhìn thấy rõ trên mọi nền (kể cả ảnh/gradient) | Pass| | |
| F3 | P0 | 2.4.3 | Tab qua toàn trang, quan sát các điểm dừng | Không có phần tử ẩn/disabled nào nhận được Tab focus | Pass| | |
| F4a | P0 | 2.1.2 | Mở curriculum accordion (không phải dialog) rồi Tab liên tục | Không có keyboard trap; Tab di chuyển tự do ra/vào các section, không bị kẹt | Pass| | |
| F4b | P0 | 2.1.2 | Mở mobile filter drawer (là dialog) rồi Tab liên tục | Tab **được phép** cycle bên trong drawer (đây là hành vi đúng của modal, không tính là trap) — nhưng phải thoát ra được bằng `Escape` hoặc nút Close reachable bằng Tab; Tab **không được lọt ra nền trang phía sau** khi drawer đang mở (khớp với B8) | Pass| | |
| F5 | P0 | 2.1.1 | Hoàn tất Home → Browse → Detail → Add to Cart chỉ bằng bàn phím | Mọi chức năng chính thao tác được, không cần chuột | Pass| | |

---

### Kết luận

- Tổng số bước `P0` bị `Fail` (sau R2): ___
- Tổng số bước `Blocked` mức `P0`: ___
- Số bước ghi `N/A` (kèm lý do đã ghi trong bảng): ___
- Flow 1 đủ điều kiện đóng theo `4-flow-a11y.md`? **Có / Chưa** — lý do: ___
- Danh sách Issue ID phát sinh: ___
