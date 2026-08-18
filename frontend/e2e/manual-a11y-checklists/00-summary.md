# Manual Accessibility Test — Summary & Evidence Index

File tổng hợp kết quả của toàn bộ bộ checklist Safari + VoiceOver.
**Đây là file duy nhất mà README dự án nên trỏ tới** — 5 file checklist còn lại là hồ sơ chi tiết đằng sau nó.

Cách điền từng bảng, template ghi `Fail`, setup máy: xem [README.md](README.md).

---

## 1. Môi trường test

| Trường | Giá trị |
| --- | --- |
| macOS version | |
| Safari version | |
| Chrome version (dùng cho checklist 05 mục G) | |
| VoiceOver verbosity | Medium (mặc định) — ghi rõ nếu đã đổi |
| Safari "Press Tab to highlight each item" | Bật / Chưa bật |
| macOS Full Keyboard Access | Bật / Chưa bật |
| Người test | |
| Vòng test | R1: ngày ___ · R2 (retest sau fix): ngày ___ |
| Commit/tag của bản được test | |

## 2. Kết quả theo flow

| # | Flow | File | Bước P0 | Pass | Fail | Blocked | N/A | Kết luận |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Discover | [01](01-discover-flow-safari-voiceover.md) | 50 | | | | | |
| 2 | Authentication | [02](02-auth-flow-safari-voiceover.md) | 54 | | | | | |
| 3 | Purchase | [03](03-purchase-flow-safari-voiceover.md) | 68 | | | | | |
| 4 | Learning | [04](04-learning-flow-safari-voiceover.md) | 74 | | | | | |
| 5 | Cross-cutting (zoom/reflow/motion) | [05](05-cross-cutting-zoom-reflow-motion.md) | 31 | | | | | |
| | **Tổng** | | **277** | | | | | |

Kết luận mỗi flow chỉ được ghi `Pass` khi **mọi bước `P0` = Pass** và không còn `Blocked` mức `P0`.
Bước `C` (conditional) được ghi `N/A` kèm lý do thì không ảnh hưởng kết luận.

## 3. Issue log

Mỗi bước `Fail` sinh ra một dòng ở đây. Issue ID dùng chung với [BASELINE_ACCESSIBILITY_AUDIT.md](../BASELINE_ACCESSIBILITY_AUDIT.md).

Quy ước ID: `A11Y-<D|A|P|L|X><số>` — D = Discover, A = Auth, P = Purchase, L = Learning, X = Cross-cutting.

