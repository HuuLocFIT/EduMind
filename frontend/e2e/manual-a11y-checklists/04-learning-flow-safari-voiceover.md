# Checklist Safari + VoiceOver — Flow 4: Learning

Phạm vi: `My Learning → Course Player` (curriculum, video, article, quiz, AI Tutor, progress).
Tham chiếu yêu cầu: mục 6 trong [`4-flow-a11y.md`](../../../4-flow-a11y.md).
Quy ước điền bảng, template ghi `Fail` và setup máy bắt buộc: xem [README.md](README.md).

**Trước khi bắt đầu**: đã bật `Safari → Advanced → Press Tab to highlight each item`, đã bật Full Keyboard Access, đã bật VoiceOver Caption Panel.

> **Known limitations cần nhớ khi test** (không tính là lỗi mới nếu đã ghi trong known-limitations):
> caption chỉ hiển thị khi `videoCaptionUrl` tồn tại và VTT tải được; caption/transcript metadata hiện mặc định tiếng Anh (`srcLang="en"`); transcript dùng `articleContent` làm nguồn, hiển thị placeholder rõ khi không có; quiz chỉ hỗ trợ chọn 1 đáp án (radio), chưa hỗ trợ multi-select.

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

- Khóa học đã enroll với **ít nhất 2 section**.
- 1 video lesson có caption test (VTT hợp lệ).
- 1 text/article lesson.
- 1 quiz lesson.
- 1 lesson đang bị khoá (locked).
- Ít nhất 1 lesson ở trạng thái in-progress và 1 ở completed.
- Khóa học đã có dữ liệu AI (embeddings + summary) để AI Tutor trả lời được — nếu chưa có, các bước AI Tutor ghi `Blocked`.
- 1 lesson có tài liệu đính kèm (resources) nếu tính năng tồn tại.

## Core pass (~15 phút) — dùng khi retest nhanh sau mỗi vòng fix

`A1 · A2 · A4 · A6 · B1 · B4 · B7 · B8 · C1 · C2 · C6 · D3 · D4 · D6 · T2 · T3 · T8 · W3 · W4 · H2 · H4a · H4b`

Lượt **đầy đủ** (toàn bộ bảng bên dưới) bắt buộc chạy ít nhất một lần trước khi cập nhật README dự án. Xem [00-summary.md](00-summary.md) mục 6.

## Ví dụ cách ghi (mẫu tham chiếu — không phải bước test thật)

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| VD1 | P0 | 4.1.2 | Duyệt lesson list, tới lesson đang học | Lesson hiện tại được đọc là "current step" | Pass | | VO đọc "Lesson 3, Hooks in depth, current step, completed" |
| VD2 | P0 | 4.1.3 | Đặt câu hỏi cho AI Tutor và nghe câu trả lời stream về | Câu trả lời được thông báo cho screen reader; không đọc lặp lại cả đoạn mỗi lần thêm token | Fail | | [A11Y-L08] VO đọc: "" — panel AI không có `aria-live`, câu trả lời stream về hoàn toàn im lặng<br>Focus đang ở: ô nhập câu hỏi (`textarea`)<br>Kỳ vọng: khi stream kết thúc, live region `polite` đọc câu trả lời một lần; hoặc có nút/announce "Answer ready"<br>Evidence: docs/a11y-evidence/2026-08-20/learning/ai-tutor-silent-stream.png<br>Chưa fix |
| VD3 | C | 1.2.2 | Bật caption trên video lesson không có `videoCaptionUrl` | Không claim có caption | N/A | | Đúng known limitation đã ghi trong 4-flow-a11y.md mục 6.3 — không tính Fail, nhưng phải giữ nguyên wording "limitation" trong README |

---

