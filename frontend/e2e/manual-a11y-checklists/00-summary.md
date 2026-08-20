# Manual Accessibility Test Summary

Tổng hợp kết quả kiểm thử thủ công cho các hành trình quan trọng của EduMind. Đây là trang tổng quan dành cho người đọc; thao tác, kỳ vọng và kết quả của từng bước được lưu trong các checklist chi tiết.

Kết quả phản ánh **trạng thái cuối đã được kiểm tra thủ công**. Các lỗi phát hiện trong quá trình phát triển được sửa và kiểm tra lại trước khi cập nhật kết quả; mỗi bước chỉ lưu một kết quả cuối và không yêu cầu screenshot.

Hướng dẫn thiết lập môi trường và cách ghi kết quả: [README.md](README.md).

## 1. Phạm vi và môi trường

Phạm vi kiểm thử gồm Safari + VoiceOver trên macOS cho bốn critical journey và một lượt kiểm tra chéo về keyboard, zoom, reflow, contrast và motion.

| Trường | Giá trị |
| --- | --- |
| Ngày kiểm thử | Chưa điền |
| macOS | Chưa điền |
| Safari | Chưa điền |
| VoiceOver verbosity | Medium (mặc định) |
| Người kiểm thử | Chưa điền |

> Điền đầy đủ metadata trước khi dùng kết quả này trong portfolio. Kết luận chỉ áp dụng cho môi trường và phiên bản phần mềm đã ghi ở trên.

## 2. Kết quả hiện tại

| Flow | Checklist | Tổng bước | Pass | Fail | Blocked | N/A | Kết luận |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Discover | [01](01-discover-flow-safari-voiceover.md) | 53 | 49 | 0 | 0 | 4 | **Pass** |
| Authentication | [02](02-auth-flow-safari-voiceover.md) | 56 | 51 | 2 | 0 | 3 | **Fail** |
| Purchase | [03](03-purchase-flow-safari-voiceover.md) | 70 | 66 | 0 | 0 | 4 | **Pass** |
| Learning | [04](04-learning-flow-safari-voiceover.md) | 80 | 74 | 0 | 0 | 6 | **Pass** |
| Cross-cutting | [05](05-cross-cutting-zoom-reflow-motion.md) | 27 | 25 | 0 | 0 | 2 | **Pass** |
| **Tổng** | | **286** | **265** | **2** | **0** | **19** | **4/5 đạt** |

Quy tắc kết luận:

- `Pass`: mọi bước áp dụng đều `Pass`; mỗi bước `N/A` có lý do rõ ràng.
- `Fail`: còn ít nhất một bước `Fail`.
- `Incomplete`: còn bước chưa kiểm tra hoặc bị `Blocked`.

## 3. Vấn đề còn mở

Chỉ liệt kê lỗi chưa được giải quyết. Khi lỗi đã sửa và bước tương ứng được xác nhận `Pass`, có thể xóa khỏi bảng; Git history lưu lại quá trình thay đổi.

| Issue ID | Flow / bước | WCAG SC | Mô tả | Trạng thái |
| --- | --- | --- | --- | --- |
| A11Y-A13 | Authentication / E2 | 1.3.1, 3.3.3 | Link reset hết hạn hoặc không hợp lệ vẫn hiển thị form đặt mật khẩu như link hợp lệ. | Open |
| A11Y-A12 | Authentication / D5 | 4.1.2, 4.1.3 | Nút Resend thiếu cooldown và không truyền đạt đầy đủ trạng thái loading cho VoiceOver. | Open |

Trạng thái sử dụng trong bảng: `Open` · `Fixed` · `Accepted limitation`.

## 4. Known limitations

Các giới hạn dưới đây nằm ngoài phạm vi hỗ trợ hoặc kiểm thử hiện tại; chúng không được trình bày như những tính năng đã hoàn chỉnh.

| Limitation | Phạm vi ảnh hưởng |
| --- | --- |
| Caption chỉ có khi khóa học cung cấp VTT hợp lệ. | Learning — video |
| Caption mặc định `srcLang="en"`; API chưa cung cấp metadata ngôn ngữ. | Learning — video |
| Transcript phụ thuộc `articleContent`; thiếu dữ liệu sẽ hiển thị placeholder. | Learning — lesson content |
| Quiz hiện chỉ hỗ trợ một đáp án cho mỗi câu. | Learning — quiz |
| Chưa kiểm thử `forced-colors` thật trên Windows High Contrast. | Cross-cutting — visual accessibility |
| Sau khi thoát fullscreen video, VoiceOver có thể đọc thêm window title do hành vi WebKit. | Learning — video fullscreen |

## 5. Cách diễn đạt trong portfolio

Chỉ công bố kết quả sau khi đã điền đủ metadata ở mục 1 và bảng kết quả không còn `Fail` hoặc `Incomplete`.

Được phép mô tả:

- Các hành trình cụ thể đã được kiểm thử thủ công bằng Safari + VoiceOver trên macOS.
- Các bước áp dụng trong một flow đã đạt checklist nếu flow đó có kết luận `Pass`.
- Phạm vi kiểm tra bổ sung gồm keyboard-only, zoom 200%, reflow 320px, reduced motion và colour independence.

Không tuyên bố:

- “WCAG 2.2 AA certified” hoặc “fully accessible”.
- Đã kiểm thử với người dùng khuyết tật thật.
- Đã kiểm thử Windows High Contrast hoặc các screen reader ngoài phạm vi ghi nhận.
- Accessibility được bắt buộc trong CI nếu workflow chưa có quality gate tương ứng.

### English summary

Sau khi toàn bộ flow đạt và metadata đã được điền, có thể dùng đoạn giới hạn phạm vi sau trong README dự án:

```markdown
### Accessibility validation

Four critical journeys were manually verified with Safari <version> and VoiceOver on macOS <version> on <YYYY-MM-DD>, with an additional keyboard-only pass in Chrome <version>. The documented journeys passed the applicable checks for screen-reader operation, keyboard access, focus management, status announcements, 200% zoom, 320px reflow, reduced motion, and colour independence.

WCAG 2.2 Level AA is the testing target, not a claim of certification or full-site conformance. Validation is limited to the documented journeys and test environment. Windows High Contrast, the Angular admin portal, mobile screen readers, and usability testing with disabled participants are outside the current scope. Captions and transcripts depend on source data supplied for each course.
```

Khi vẫn còn lỗi như trạng thái hiện tại, dùng wording trung thực hơn:

```markdown
Manual accessibility validation is in progress. Four of five documented test areas currently pass their applicable checks; two Authentication issues remain open. Detailed results and scope limitations are recorded in the manual accessibility test summary.
```