| Issue ID | Flow | Bước | WCAG SC | Mô tả ngắn | Root cause | Component/file sửa | Commit | Retest | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A11Y-P20 | 3 — Purchase | S2 | 1.1.1 | Trang SePay QR không có text thay thế cho số tài khoản/nội dung chuyển khoản → screen reader không hoàn tất được thanh toán (**fail chức năng**) | Thông tin chuyển khoản chỉ tồn tại trong URL ảnh QR (`qr.sepay.vn/img?...`), backend không trả ra field nào; ảnh QR `aria-hidden` | `SepayGateway.java`, `GatewayPaymentResult.java`, `CheckoutResultResponse.java`, `CheckoutServiceImpl.java`, `checkout.schemas.ts`, `CheckoutPage.tsx`, `SepayQrPage.tsx` | (chưa commit) | | Fixed |
| A11Y-P21 | 3 — Purchase | S4 | 4.1.2, 4.1.3 | Nút Copy order number chỉ có `title`; sau khi copy VoiceOver im lặng (chỉ đổi icon `aria-hidden`) | Không có `aria-label`, không có live region cho trạng thái `copied` | `SepayQrPage.tsx` | (chưa commit) | | Fixed |
| A11Y-P22 | 3 — Purchase | S5 | 4.1.3 | Dòng "Waiting for payment confirmation..." không nằm trong live region | Thiếu `role="status"`/`aria-live` trên container của status polling | `SepayQrPage.tsx` | (chưa commit) | | Fixed |
| A11Y-P23 | 3 — Purchase | S6 | 2.2.1 | Cảnh báo sắp hết hạn QR chỉ bằng đổi màu chữ (visual-only) | `timeRemaining < 60` chỉ đổi class màu, không có text/live region | `SepayQrPage.tsx` | (chưa commit) | | Fixed |
| A11Y-P24 | 3 — Purchase | W5 | 2.5.8 | Radio payment method chỉ 20×20 px; nút "← Continue Shopping" ở Cart (mobile-only) chỉ 139.7×20 px | Radio dùng `h-5 w-5`; nút back mobile là text thuần, không có padding/min-height nên cao đúng bằng line-height 20px | `CheckoutPage.tsx`, `CartPage.tsx` | (chưa commit) | | Fixed |
| A11Y-P25 | 3 — Purchase | W7 | 3.2.6 | Link "Contact Support" chỉ tồn tại ở trang Failed, không nhất quán xuyên suốt flow Purchase | `CheckoutFailedPage.tsx` có `<a href="mailto:...">`; Cart/Checkout/SePay QR/Success không có link nào | `CartPage.tsx`, `CheckoutPage.tsx`, `SepayQrPage.tsx`, `CheckoutSuccessPage.tsx`, `CheckoutFailedPage.tsx` | (chưa commit) | | Fixed |
| A11Y-P26 | 3 — Purchase | G5 | 4.1.3 | Loading/pending/error/success bị announce **trùng lặp** (2 lần) ở Checkout và Checkout Success | Heading vừa nằm trong `role="alert"`/`role="status"` (announce khi mount) vừa bị `.focus()` bằng JS (announce lại khi nhận focus) | `CheckoutPage.tsx` (dòng 322-343, 462-468), `CheckoutSuccessPage.tsx` (dòng 148-165 `pending`, 174-208 `error`, 226-235 `success`) | (chưa commit) | | Open |
| A11Y-P27 | 3 — Purchase | G6 | 3.3.3 | Nội dung hướng dẫn refund ở trang Failed không khớp nghiệp vụ thực tế cho case `ENROLLMENT_FAILED_MANUAL_REFUND` | Câu "your payment provider will return the funds" / "refund request is awaiting manual review" ngụ ý có gateway tự động hoàn tiền và có `RefundRequest` đang review, nhưng thực tế backend chỉ set `Order.status = FAILED` (không tạo `RefundRequest`) và hoàn tiền luôn là admin chuyển khoản thủ công | `CheckoutFailedPage.tsx` (dòng 125-127), đối chiếu `CheckoutServiceImpl.java:1549-1588`, `SepayGateway.java:479-496` | (chưa commit) | | Open |

Giá trị `Status`: `Open` · `Fixed` · `Retested-Pass` · `Won't fix (documented limitation)`.

## 4. Known limitations đã xác nhận lại trong kỳ test này

Những giới hạn đã ghi trong [`4-flow-a11y.md`](../../../4-flow-a11y.md) mục 6.3 — xác nhận vẫn còn đúng, **không** được diễn đạt thành tính năng đã hỗ trợ.

| # | Limitation | Vẫn đúng? | Ghi chú |
| --- | --- | --- | --- |
| 1 | Caption chỉ hiển thị khi `videoCaptionUrl` tồn tại và VTT tải được | | |
| 2 | Caption metadata mặc định `srcLang="en"`, chưa có language metadata từ API | | |
| 3 | Transcript dùng `articleContent`; không có dữ liệu → hiển thị placeholder | | |
| 4 | Quiz chỉ hỗ trợ 1 đáp án/câu (radio), chưa hỗ trợ multi-select | | |
| 5 | `forced-colors` mode chưa test được trên macOS/Safari (cần Windows) | | |
| 6 | | | |

## 5. Evidence index

Thư mục gốc: `docs/a11y-evidence/<YYYY-MM-DD>/`

| Issue ID | File evidence | Loại | Đã redact? |
| --- | --- | --- | --- |
| | | Screenshot có Caption Panel / DevTools measurement / Recording | |