## A. MyLearningPage

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A0 | P0 | 2.4.2 | `VO + F2` ×2 tại My Learning | Page title mô tả đúng trang | Pass| | |
| A1 | P0 | 1.3.1 | Mở My Learning, Rotor → Headings | Có đúng một `Heading level 1` | Pass| | |
| A2 | P0 | 4.1.2, 2.1.1 | Duyệt tab list (All/Active/Completed) | Tab list có accessible label; đổi tab bằng `Left/Right Arrow` (không cần Tab) | Pass| | |
| A3 | P0 | 2.1.1 | Dùng `Home`/`End` trong tab list | Nhảy tới tab đầu/cuối đúng | Pass| | |
| A4 | P0 | 4.1.3 | Đổi tab | VoiceOver announce tên filter mới + số lượng course tương ứng | Pass| | |
| A5 | P0 | 1.3.1, 2.4.4 | Duyệt enrollment cards | Đọc như list; nút "Continue Learning" có tên chứa **tên khóa học** | Pass| | |
| A6 | P0 | 4.1.2 | Duyệt progress bar của 1 course | Có label + giá trị đọc được (vd "65% complete"), không chỉ thanh màu im lặng | Pass| | |
| A7 | P0 | 1.4.1 | So sánh course completed vs in-progress | Trạng thái phân biệt được qua text/label khi đọc, không chỉ màu | Pass| | |
| A8 | P0 | 4.1.3 | Chuyển sang tab rỗng (vd Completed khi chưa hoàn thành course nào) | Empty state đổi theo đúng tab và được announce | Pass| | |
| A9 | P0 | 2.1.1 | Kích hoạt Continue Learning bằng `Enter` | Điều hướng đúng vào Course Player của đúng khóa học | Pass| | |
| A10 | P0 | 4.1.3 | Trong lúc loading | Skeleton **không** bị VoiceOver đọc như nội dung thật; có text loading cho screen reader | Pass| | |
| A11 | P0 | 4.1.3, 3.3.3 | Giả lập API error (chặn request) | Lỗi đọc như alert; nút Retry có tên rõ và bấm được bằng bàn phím | Pass| | |
| A12 | C | 3.3.2, 4.1.3 | Nếu có search/sort trong My Learning | Có label thật; kết quả thay đổi được announce đúng một lần | N/A| | Trang này không có search/sort|

## B. CoursePlayerPage — cấu trúc & điều hướng

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| B0 | P0 | 2.4.2 | `VO + F2` ×2 trong Course Player, rồi đổi lesson và lặp lại | Page title phản ánh khóa học/bài học hiện tại và **cập nhật khi đổi lesson** | Pass| | |
| B1 | P0 | 1.3.1 | Mở Course Player, Rotor → Headings | `Heading level 1` là tên khóa học; tên lesson hiện tại ở cấp heading kế tiếp | Pass    | | |
| B2 | P0 | 1.3.1, 4.1.2 | Duyệt sidebar curriculum | Là navigation/region có label rõ (vd "Course curriculum") | Pass| | |
| B3 | P0 | 4.1.2 | Kích hoạt 1 section bằng `VO + Space` | `aria-expanded` đổi và được announce đúng trạng thái | Pass| | |
| B4 | P0 | 1.3.1, 4.1.2 | Duyệt lesson list trong section | Đọc như list; lesson hiện tại có đánh dấu "current step" khi đọc (`aria-current`) | Pass| | |
| B5 | P0 | 1.4.1 | Duyệt lesson đã completed | Có text alternative báo đã hoàn thành, không chỉ icon/màu | Pass| | |
| B6 | P0 | 1.4.1, 4.1.2 | Duyệt lesson đang khoá (locked) | Nếu không focusable — bị Rotor bỏ qua hợp lý; nếu focusable — có giải thích lý do khoá khi đọc | N/A| | Course Player chỉ truy cập được sau khi enroll; sidebar (CourseCurriculumSidebar.tsx) không có khái niệm locked lesson|
| B7 | P0 | 2.4.3, 4.1.3 | Chọn 1 lesson khác bằng `VO + Space`/Enter | Focus chuyển tới heading/nội dung lesson mới; có announce đã đổi lesson | Pass| | |
| B8 | P0 | 4.1.2, 2.4.3 | Mở sidebar trên mobile viewport | Hoạt động như drawer/dialog nếu che nội dung; `Escape` đóng được; focus quay lại nút toggle | Pass| | |
| B9 | P0 | 2.1.2 | Trong sidebar drawer đã mở ở B8 (chưa bấm Escape/đóng), Tab/Shift+Tab liên tục qua hết các item | Focus trap là **chủ đích** (không thoát ra ngoài drawer khi che nội dung) nhưng phải cycle được: tới cuối danh sách Tab quay lại đầu, Shift+Tab từ đầu quay lại cuối; nút Close/toggle luôn nằm trong vòng lặp và Tab tới được — không có điểm nào bị kẹt cứng (dead-end) mà không Tab tiếp/lùi được | Pass| | |
| B9b | P0 | 2.1.2, 4.1.2 | Cùng drawer đã mở ở B8, dùng VO cursor (swipe Left/Right) thay vì Tab để duyệt hết item | VO swipe không thoát khỏi drawer ra nội dung phía sau bị che (không leak); nếu VO cursor tới cuối, swipe tiếp không bị treo — quay lại đầu hoặc dừng ở nút Close hợp lý | Pass| | |
| B10 | P0 | 4.1.2 | Duyệt nút Exit player / toggle sidebar | Tên nút rõ ràng, không chỉ icon vô danh | Pass| | |
| B11 | P0 | 4.1.2, 2.4.3 | `[LOCAL]` Giả lập access-error (khoá học suspended/dropped) | Modal lỗi quản lý focus đúng (focus vào trong modal) và có recovery action | Pass| | |
| B12 | P0 | 2.4.4, 4.1.2 | Duyệt nút Previous/Next lesson | Tên nút nêu được sẽ đi tới đâu (không chỉ "Next"); trạng thái disabled ở lesson đầu/cuối được đọc rõ | Pass | | |
| B13 | C | 2.4.4, 4.1.2 | Nếu lesson có tài liệu đính kèm (resources) | Mỗi link nêu rõ tên tài liệu + định dạng/kích thước; tải được bằng bàn phím | Pass| | |

