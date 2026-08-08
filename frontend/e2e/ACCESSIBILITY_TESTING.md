# Accessibility Testing Guide

Tài liệu này hướng dẫn cách sử dụng và kiểm tra accessibility test infrastructure
của EduMind. Nội dung hiện tại bao phủ Phase 0, mục 2.2 trong
`4-flow-a11y.md`.

## Phạm vi hiện tại

Các utility dùng chung nằm tại:

- `e2e/utils/accessibility.ts`
- `e2e/tests/user/accessibility-utils.spec.ts`
- `e2e/playwright.utilities.config.ts`

Infrastructure này cung cấp:

- Axe scan cho toàn document, CSS selector hoặc Playwright `Locator`.
- Accessibility gate mặc định theo WCAG A/AA.
- Test chỉ fail với violation mức `critical` hoặc `serious`.
- JSON report được đính kèm vào Playwright artifact khi Axe gate fail.
- Output gồm rule ID, WCAG tags, selector, HTML, hướng sửa và URL tham khảo.
- Kiểm tra focus order, hidden/disabled focus target và keyboard trap.
- Kiểm tra focus indicator bằng computed style hoặc screenshot assertion.

Đây mới là test cho test infrastructure. Accessibility tests của từng user flow
sẽ sử dụng các helper này trong những phase tiếp theo.

## Pa11y cho public/auth routes

Pa11y scan chín route được yêu cầu trong Phase 0 bằng `WCAG2AA`. Runner dùng
fixture API read-only ở `e2e/pa11y/fixtures.cjs`, chặn mọi API write và đợi
selector page-ready riêng cho từng route trước khi audit. Vì vậy CI không đọc
hay thay đổi production data. Hai trang kết quả checkout được mở bằng auth state
fixture cục bộ; runner sẽ fail nếu một route bị redirect sang trang khác.

Khởi động user app local trước, sau đó chạy:

```bash
npm run start:user (tương tự như nx serve user)
npm run pa11y
```

Để trỏ vào một local/ephemeral environment khác:

```bash
PA11Y_BASE_URL=http://127.0.0.1:3000 npm run pa11y
```

Timeout mặc định là 60 giây, có thể đổi bằng `PA11Y_TIMEOUT`. JSON tổng hợp và
HTML theo route được ghi vào `e2e/pa11y/reports/`; CI cần upload toàn bộ thư mục
này kể cả khi command fail do tìm thấy violation.

`e2e/pa11y/reports/` là runtime output và bị Git ignore. Baseline bất biến dùng
cho Phase 0 audit được commit riêng tại
`e2e/accessibility-reports/before/pa11y/`. Khi remediation hoàn tất, lưu bản
re-scan tương ứng tại `e2e/accessibility-reports/after/pa11y/`; không ghi đè
baseline.

## Quản lý vòng đời report: runtime, before và after

Ba loại output có mục đích khác nhau:

| Loại | Thư mục | Khi nào dùng | Git |
|---|---|---|---|
| Runtime | `e2e/pa11y/reports/` và Playwright artifacts | Mọi lần chạy local/CI thông thường | Ignore; CI upload artifact nếu cần |
| Before | `e2e/accessibility-reports/before/` | Chụp baseline một lần, trước remediation | Evidence bất biến theo policy của dự án |
| After | `e2e/accessibility-reports/after/` | Re-scan sau remediation để so sánh | Chỉ lưu khi milestone thực sự hoàn tất |

### Chạy kiểm tra thông thường

Đây là command mặc định khi phát triển. Không cần move report:

```bash
npm run pa11y
```

Pa11y tự ghi JSON/HTML vào `e2e/pa11y/reports/`. Có thể xóa các generated files
trong thư mục này bất kỳ lúc nào; lần chạy tiếp theo sẽ tạo lại. Giữ `.gitignore`
và `README.md`.

Playwright tests dùng `checkA11y()` lưu JSON trong Playwright artifact khi Axe
gate fail. Các artifact này cũng là runtime output, không phải committed
before/after evidence.

### Tạo Pa11y before evidence

Chỉ thực hiện một lần trước khi sửa code:

```bash
PA11Y_REPORT_DIR=e2e/accessibility-reports/before/pa11y npm run pa11y
```

`PA11Y_REPORT_DIR` làm runner ghi thẳng vào evidence directory, nên không cần
move thủ công. Phase 0 đã có baseline này; **không chạy lại command trên để ghi
đè `before/pa11y/`**.

### Tạo Pa11y after evidence

Chỉ chạy khi remediation đã hoàn tất và UI đang ở commit cần đánh giá:

```bash
PA11Y_REPORT_DIR=e2e/accessibility-reports/after/pa11y npm run pa11y
```

Sau đó:

1. Xác nhận đủ chín route và không có `scanError`.
2. So sánh kết quả với `before/pa11y/pa11y-results.json`.
3. Cập nhật `BASELINE_ACCESSIBILITY_AUDIT.md` hoặc remediation report.
4. Chỉ lưu `after` làm evidence khi kết quả đúng với milestone đang bàn giao.

### Axe + keyboard before evidence

Collector hiện tại ghi trực tiếp vào `e2e/accessibility-reports/before/`:

```bash
A11Y_BASE_URL=http://localhost:3000 \
  npx playwright test \
  --config=e2e/playwright.baseline-a11y.config.ts
```

Command này đã được dùng để tạo Phase 0 baseline. **Không chạy lại sau khi đã
remediate**, vì collector hiện chưa hỗ trợ chọn output directory và có thể ghi
đè before evidence.

### Axe + keyboard after evidence

Hiện chưa có command tự động để ghi Axe/keyboard re-scan vào `after/`. Không
copy report thủ công rồi gọi đó là after evidence. Cần bổ sung collector/config
cho phép chọn output directory, sau đó mới tài liệu hóa command chính thức.

Trạng thái hiện tại:

```text
Pa11y runtime    → tự động
Pa11y before     → đã có; không ghi đè
Pa11y after      → có thể ghi trực tiếp bằng PA11Y_REPORT_DIR
Axe before       → đã có; collector ghi cố định vào before
Axe after        → chưa được tự động hóa
```

## Cài đặt

Từ repository root:

```bash
cd frontend
npm install
```

Nếu Chromium của Playwright chưa được cài:

```bash
npx playwright install chromium
```

## Kiểm tra lại infrastructure

### 1. TypeScript

Từ thư mục `frontend`:

```bash
./node_modules/.bin/tsc -p e2e/tsconfig.json --noEmit
```

Kết quả đúng: command kết thúc với exit code `0` và không có TypeScript error.

### 2. Utility regression tests

```bash
./node_modules/.bin/playwright test \
  --config=e2e/playwright.utilities.config.ts
```

Kết quả mong đợi:

```text
4 passed
```

Bộ test này không khởi động user app, admin app hoặc database. Test sử dụng
`page.setContent()` nên có thể chạy độc lập và nhanh.

Chạy tuần tự với output dễ đọc:

```bash
./node_modules/.bin/playwright test \
  --config=e2e/playwright.utilities.config.ts \
  --workers=1 \
  --reporter=list
```

Debug bằng Playwright UI:

```bash
./node_modules/.bin/playwright test \
  --config=e2e/playwright.utilities.config.ts \
  --ui
```

## Sử dụng `checkA11y`

Ví dụ scan toàn document:

```ts
import { test } from '@playwright/test';
import { checkA11y } from '../../utils/accessibility.js';

test('course page has no serious Axe violations @a11y-public', async ({
  page,
}, testInfo) => {
  await page.goto('/courses');
  await page.getByRole('heading', { name: /courses/i }).waitFor();

  await checkA11y(page, {
    stateName: 'courses loaded',
    testInfo,
  });
});
```

`stateName` phải mô tả đúng UI state đang được scan, không chỉ ghi route. Ví dụ:

- `login initial`
- `login validation errors`
- `cart with one item`
- `checkout payment pending`
- `course player lesson loaded`

### Scan một vùng cụ thể

Có thể truyền CSS selector:

```ts
await checkA11y(page, {
  context: 'main',
  stateName: 'course results',
  testInfo,
});
```

Hoặc Playwright `Locator`:

```ts
await checkA11y(page, {
  context: page.getByRole('dialog', { name: 'Shopping cart' }),
  stateName: 'cart dialog open',
  testInfo,
});
```

Mặc định nên scan toàn document. Chỉ giới hạn context khi test đang kiểm tra một
UI state biệt lập và phần còn lại của page đã được cover ở test khác.

### WCAG tags

Mặc định helper chạy:

```ts
[
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
]
```

Chỉ override `tags` khi test có mục đích cụ thể và lý do được ghi rõ trong test.

## Quy tắc exclusion

Không được thêm `exclude` chỉ để làm test pass. Mỗi selector bị exclude phải có:

- Lý do kỹ thuật và user impact còn tồn tại.
- Issue ID có thể theo dõi.
- Điều kiện cụ thể để xóa exclusion.

Ví dụ:

```ts
await checkA11y(page, {
  stateName: 'payment widget loaded',
  exclude: ['.third-party-payment-widget'],
  exclusionDocumentation: [
    {
      selector: '.third-party-payment-widget',
      reason:
        'Widget is rendered inside vendor-controlled markup; keyboard flow is tested separately.',
      issueId: 'A11Y-123',
      removalCondition:
        'Remove when the payment vendor exposes accessible markup or the widget is replaced.',
    },
  ],
  testInfo,
});
```

Helper sẽ fail trước khi Axe chạy nếu:

- Selector trong `exclude` không có documentation.
- `reason` hoặc `removalCondition` trống.
- `issueId` không đúng dạng issue key hoặc issue URL.
- Documentation đã cũ và không còn selector tương ứng trong `exclude`.

## Keyboard utilities

### Gửi Tab và ghi lại focus

```ts
const focused = await tabAndRecordFocus(page);

expect(focused.selector).toBe('#email');
```

Helper tự động fail nếu focus đi vào element hidden hoặc disabled.

### Kiểm tra focus traversal và keyboard trap

```ts
const focusOrder = await walkKeyboardFocus(page, {
  maxTabs: 20,
});

expect(focusOrder.map((item) => item.selector)).toEqual([
  '#email',
  '#password',
  'button[type="submit"]',
]);
```

Đối với widget mà focus phải thoát được:

```ts
await walkKeyboardFocus(page, {
  scope: page.getByRole('dialog'),
  mustExitScope: true,
  maxTabs: 20,
});
```

Nếu focus lặp lại trước khi rời khỏi scope, helper báo keyboard trap.

Không dùng `mustExitScope: true` cho modal được thiết kế đúng theo modal focus
trap. Với modal, cần test riêng:

- `Escape` đóng modal.
- Focus được trả về element đã mở modal.
- Focus không thoát ra background trong khi modal còn mở.

### Kiểm tra focus indicator

```ts
const submitButton = page.getByRole('button', { name: 'Sign in' });
await submitButton.focus();

await expectFocusVisible(submitButton);
```

Helper chấp nhận focus indicator được thể hiện bằng `outline` hoặc `box-shadow`.

Tại những điểm UI quan trọng có thể thêm screenshot assertion:

```ts
await expectFocusVisible(submitButton, 'login-submit-focused.png');
```

Screenshot assertion cần baseline ổn định và phải được review khi giao diện thay
đổi; không tự động update snapshot khi chưa kiểm tra bằng mắt.

## Khi Axe test fail

Console output chứa:

- Severity.
- Axe rule ID.
- WCAG tags.
- Selector của node lỗi.
- HTML snippet.
- Failure summary và hướng sửa.
- Axe help URL.

Nếu `testInfo` được truyền vào `checkA11y`, helper đính kèm file JSON có tên dạng:

```text
axe-checkout-payment-pending.json
```

Mở Playwright report hoặc thư mục test artifact để xem report đầy đủ. Không chỉ
sửa node được báo lỗi; cần xác định root cause nằm ở shared component, page hay
third-party integration.

## Checklist khi thêm accessibility test mới

- Chờ selector đại diện cho UI-ready state trước khi gọi `checkA11y`.
- Scan từng state quan trọng, bao gồm loading, validation error, success và dialog.
- Đặt `stateName` rõ ràng và duy nhất trong flow.
- Luôn truyền `testInfo` để lưu JSON artifact khi fail.
- Không dùng timeout cố định để giả lập UI ổn định nếu có selector/state rõ ràng.
- Không thêm exclusion thiếu issue và điều kiện gỡ.
- Test keyboard behavior, không chỉ kiểm tra Axe.
- Kiểm tra focus indicator tại các điểm chuyển trạng thái quan trọng.
- Giữ Safari + VoiceOver manual test trong handoff; automated test không thay thế
  assistive technology thật.

## Giới hạn hiện tại

- Axe không đánh giá được trải nghiệm nghe thực tế hoặc thứ tự đọc có tự nhiên.
- Computed style chỉ xác nhận có focus indicator kỹ thuật; vẫn cần visual review
  để xác nhận indicator đủ rõ và không bị che.
- Keyboard traversal helper không thay thế test interaction riêng cho tabs,
  menus, comboboxes, grids và modal dialogs.
- Accessibility infrastructure chưa chứng minh bốn user flow đạt WCAG 2.2 AA.
  Mỗi flow vẫn cần automated regression, before/after evidence và Safari +
  VoiceOver manual confirmation theo `4-flow-a11y.md`.