Nhắc lại trước khi commit: redact email, số điện thoại, order/transaction ID thật, token trên URL, tên và avatar người dùng thật.

## 6. Core pass (~15 phút/flow)

Dùng khi cần **retest nhanh sau mỗi vòng fix**. Không thay thế lượt chạy đầy đủ — lượt đầy đủ bắt buộc chạy ít nhất một lần trước khi cập nhật README dự án.

| Flow | Bước thuộc Core pass |
| --- | --- |
| 1 — Discover | A0, A1, A2, A3, A4, A5, A6, B1, B2, B5, B7, B9, C1, C5, C8, W1, W4, F1, F2, F4, F5 |
| 2 — Auth | A3, A4, B1, B2, B3, B4, B6, B7, B12, C2, C3, C5, D3, E1, E3, W1, W2, W6, H1, H2 |
| 3 — Purchase | A1, A3, A4, A6, A7, B1, B4, B5, B7, B10, S1, S2, S5, S7, D2, E1, E8, W4, W5, H1, H3 |
| 4 — Learning | A1, A2, A4, A6, B1, B4, B7, B8, C1, C2, C6, D3, D4, D6, T2, T3, T8, W3, W4, H2, H4 |
| 5 — Cross-cutting | A1, B1, B4, C1, D3, D4, E1, F1 |

## 7. Quy tắc dùng từ khi cập nhật README dự án

Chỉ được nâng cấp wording khi có bằng chứng tương ứng trong file này.

| Được phép viết | Điều kiện |
| --- | --- |
| "Four critical journeys were manually tested with Safari + VoiceOver on macOS on `<ngày>`" | Mục 2 đã điền đủ, có ngày và version |
| "All P0 checklist steps pass for `<flow>`" | Flow đó có kết luận `Pass` ở mục 2 |
| "N issues were found and remediated" | Mục 3 có đủ N dòng với commit và `Retested-Pass` |

| **Không** được viết | Vì sao |
| --- | --- |
| "WCAG 2.2 AA certified" / "fully accessible" | Không có bên thứ ba audit; phạm vi test chỉ 4 journey |
| "Tested with forced-colors mode" | Nếu bước D6 của checklist 05 ghi `N/A` |
| "Captions supported" (không kèm điều kiện) | Known limitation #1, #2, #3 vẫn còn hiệu lực |
| "Accessibility enforced in CI" | Chỉ đúng khi accessibility gate đã thực sự bật trong workflow |

---

## 8. English summary — copy vào README dự án sau khi test xong

Điền các giá trị trong `<...>` rồi copy nguyên khối này thay cho phần "Publication status" hiện tại của README.
Giữ nguyên cách diễn đạt có giới hạn — đây là điểm mạnh, không phải điểm yếu.

```markdown
| Layer | Evidence |
| --- | --- |
| Static and component | JSX accessibility linting, semantic Testing Library assertions, and component axe scans |
| Browser automation | Stateful Playwright journeys, axe-core, pa11y, keyboard/focus helpers, screenshots, and traces |
| Human validation | Four critical journeys manually tested on <YYYY-MM-DD> with Safari <version> + VoiceOver on macOS <version>, plus a keyboard-only pass in Chrome <version>. <N> issues were found, remediated, and retested; results are recorded per step in [the manual checklists](frontend/e2e/manual-a11y-checklists/00-summary.md) |

> **Scope of the accessibility claim:** WCAG 2.2 Level AA is the target and testing standard for four
> critical journeys — not a claim of full-site certification or third-party audit. Manual verification
> covers Safari + VoiceOver on macOS, keyboard-only operation, 200% zoom, 320px reflow, reduced motion,
> and colour-independence. `forced-colors` mode and the Angular admin console are outside the tested
> scope. Captions and transcripts remain a documented limitation: they depend on per-course source data
> rather than a guaranteed pipeline. Automated accessibility suites are implemented but are not yet
> enforced as a CI gate.
```

Nếu vẫn còn `Fail` hoặc `Blocked` ở mức `P0`, **không** dùng khối trên — giữ nguyên wording "verification work in progress" hiện có trong README.