## C. CoursePlayerPage — video & media

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C1 | P0 | 2.1.1, 4.1.2 | Vào video lesson, dùng Tab tới video controls | Có đủ control thao tác được bằng bàn phím: play/pause, seek, volume, mute, playback speed, quality, captions, settings, fullscreen, elapsed time — mỗi control có accessible name | Pass| | |
| C2 | P0 | 1.2.2 | Bật caption (CC) trên video có caption test | Caption hiển thị đúng nội dung; track được đọc là "English captions" theo metadata hiện tại (ghi nhận limitation nếu khóa học không phải tiếng Anh) | Pass| | |
| C3 | C | 1.2.2 | Video không có `videoCaptionUrl` hoặc VTT lỗi | Không claim có caption — chấp nhận là limitation đã biết, không phải bug mới | Pass| | Test với VTT malformed (200 OK, nội dung sai): caption vẫn đọc được — browser tự bỏ qua cue lỗi, không phải case "claim sai" |
| C4 | P0 | 1.2.2, 1.3.1 | Kiểm tra transcript | Nếu có `articleContent` → hiển thị transcript đọc được; nếu không có → placeholder rõ ràng ("A transcript is not available for this video.") | Pass| | |
| C5 | P0 | 1.4.2 | Vào lesson video | Không tự động phát có âm thanh khi vào trang (no autoplay with sound) | Pass| | |
| C6 | P0 | 4.1.2 | Duyệt tới thanh seek và thanh volume bằng `VO + Command + J` | Được đọc là slider có giá trị hiện tại (vd "Seek video, 35 percent"); `Left/Right Arrow` thay đổi được giá trị | Pass| | |
| C7 | P0 | 4.1.2, 2.1.2 | Mở menu Settings (chất lượng 720p/480p, tốc độ phát) | Menu có semantics đúng, điều hướng bằng Arrow/Enter, `Escape` đóng và focus quay lại nút Settings | Pass| | |
| C8 | P0 | 2.1.2, 2.4.3 | Vào fullscreen bằng bàn phím rồi thoát bằng `Escape` | Vào/ra được hoàn toàn bằng bàn phím; sau khi thoát, focus quay lại control hợp lý, không bị mất về đầu trang | Pass| | **Known limitation (accepted)**: VO còn đọc thêm window title sau khi thoát — hành vi modal-dismissal của WebKit, xác nhận bằng minimal repro không dùng code app, không phải bug, không có API web nào chặn được. |
| C9 | P0 | 2.1.1 | Kiểm tra phím tắt của player (Space, mũi tên, F, M nếu có) | Không xung đột với phím VoiceOver; nếu có xung đột, vẫn còn cách thao tác bằng control có focus | Pass| | |

## D. CoursePlayerPage — nội dung, quiz & progress

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| D1 | P0 | 1.3.1 | Vào text/article lesson | Heading/list/code structure giữ nguyên ngữ nghĩa sau khi render Markdown/HTML | Pass| | |
| D2 | C | 1.3.1 | Nếu lesson có code block | Có ngữ cảnh/ngôn ngữ code được đọc hợp lý (không đọc như văn bản thường vô nghĩa) | Pass| | |
| D3 | P0 | 4.1.2 | Kích hoạt "Mark complete" | Có trạng thái loading/disabled; tên nút ổn định trong lúc xử lý | Pass| | |
| D4 | P0 | 4.1.3 | Sau khi complete | Có announce hoàn thành + progress mới; **không** double-submit khi bấm thêm lần nữa hoặc Enter lặp | Pass| | |
| D5 | P0 | 4.1.3, 2.2.1 | Nếu có auto-advance sang lesson kế | Có báo trước bằng text/announce (không tự chuyển đột ngột); **huỷ được bằng bàn phím**; đếm ngược không bị đọc lặp mỗi giây | Pass| | |
| D6 | P0 | 1.3.1, 4.1.2 | Vào quiz lesson | Câu hỏi dùng fieldset/legend; đáp án dùng radio; chọn được bằng Arrow keys; chỉ chọn được 1 đáp án/câu (giới hạn hiện tại) | Pass| | |
| D7 | P0 | 4.1.3, 3.3.1 | Nộp quiz | Kết quả được announce rõ (đúng/sai, điểm số); nếu chưa trả lời hết thì lỗi được đọc và focus tới câu còn thiếu | Pass| | |
| D8 | P0 | 4.1.3, 3.3.3 | Giả lập lỗi **lưu progress video** (chặn request autosave) | Lỗi hiển thị không chỉ dạng toast thoáng qua — có state/retry mà VoiceOver tiếp cận được, nêu rõ đang retry cho bài nào | Pass| | |
| D9 | P0 | 4.1.3, 3.3.3 | Giả lập lỗi **reconcile sau khi complete** (chặn request enrollment/progress) | Đây là recovery path khác D8 — thông báo và action retry phải phân biệt được, không lẫn với lỗi lưu progress | Pass| | |
| D10 | P0 | 4.1.2, 2.4.3 | Hoàn thành lesson cuối → dialog hoàn thành khóa học | Dialog có accessible name, focus vào trong khi mở, `Escape` đóng được, focus quay lại nội dung hợp lý; next action đọc rõ | Pass| | |

## E. AI Tutor overlay (trong Course Player)

> Streaming SSE là rủi ro a11y cao nhất của flow này: nội dung đến từng token, rất dễ khiến live region đọc lặp cả câu, hoặc ngược lại hoàn toàn im lặng.

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T1 | P0 | 4.1.2 | Duyệt tới nút pill "AI Tutor" bằng `VO + Right Arrow` | Có accessible name rõ; trạng thái đóng/mở được đọc (`aria-expanded`) | Pass| | |
| T2 | P0 | 4.1.2, 2.4.3 | Mở panel bằng `VO + Space` | Panel là dialog có tên; focus chuyển vào trong panel ngay khi mở | Pass| | |
| T3 | P0 | 2.4.3 | Nhấn `Escape` khi panel mở | Panel đóng; focus quay lại đúng nút pill đã mở nó | Pass| | |
| T4 | P0 | 2.1.2 | Trong panel, Tab và `VO + Right Arrow` liên tục | Không thoát ra nội dung nền khi panel là modal; không keyboard trap không thoát được | Pass| | |
| T5 | P0 | 4.1.2 | Trên mobile viewport, duyệt qua vùng backdrop phía sau panel | Backdrop (nút đóng phủ toàn màn hình) không tạo item lạ gây nhầm lẫn khi duyệt bằng VO cursor | Pass| | |
| T6 | P0 | 3.3.2, 4.1.2 | Duyệt tới ô nhập câu hỏi | Có label thật (không chỉ placeholder); nút Send có accessible name | Pass| | |
| T7 | P0 | 4.1.3 | Gửi câu hỏi, nghe lúc đang chờ | Trạng thái "đang trả lời" được announce (loading/`aria-busy`), không im lặng | Pass| | |
| T8 | P0 | 4.1.3 | Nghe trong lúc câu trả lời **stream về từng token** | Câu trả lời **không** bị đọc lặp lại toàn bộ mỗi lần thêm token; ưu tiên announce một lần khi stream xong | Pass| | |
| T9 | P0 | 4.1.3 | Sau khi stream kết thúc | Người dùng biết câu trả lời đã hoàn tất và đọc lại được toàn bộ bằng `VO + Right Arrow` | Pass| | |
| T10 | P0 | 2.4.4 | Duyệt tới citation link tới lesson nguồn | Tên link nêu rõ lesson được trích dẫn, không chỉ "[1]" hay "Source" | N/A | | Sources hiện là `<span>` badge (AiChatPanel.tsx), không có `href`/role, không phải link theo chủ đích thiết kế — chưa có tính năng nhảy tới lesson nguồn. Không tính SC 2.4.4 (không áp dụng khi không phải link). Nếu sau này làm citation thành link/button điều hướng được, phải test lại theo tiêu chí này.|
| T11 | P0 | 1.3.1 | Duyệt lịch sử hội thoại | Phân biệt được câu hỏi của mình và câu trả lời của AI khi nghe (không lẫn thành một khối) | Pass | | |
| T12 | C | 4.1.2, 4.1.3 | Nếu có nút Stop/Cancel khi đang stream | Bấm được bằng bàn phím; huỷ xong có announce | N/A| | Không có support các nút stop/cancel|
| T13 | P0 | 4.1.3, 3.3.3 | Giả lập lỗi AI (chặn request SSE) | Lỗi đọc được như alert, có action retry tiếp cận được | Pass| | |

## F. WCAG 2.2 — tiêu chí mới (bắt buộc cho target 2.2 AA)

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| W1 | P0 | 2.5.7 Dragging Movements | Thanh **seek** và thanh **volume** của video player | Điều chỉnh được hoàn toàn bằng `Left/Right Arrow` khi có focus — không bắt buộc kéo chuột. Ghi rõ control dùng `<input type="range">` native hay custom | Pass| | |
| W2 | C | 2.5.7 | Nếu quiz/curriculum có thao tác kéo-thả (sắp xếp, kéo để đánh dấu) | Có phương án single-pointer/bàn phím tương đương | N/A| | Không có tính năng kéo-thả nào|
| W3 | P0 | 2.5.8 Target Size (Min) | Đo các nút trong video controls (play, mute, CC, settings, fullscreen), nút pill AI Tutor, nút toggle sidebar, checkbox/radio quiz | ≥ 24×24 CSS px hoặc spacing đủ.| Pass| | Các nút đều đạt chuẩn|
| W4 | P0 | 2.4.11 Focus Not Obscured (Min) | Tab qua Course Player khi đã cuộn xuống, và khi nút pill AI Tutor đang hiển thị (`position: fixed` góc dưới phải) | Element đang focus không bị nút pill, header player, hay control bar che khuất hoàn toàn — đặc biệt các control ở góc dưới phải nội dung | Pass| | |
| W5 | P0 | 2.4.11 | Mở AI Tutor panel rồi Tab qua nội dung lesson phía sau (nếu không phải modal) | Không có element nào nhận focus mà bị panel che hoàn toàn | Pass| | Vì AI Tutor là dạng dialog nên mặc định dùng focus trap rồi|
| W6 | P0 | 3.3.7 Redundant Entry | Làm quiz → rời lesson → quay lại | Không bắt nhập lại đáp án đã chọn trong cùng một lượt làm (hoặc nêu rõ là bắt đầu lượt mới) | Pass| | |
| W7 | P0 | 3.2.6 Consistent Help | So sánh vị trí lối vào trợ giúp (AI Tutor pill, link support) giữa My Learning và Course Player | Nếu có, ở cùng vị trí tương đối trên các trang trong flow | Pass| | |
| W8 | P0 | 2.2.1 Timing Adjustable | Auto-advance countdown và quiz timer (nếu có) | Có cách tắt/hoãn/kéo dài; không tự chuyển bài khi người dùng chưa kịp nghe hết | Pass| | Ở auto-advance countdown thì có support tắt auto chuyển bài, còn ở quiz thì không có timer (làm bao lâu cũng được)|
| W9 | C | 1.4.13 Content on Hover or Focus | Tooltip trên video controls / badge trạng thái lesson | Dismissible bằng `Escape`, hoverable, persistent | N/A | | Video controls (`VideoPlayer.tsx`) và lesson status badge (`CourseCurriculumSidebar.tsx`) không có tooltip nào hiện lên khi hover/focus — trạng thái chỉ được truyền đạt qua `aria-label`/`sr-only` text, không phải nội dung phụ trội xuất hiện khi hover/focus. Không có Tooltip component nào tồn tại trong codebase (đã grep toàn bộ `apps/user` và `libs/user`). Vì không có "content on hover or focus" nên SC 1.4.13 không áp dụng. Nếu sau này thêm tooltip thật (vd. hiển thị % progress khi hover badge), phải test lại theo tiêu chí này.|

## G. Trải nghiệm tổng thể

| # | Mức | WCAG SC | Nội dung cần xác nhận | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- |
| G1 | P0 | 2.1.1 | Duyệt danh sách enrolled courses hoàn toàn bằng VoiceOver, không nhìn màn hình | Pass| | |
| G2 | P0 | 1.4.1 | Đổi tab, vào Course Player, xác định đúng lesson current/completed/locked chỉ qua nghe | Pass| | |
| G3 | P0 | 2.1.1 | Chuyển giữa ít nhất 2 lesson, điều khiển video, bật caption — tất cả bằng VoiceOver | Pass| | |
| G4 | P0 | 4.1.3 | Mark complete và nghe được progress update mới, không cần nhìn thanh progress | Pass| | |
| G5 | P0 | 4.1.3 | Không có announcement nào (đổi lesson, complete, progress, error, AI) bị đọc lặp 2 lần | Pass| | |
| G6 | P0 | 4.1.3 | Đổi lesson nhanh liên tiếp: announcement của lesson cũ không đọc chồng lên lesson mới | Pass| | |

## H. Keyboard-only nhanh

| # | Mức | WCAG SC | Thao tác | Kỳ vọng | R1 | R2 | Ghi chú / Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| H1 | P0 | 2.4.3, 2.4.7 | Tab qua toàn bộ My Learning + Course Player | Focus order hợp lý, luôn thấy rõ focus indicator | Pass| | |
| H2 | P0 | 2.1.1 | Điều khiển video 100% bằng bàn phím (không chuột) | Play/pause/seek/volume/speed/quality/caption/fullscreen đều dùng được | Pass| | |
| H3 | P0 | 2.1.1 | Arrow/Home/End trong tab list và curriculum | Hoạt động đúng WAI-ARIA pattern | Pass| | |
| H4a | P0 | 2.1.2 | Tab liên tục trong quiz (không phải dialog/drawer -> quiz là một lesson riêng thì đúng, còn quiz trong một lesson content type không phải QUIZ thì nó là dialog) | Không có keyboard trap — Tab/Shift+Tab ra khỏi vùng quiz bình thường, không bị kẹt | Pass| | |
| H4b | P0 | 2.1.2 | Tab liên tục ở sidebar mobile, modal lỗi, AI Tutor panel (đều là dialog/drawer — trap là chủ đích, đã test chi tiết ở B9/T4/C7/D10) | Trap cycle đúng (không dead-end), Escape/nút Close vẫn thoát được — đây là **smoke check nhanh**, không phải re-test lại B9/T4/C7/D10 | Pass| | |
| H5 | P0 | 2.1.1 | Hoàn tất My Learning → Course Player → đổi lesson → Mark Complete chỉ bằng bàn phím | Toàn bộ journey hoàn tất không cần chuột | Pass| | |

---

### Kết luận

- Tổng số bước `P0` bị `Fail` (sau R2): ___
- Tổng số bước `Blocked` mức `P0`: ___
- Số bước ghi `N/A` (kèm lý do đã ghi trong bảng): ___
- Flow 4 đủ điều kiện đóng theo `4-flow-a11y.md`? **Có / Chưa** — lý do: ___
- Danh sách Issue ID phát sinh: ___
- Known limitations đã xác nhận lại (caption/transcript/quiz single-answer): ___
