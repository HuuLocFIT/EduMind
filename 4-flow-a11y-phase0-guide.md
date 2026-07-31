# Hướng dẫn đọc implementation Accessibility Phase 0

Tài liệu này là bản đồ đọc code cho toàn bộ thay đổi của **Phase 0 — Baseline và hạ tầng kiểm thử** trong [`4-flow-a11y.md`](./4-flow-a11y.md). Mục tiêu không phải chỉ liệt kê file, mà giúp hiểu:

- mỗi file giải quyết task nào trong plan;
- dữ liệu đi từ cấu hình đến test và report như thế nào;
- nên đọc file theo thứ tự nào để không bị ngợp;
- cách đọc kết quả Axe, Pa11y, keyboard snapshot và issue log;
- phần nào là baseline “trước khi sửa”, phần nào là remediation shared foundation;
- Phase 0 hiện chứng minh được gì và chưa chứng minh được gì.

---

## 1. Kết luận nhanh trước khi đọc code

Phase 0 hiện có bốn lớp chính:

```text
Plan và dependencies
        ↓
Accessibility utilities dùng chung
        ↓
Pa11y/Axe baseline collectors + deterministic fixtures
        ↓
Baseline evidence + shared UI remediation + regression tests
```

Hai nhánh test có mục đích khác nhau:

```text
URL ổn định, public/auth
        ↓
Pa11y runner
        ↓
pa11y-results.json + HTML theo route

Route/state cần browser automation
        ↓
Playwright + Axe + keyboard snapshot
        ↓
before/<route>.json + summary.json
```

Điểm quan trọng nhất khi đọc:

1. `before/` là bằng chứng **trước remediation**, không phải report pass sau khi sửa.
2. Baseline collector có nhiệm vụ **ghi nhận lỗi**, nên nó không fail test chỉ vì phát hiện violation.
3. `checkA11y()` là utility dành cho regression gate ở các phase sau; utility này mới fail với lỗi `critical` hoặc `serious`.
4. Component/layout changes là phần sửa shared foundation ở task 2.5.
5. Chưa có `after/`, chưa có VoiceOver manual result và baseline lint vẫn có lỗi. Vì vậy không được đọc Phase 0 như bằng chứng cả bốn flow đã đạt WCAG 2.2 AA.

---

## 2. Reading path đề xuất

Không nên đọc 50 file theo alphabet. Hãy đọc theo luồng dưới đây.

### Vòng 1 — Hiểu bức tranh tổng thể, khoảng 20–30 phút

Đọc lần lượt:

1. [`4-flow-a11y.md`](./4-flow-a11y.md), chỉ tập trung mục 1 và mục 2.
2. [`frontend/e2e/BASELINE_ACCESSIBILITY_AUDIT.md`](./frontend/e2e/BASELINE_ACCESSIBILITY_AUDIT.md).
3. [`frontend/e2e/accessibility-reports/before/summary.json`](./frontend/e2e/accessibility-reports/before/summary.json).
4. [`frontend/e2e/ACCESSIBILITY_TESTING.md`](./frontend/e2e/ACCESSIBILITY_TESTING.md).
5. [`frontend/package.json`](./frontend/package.json), chỉ đọc scripts và accessibility dependencies.

Sau vòng này cần trả lời được:

- Phase 0 muốn xây nền tảng gì?
- Có bao nhiêu route được scan?
- Route nào có critical/serious issue?
- Axe, Pa11y và ESLint chịu trách nhiệm khác nhau thế nào?
- Baseline khác regression gate ở điểm nào?

### Vòng 2 — Hiểu test infrastructure, khoảng 45–60 phút

Đọc lần lượt:

1. [`frontend/e2e/utils/accessibility.ts`](./frontend/e2e/utils/accessibility.ts).
2. [`frontend/e2e/tests/user/accessibility-utils.spec.ts`](./frontend/e2e/tests/user/accessibility-utils.spec.ts).
3. [`frontend/e2e/playwright.utilities.config.ts`](./frontend/e2e/playwright.utilities.config.ts).
4. [`frontend/e2e/pa11y/config.cjs`](./frontend/e2e/pa11y/config.cjs).
5. [`frontend/e2e/pa11y/fixtures.cjs`](./frontend/e2e/pa11y/fixtures.cjs).
6. [`frontend/e2e/pa11y/run.cjs`](./frontend/e2e/pa11y/run.cjs).
7. [`frontend/e2e/playwright.baseline-a11y.config.ts`](./frontend/e2e/playwright.baseline-a11y.config.ts).
8. [`frontend/e2e/tests/user/baseline-a11y.spec.ts`](./frontend/e2e/tests/user/baseline-a11y.spec.ts).

Sau vòng này cần tự mô tả được:

- một route được fixture như thế nào;
- app được chờ “ready” bằng selector nào;
- Axe được cấu hình theo tags nào;
- critical/serious violation được xử lý khác baseline collector ra sao;
- JSON report được tạo ở đâu;
- keyboard snapshot phát hiện được gì và không phát hiện được gì.

### Vòng 3 — Hiểu shared foundation remediation, khoảng 60–90 phút

Đọc theo nhóm hành vi, không đọc theo tên thư mục.

#### Nhóm A: landmark và route navigation

1. [`frontend/apps/user/src/app/layouts/MainLayout.tsx`](./frontend/apps/user/src/app/layouts/MainLayout.tsx).
2. [`frontend/apps/user/src/app/layouts/AuthLayout.tsx`](./frontend/apps/user/src/app/layouts/AuthLayout.tsx).
3. [`frontend/apps/user/src/app/components/ScrollToTop.tsx`](./frontend/apps/user/src/app/components/ScrollToTop.tsx).
4. [`frontend/apps/user/src/app/components/ScrollToTop.test.tsx`](./frontend/apps/user/src/app/components/ScrollToTop.test.tsx).

#### Nhóm B: form control contract

1. [`Input.tsx`](./frontend/libs/user/ui/src/lib/Form/Input.tsx).
2. [`PasswordInput.tsx`](./frontend/libs/user/ui/src/lib/Form/PasswordInput.tsx).
3. [`Select.tsx`](./frontend/libs/user/ui/src/lib/Form/Select.tsx).
4. [`Textarea.tsx`](./frontend/libs/user/ui/src/lib/Form/Textarea.tsx).
5. [`Checkbox.tsx`](./frontend/libs/user/ui/src/lib/Form/Checkbox.tsx).
6. [`Radio.tsx`](./frontend/libs/user/ui/src/lib/Form/Radio.tsx).
7. [`Switch.tsx`](./frontend/libs/user/ui/src/lib/Form/Switch.tsx).

Khi đọc nhóm này, luôn lần theo cùng một contract:

```text
visible label
    └── htmlFor="<control-id>"
            └── control id="<control-id>"

helper text id="<control-id>-description"
error id="<control-id>-error"
            ↑
aria-describedby="...description ...error"

error tồn tại
            ↓
aria-invalid="true"
```

#### Nhóm C: action, status và loading

1. [`Button.tsx`](./frontend/libs/user/ui/src/lib/Button/Button.tsx).
2. [`IconButton.tsx`](./frontend/libs/user/ui/src/lib/Button/IconButton.tsx).
3. [`Alert.tsx`](./frontend/libs/user/ui/src/lib/Alert/Alert.tsx).
4. [`Toast.tsx`](./frontend/libs/user/ui/src/lib/Toast/Toast.tsx).
5. [`Loading.tsx`](./frontend/libs/user/ui/src/lib/Loading/Loading.tsx).
6. [`FullPageLoading.tsx`](./frontend/libs/user/ui/src/lib/FullPageLoading/FullPageLoading.tsx).
7. [`LoadingOverlay.tsx`](./frontend/libs/user/ui/src/lib/LoadingOverlay/LoadingOverlay.tsx).
8. [`Skeleton.tsx`](./frontend/libs/user/ui/src/lib/Skeleton/Skeleton.tsx).
9. [`ProgressBar.tsx`](./frontend/libs/user/ui/src/lib/ProgressBar/ProgressBar.tsx).

#### Nhóm D: composite widget

1. [`Modal.tsx`](./frontend/libs/user/ui/src/lib/Modal/Modal.tsx).
2. [`ConfirmDialog.tsx`](./frontend/libs/user/ui/src/lib/Modal/ConfirmDialog.tsx).
3. [`Tabs.tsx`](./frontend/libs/user/ui/src/lib/Tabs/Tabs.tsx).

Cuối cùng đọc regression contract:

4. [`frontend/apps/user/src/app/components/shared-ui-accessibility.test.tsx`](./frontend/apps/user/src/app/components/shared-ui-accessibility.test.tsx).

File test này là bản tóm tắt executable tốt nhất của shared UI changes. Nếu một assertion chưa hiểu, quay lại đúng component tương ứng.

### Vòng 4 — Đọc raw evidence khi cần điều tra

Không đọc tuần tự hàng nghìn dòng JSON. Bắt đầu từ:

1. [`frontend/e2e/accessibility-reports/before/README.md`](./frontend/e2e/accessibility-reports/before/README.md).
2. [`frontend/e2e/accessibility-reports/before/summary.json`](./frontend/e2e/accessibility-reports/before/summary.json).
3. Chọn đúng `<route>.json` dựa trên issue đang điều tra.
4. Trong file route, tìm `"violations"`, `"impact"`, `"id"`, `"target"`, `"html"` và `"failureSummary"`.
5. Đối chiếu issue đã được nhóm trong [`BASELINE_ACCESSIBILITY_AUDIT.md`](./frontend/e2e/BASELINE_ACCESSIBILITY_AUDIT.md).

Các raw report lớn chỉ nên được mở theo câu hỏi cụ thể, ví dụ:

- Tại sao login bị critical?
- Selector chính xác của node vi phạm là gì?
- Axe rule ID và WCAG tags nào liên quan?
- Keyboard đã đi qua những element nào?

---

## 3. Map từng task Phase 0 sang implementation

### 3.1. Task 2.1 — Chuẩn hóa công cụ

File chính:

- [`frontend/package.json`](./frontend/package.json)
- [`frontend/package-lock.json`](./frontend/package-lock.json)
- [`frontend/eslint.config.mjs`](./frontend/eslint.config.mjs)

Dependencies được bổ sung:

- `@axe-core/playwright`: chạy Axe trong Playwright.
- `axe-core`: type/result và khả năng dùng Axe trực tiếp.
- `pa11y`: URL-level scan.
- `pa11y-ci`: dependency phục vụ CI-style Pa11y workflow.
- `eslint-plugin-jsx-a11y`: static analysis cho JSX.
- `puppeteer` và `puppeteer-core`: browser runtime cho Pa11y runner.

Scripts cần hiểu:

| Script | Ý nghĩa |
|---|---|
| `lint:a11y` | Chạy JSX accessibility lint trên user app và user UI library |
| `test:a11y` | Chạy mọi Playwright test có tag `@a11y` |
| `test:a11y:public` | Chạy test có tag `@a11y-public` |
| `test:a11y:auth` | Chạy test có tag `@a11y-auth` |
| `test:a11y:purchase` | Chạy test có tag `@a11y-purchase` |
| `test:a11y:learning` | Chạy test có tag `@a11y-learning` |
| `pa11y` | Chạy custom Pa11y runner local |
| `pa11y:ci` | Chạy runner với Chromium flags phù hợp CI |
| `test:a11y:report` | Mở Playwright HTML report |

Lưu ý: scripts theo flow đã được tạo, nhưng Phase 0 chưa đồng nghĩa tất cả flow đã có đầy đủ test case mang các tag đó.

`eslint.config.mjs` áp dụng recommended rules của `jsx-a11y` cho:

```text
apps/user/src/**/*
libs/user/ui/src/**/*
```

Đây là static source gate. Nó không render React, không biết runtime state và không thay thế Axe/Pa11y.

### 3.2. Task 2.2 — Accessibility test utilities

File trung tâm là [`frontend/e2e/utils/accessibility.ts`](./frontend/e2e/utils/accessibility.ts).

#### `WCAG_AA_TAGS`

Danh sách mặc định:

```ts
wcag2a
wcag2aa
wcag21a
wcag21aa
wcag22aa
```

Nó giới hạn Axe vào nhóm rule A/AA trong scope đang hướng tới.

#### `checkA11y(page, options)`

Luồng chạy:

```text
validate exclusions
        ↓
đợi DOM + fonts + hai animation frames
        ↓
tạo AxeBuilder với WCAG tags
        ↓
áp dụng context/include/exclude
        ↓
axe.analyze()
        ↓
lọc critical + serious
        ↓
nếu có blocker:
  attach JSON artifact
  format lỗi dễ đọc
  throw để fail test
```

Các option quan trọng:

- `stateName`: bắt buộc; phải mô tả UI state, không chỉ route.
- `context`: CSS selector hoặc Playwright `Locator`.
- `include`: thêm vùng scan.
- `exclude`: loại vùng scan, nhưng phải có tài liệu tương ứng.
- `exclusionDocumentation`: reason, issue ID và removal condition.
- `tags`: override WCAG tags trong trường hợp đặc biệt.
- `testInfo`: cho phép attach JSON vào Playwright artifact khi fail.

Một chi tiết đáng chú ý: với `Locator`, helper tạm thêm `data-a11y-scan-context`, dùng selector đó cho Axe, rồi restore DOM attribute trong `finally`.

#### Exclusion guardrail

`validateExclusions()` ngăn ba kiểu “làm test xanh giả”:

- exclude selector nhưng không ghi lý do;
- issue ID không đúng format;
- còn documentation cũ nhưng selector đã không còn trong `exclude`.

#### Keyboard helpers

`tabAndRecordFocus()`:

- nhấn một lần `Tab`;
- lấy active element;
- ghi selector, tag, role, accessible-name gần đúng, disabled và hidden;
- fail nếu focus đi vào hidden/disabled element.

`walkKeyboardFocus()`:

- nhấn Tab liên tục;
- ghi focus order;
- dừng khi hết cycle hoặc ra khỏi scope;
- phát hiện focus lặp trước khi thoát khỏi bounded widget.

`expectFocusVisible()`:

- xác nhận element thực sự đang focus;
- kiểm tra computed `outline` hoặc `box-shadow`;
- có thể chụp screenshot assertion.

Giới hạn cần nhớ:

- text/`aria-label` được ghi trong `accessibleName` chỉ là phép xấp xỉ, không phải full browser accessibility name computation;
- có outline hoặc shadow không tự chứng minh contrast và visibility đạt chuẩn;
- modal được thiết kế để trap focus hợp lệ, nên không dùng `mustExitScope: true` cho modal;
- helper chung không thay thế interaction test riêng của tabs, menus, comboboxes và dialogs.

#### Test utility

[`accessibility-utils.spec.ts`](./frontend/e2e/tests/user/accessibility-utils.spec.ts) có bốn regression test:

1. scan `Locator` context và restore DOM attribute;
2. từ chối undocumented exclusion;
3. ghi focus order và kiểm tra focus indicator;
4. phát hiện focus trap trong bounded widget.

[`playwright.utilities.config.ts`](./frontend/e2e/playwright.utilities.config.ts) chỉ chạy file này. Test dùng `page.setContent()`, nên không cần app server hoặc database.

### 3.3. Task 2.3 — Pa11y

Đọc ba file theo thứ tự `config → fixtures → runner`.

#### `pa11y/config.cjs`

File này định nghĩa:

- local-only base URL;
- chín routes;
- selector đại diện cho page-ready;
- route nào cần fake authenticated state;
- `WCAG2AA`, timeout, viewport và report directory.

Local-only guard rất quan trọng: runner từ chối host khác `localhost`, `127.0.0.1` hoặc `::1`. Điều này giảm nguy cơ scan nhầm production.

#### `pa11y/fixtures.cjs`

Fixture tạo một course ổn định:

```text
slug: pa11y-accessibility-fixture
title: Accessible Web Foundations
```

`responseForApi(pathname)` trả deterministic JSON cho:

- course detail;
- instructor stats;
- reviews;
- course list;
- categories;
- API read chưa biết.

Fixture giúp report có thể tái tạo và không phụ thuộc dữ liệu backend biến động.

#### `pa11y/run.cjs`

Luồng chạy:

```text
launch Puppeteer
        ↓
với từng route:
  tạo page
  cài auth localStorage nếu cần
  intercept request
  chặn API write bằng 405
  mock API GET bằng fixture
  đợi ready selector
  chạy Pa11y
  kiểm tra không bị redirect
  ghi HTML report
        ↓
ghi pa11y-results.json tổng hợp
        ↓
exit 1 nếu scan hỏng
exit 2 nếu scan thành công nhưng có issue
exit 0 nếu không có issue
```

Phải phân biệt:

- `scanError`: không thu được kết quả đáng tin cậy, không được coi là pass;
- `issues.length > 0`: scan chạy được và đã tìm thấy accessibility issue;
- không issue: chỉ có nghĩa Pa11y không tìm thấy issue trong state đó.

### 3.4. Task 2.4 — Baseline audit

Hai nguồn chính:

- collector: [`baseline-a11y.spec.ts`](./frontend/e2e/tests/user/baseline-a11y.spec.ts);
- bản tổng hợp con người đọc: [`BASELINE_ACCESSIBILITY_AUDIT.md`](./frontend/e2e/BASELINE_ACCESSIBILITY_AUDIT.md).

#### Baseline Playwright collector

Config [`playwright.baseline-a11y.config.ts`](./frontend/e2e/playwright.baseline-a11y.config.ts):

- chạy riêng `baseline-a11y.spec.ts`;
- dùng một worker để report ổn định;
- mặc định dùng `http://localhost:3000`;
- tự chạy `npm run start:user`;
- reuse server nếu đã có.

Test baseline:

1. lặp qua cùng chín route;
2. tạo browser context mới cho từng route;
3. cài deterministic fixture và auth state nếu cần;
4. đợi ready selector;
5. chạy Axe với WCAG tags;
6. chạy keyboard snapshot tối đa 80 lần Tab;
7. ghi một JSON cho từng route;
8. ghi `summary.json`.

Collector này dùng `AxeBuilder` trực tiếp thay vì `checkA11y()`. Lý do là baseline phải lưu lại toàn bộ lỗi để làm “before evidence”, không dừng ngay ở route đầu tiên bị critical/serious.

#### Kết quả baseline hiện tại

Theo `summary.json`:

| Route | Axe | Critical nodes | Serious nodes | Keyboard issues |
|---|---:|---:|---:|---:|
| `/` | 0 | 0 | 0 | 0 |
| `/courses` | 1 | 0 | 1 | 0 |
| Course detail fixture | 1 | 0 | 1 | 0 |
| `/login` | 1 | 1 | 0 | 0 |
| `/signup` | 1 | 1 | 0 | 0 |
| `/forgot-password` | 0 | 0 | 0 | 0 |
| Reset missing token | 0 | 0 | 0 | 0 |
| Checkout success | 1 | 0 | 1 | 0 |
| Checkout failed | 1 | 0 | 1 | 0 |

Pa11y baseline được audit document tổng hợp là **30 errors trên 9 route**. ESLint baseline là **628 findings: 105 errors và 523 warnings**, nhưng command lint quét phạm vi rộng hơn chín route baseline.

#### Issue grouping

`BASELINE_ACCESSIBILITY_AUDIT.md` không copy từng tool finding thành một issue. Nó nhóm theo root cause:

| ID | Root cause |
|---|---|
| `A11Y-BL-001` | Auth form inputs thiếu programmatic label association |
| `A11Y-BL-002` | Password visibility button không có name và bị loại khỏi tab order |
| `A11Y-BL-003` | Price range inputs thiếu distinct accessible names |
| `A11Y-BL-004` | Contrast của separator/required marker |
| `A11Y-BL-005` | Route title metadata |
| `A11Y-BL-006` | Course detail list structure |

Đây là cách nên đọc report: từ nhiều node/tool findings đi lên một shared root cause, rồi mới chọn component cần sửa.

### 3.5. Task 2.5 — Shared foundation

#### Layout và route focus

`MainLayout.tsx`:

- thêm semantic `<header>` bao quanh main navigation;
- giữ `nav aria-label="Main navigation"`;
- giữ skip link đến `#main-content`;
- `main` có `id`, `tabIndex={-1}` để nhận programmatic focus;
- bỏ các `href="#"` chưa có destination thật khỏi các mục footer;
- cho dropdown menu programmatic focus target.

`AuthLayout.tsx`:

- thêm skip link;
- đổi wrapper nội dung thành `<main id="main-content" tabIndex={-1}>`;
- ẩn decorative background khỏi accessibility tree.

`ScrollToTop.tsx`:

- chỉ phản ứng khi `pathname` thực sự đổi;
- scroll về đầu;
- đợi render bằng `requestAnimationFrame`;
- ưu tiên focus `h1` trong `main`, fallback về `main`;
- thêm `tabIndex=-1` cho heading nếu cần;
- cập nhật title thành `<h1 text> | EduMind`.

Query-string-only change không kích hoạt vì dependency là `pathname`. Điều này phù hợp yêu cầu không làm mất focus chỉ vì query string đổi.

#### Forms

Các form components được chuẩn hóa:

- dùng `useId()` nhưng tôn trọng `id` do caller truyền;
- gắn `label htmlFor` với control `id`;
- giữ helper text kể cả khi error xuất hiện;
- nối cả helper và error IDs trong `aria-describedby`;
- expose `aria-invalid`;
- Password toggle trở lại tab order, có “Show/Hide password” và `aria-pressed`;
- Switch có native checkbox + `role="switch"` và label association.

#### Button và icon

- Button giữ accessible name ổn định khi loading và expose `aria-busy`;
- IconButton bắt buộc `aria-label`, disable khi loading và ẩn icon trang trí;
- SVG/icon trang trí được `aria-hidden`;
- close buttons được đặt `type="button"` để không submit form ngoài ý muốn.

#### Status, loading và placeholder

- error Alert dùng `role="alert"`;
- non-error Alert dùng `role="status"`;
- loading components dùng `status`, `aria-live` và/hoặc `aria-busy`;
- spinner icon bị ẩn khỏi accessibility tree;
- Skeleton dùng `aria-hidden="true"`;
- ProgressBar expose role, label, min/max/current value và clamp về 0–100.

#### Modal và tabs

- Modal có accessible label fallback khi không có title;
- ConfirmDialog truyền title vào Modal để dialog được đặt tên;
- close icon là decorative;
- Headless UI tiếp tục phụ trách focus trap, Escape và restore focus;
- tablist nhận `tabIndex={-1}` để tránh rule báo role có handler nhưng không focusable, trong khi focus thực tế vẫn nằm trên các tab.

#### Shared regression test

`shared-ui-accessibility.test.tsx` kiểm tra sáu contract:

1. form labels/descriptions/errors/invalid state;
2. password visibility và switch state;
3. button loading name và progress state;
4. WAI-ARIA tabs keyboard behavior;
5. dialog name, Escape và focus restoration;
6. alert/status roles và hidden skeleton.

Đọc test này theo mô hình Arrange → query by role/name → assert accessibility contract. Việc query bằng `getByRole(..., {name})` tự nó đã xác nhận phần lớn role/name contract.

---

## 4. Data flow từ command đến report

### 4.1. Pa11y flow

```text
npm run pa11y
    ↓
e2e/pa11y/run.cjs
    ├── đọc routes/options từ config.cjs
    ├── đọc API responses từ fixtures.cjs
    ├── mở local app bằng Puppeteer
    ├── mock API và chặn write
    ├── đợi readySelector
    └── gọi pa11y(...)
            ↓
e2e/pa11y/reports/
    ├── pa11y-results.json
    └── <route>.html
```

### 4.2. Axe + keyboard baseline flow

```text
Playwright baseline config
    ↓
baseline-a11y.spec.ts
    ├── khởi động/reuse local user app
    ├── tạo context riêng theo route
    ├── mock API/auth state
    ├── Axe analyze
    └── keyboard snapshot
            ↓
e2e/accessibility-reports/before/
    ├── <route>.json
    └── summary.json
```

### 4.3. Regression flow dùng trong các phase sau

```text
flow test có tag @a11y-...
    ↓
đưa UI đến một state ổn định
    ↓
checkA11y(page, { stateName, testInfo })
    ↓
không critical/serious → tiếp tục
có critical/serious → fail + attach JSON artifact
```

---

## 5. Cách đọc report mà không bị ngợp

### 5.1. Đọc `summary.json` trước

Mỗi entry có:

- `route`: URL/state đầu vào;
- `axeViolations`: số rule vi phạm, không phải số DOM node;
- `criticalNodes`: tổng node critical;
- `seriousNodes`: tổng node serious;
- `keyboardIssues`: số vấn đề do snapshot phát hiện;
- `scanError`: lỗi hạ tầng/điều hướng nếu scan không hoàn tất.

Một rule có thể chứa nhiều node. Vì vậy không cộng `axeViolations` và `seriousNodes` như cùng một đơn vị.

### 5.2. Đọc route JSON

Trong `<route>.json`, thứ tự ưu tiên:

1. `route`, `pageUrl`, `title`: xác nhận đúng trang đã scan.
2. `axe.violations`: danh sách rule vi phạm.
3. `impact`: `critical`, `serious`, `moderate` hoặc `minor`.
4. `id`: Axe rule, ví dụ `button-name`, `document-title`, `list`.
5. `tags`: mapping gần với WCAG criterion.
6. `nodes[].target`: selector.
7. `nodes[].html`: markup tại thời điểm scan.
8. `nodes[].failureSummary`: nguyên nhân và hướng sửa.
9. `keyboard.sequence`: focus order snapshot.
10. `keyboard.issues`: hidden, disabled, missing focus indicator hoặc cycle bất thường.

Ví dụ quy trình điều tra login:

```text
summary: login có 1 critical node
    ↓
login.json → violations
    ↓
rule id: button-name
    ↓
nodes[].target/html
    ↓
xác định password visibility button
    ↓
BASELINE_ACCESSIBILITY_AUDIT.md → A11Y-BL-002
    ↓
PasswordInput.tsx remediation
    ↓
shared-ui-accessibility.test.tsx regression assertion
```

### 5.3. Đọc Pa11y report

`pa11y-results.json` phù hợp để tổng hợp bằng máy. HTML theo route phù hợp để mở bằng browser và đọc từng issue.

Fields quan trọng thường gồm:

- `code`: HTML_CodeSniffer rule path;
- `type`/`typeCode`: error/warning/notice;
- `message`: mô tả lỗi;
- `context`: HTML liên quan;
- `selector`: vị trí node;
- `runner`: engine đã phát hiện.

Pa11y standard hiện là `WCAG2AA`. Đây là URL smoke scan; không nên kỳ vọng nó cover modal mở, validation error sau submit, authenticated course player hoặc state động chưa được trigger.

### 5.4. Dùng command để lọc raw JSON

Chạy từ `frontend/`:

```bash
jq '.routes[] | {route, criticalNodes, seriousNodes, keyboardIssues, scanError}' \
  e2e/accessibility-reports/before/summary.json
```

Xem rule và selector của login:

```bash
jq '.axe.violations[] | {
  id,
  impact,
  tags,
  nodes: [.nodes[] | {target, html, failureSummary}]
}' e2e/accessibility-reports/before/login.json
```

Xem keyboard focus sequence:

```bash
jq '.keyboard.sequence[] | {
  index,
  selector,
  tagName,
  name,
  focusVisible
}' e2e/accessibility-reports/before/courses.json
```

Tổng hợp số Pa11y issue theo route:

```bash
jq '.results[] | {
  route,
  issues: (.issues | length),
  scanError
}' e2e/pa11y/reports/pa11y-results.json
```

---

## 6. Cách chạy lại từng lớp

Các command dưới đây chạy từ `frontend/`.

### Static accessibility lint

```bash
npm run lint:a11y
```

Baseline hiện được ghi nhận là fail. Exit code khác 0 ở đây không có nghĩa infrastructure hỏng; cần đọc findings và phân loại scope/root cause.

### Utility type-check

```bash
./node_modules/.bin/tsc -p e2e/tsconfig.json --noEmit
```

### Utility regression tests

```bash
./node_modules/.bin/playwright test \
  --config=e2e/playwright.utilities.config.ts \
  --workers=1 \
  --reporter=list
```

Expected result trong testing guide: `4 passed`.

### Shared component/unit tests

Hai file quan trọng:

```text
apps/user/src/app/components/ScrollToTop.test.tsx
apps/user/src/app/components/shared-ui-accessibility.test.tsx
```

Có thể chạy qua Nx/Vitest setup của user app:

```bash
npm run test:user
```

### Pa11y

Terminal 1:

```bash
npm run start:user
```

Terminal 2:

```bash
npm run pa11y
```

Runner có thể exit `2` khi scan thành công nhưng tìm thấy issue. Hãy kiểm tra report thay vì diễn giải exit `2` thành lỗi browser.

### Baseline Axe + keyboard

```bash
A11Y_BASE_URL=http://localhost:3000 \
  npx playwright test \
  --config=e2e/playwright.baseline-a11y.config.ts
```

Không nên chạy command này rồi overwrite `before/` trong quá trình remediation. `before/` phải giữ nguyên để so sánh. Re-scan sau sửa cần ghi vào `after/` bằng collector/config phù hợp.

---

## 7. “Before”, runtime report và “After” khác nhau thế nào?

### Committed Axe before evidence

`frontend/e2e/accessibility-reports/before/*.json` đang được track trong Git. Đây là bằng chứng baseline bất biến theo README.

### Pa11y runtime reports

`frontend/e2e/pa11y/reports/` chỉ track:

- `.gitignore`;
- `README.md`.

Các file generated như `pa11y-results.json` và `<route>.html` hiện tồn tại local nhưng bị ignore. Nghĩa là:

- có thể đọc chúng ở workspace hiện tại;
- clone mới sẽ không có chúng cho đến khi chạy `npm run pa11y`;
- nếu dùng CI, toàn bộ runtime report directory nên được upload làm artifact kể cả khi command non-zero.

Pa11y “before evidence” dùng cho audit đã được sao chép và commit riêng tại:

```text
frontend/e2e/accessibility-reports/before/pa11y/
```

Vì vậy clone mới vẫn có baseline evidence, trong khi các lần chạy local/CI
không tạo Git diff trong runtime report directory.

### After evidence

Hiện chưa có `frontend/e2e/accessibility-reports/after/`. Các issue trong audit document cũng ghi `After evidence: Pending remediation and re-scan`.

Shared components đã được sửa một phần, nhưng chỉ nhìn code changes không thể thay cho:

- chạy lại Axe/Pa11y;
- lưu after report;
- so sánh before/after;
- keyboard interaction đầy đủ;
- Safari + VoiceOver manual verification.

Quy trình command chi tiết, bao gồm nơi sinh runtime report, cách tạo Pa11y
`before`/`after` và cảnh báo không ghi đè Axe baseline, nằm trong mục
“Quản lý vòng đời report: runtime, before và after” của
`frontend/e2e/ACCESSIBILITY_TESTING.md`.

---

## 8. Trace từ baseline issue đến code fix

### A11Y-BL-001 — Auth input labels

```text
Pa11y auth findings
    ↓
Input/Select/Textarea và form-control label contract
    ↓
htmlFor + id + aria-describedby + aria-invalid
    ↓
shared-ui-accessibility.test.tsx
```

File bắt đầu đọc: `Input.tsx`.

### A11Y-BL-002 — Password toggle

```text
Axe button-name + source observation tabindex=-1
    ↓
PasswordInput.tsx
    ↓
button trở lại tab order
aria-label Show/Hide password
aria-pressed
decorative Eye icon hidden
    ↓
password visibility regression test
```

Đây là trace rõ nhất để học cách chuyển từ report sang root cause rồi sang regression test.

### A11Y-BL-003 — Price inputs

Issue nằm ở page-level price filter. Shared form foundation giúp thiết lập contract, nhưng cần đọc/sửa consumer page trong Flow 1 để xác nhận hai input có tên riêng “Minimum price” và “Maximum price”. Phase 0 shared changes chưa tự động chứng minh issue này đã đóng.

### A11Y-BL-004 — Contrast

Không có after evidence trong Phase 0. Đây vẫn là open baseline issue theo audit.

### A11Y-BL-005 — Page title

`ScrollToTop.tsx` cập nhật title sau pathname change dựa trên `h1`. Tuy nhiên:

- initial navigation và routes không có `h1` cần được kiểm tra riêng;
- checkout title findings cần re-scan;
- title logic dựa vào visible heading nên vẫn cần đối chiếu metadata/SEO component.

Regression hiện cover pathname change trong `ScrollToTop.test.tsx`.

### A11Y-BL-006 — List structure

Đây là Course Detail page markup issue. Không có course-detail page remediation trong danh sách Phase 0 changes hiện tại, nên issue vẫn cần xử lý ở Flow 1.

---

## 9. Những điều Phase 0 hiện chứng minh được

Có thể nói:

- accessibility dependencies và npm scripts đã được bổ sung;
- JSX accessibility lint đã được cấu hình cho user app/UI library;
- có shared Playwright Axe/keyboard utilities và utility regression tests;
- có deterministic local fixtures, auth state và API-write protection;
- có Pa11y runner cho chín public/auth URLs;
- có Axe + keyboard baseline collector cho cùng chín route;
- có committed Axe “before” evidence và root-cause issue log;
- shared layouts/components đã có một vòng remediation cùng unit-level accessibility contracts.

Không nên nói:

- “Phase 0 pass WCAG 2.2 AA”;
- “bốn flow đã accessible”;
- “keyboard issues bằng 0 nên keyboard navigation hoàn toàn đạt”;
- “Axe/Pa11y không báo lỗi nghĩa là VoiceOver sẽ hoạt động đúng”;
- “shared component test pass nghĩa là mọi consumer page đã dùng component đúng”.

---

## 10. Gaps và trạng thái cần nhớ trước Phase 1

1. Baseline document đang ở trạng thái `DOES NOT CONFORM`.
2. Chưa có committed `after/` evidence.
3. Pa11y generated results bị Git ignore; chúng là local/CI artifacts chứ chưa phải committed baseline.
4. `lint:a11y` baseline còn nhiều findings, một phần nằm ngoài chín route.
5. Baseline keyboard snapshot chỉ kiểm tra initial tab traversal, chưa cover:
   - `Shift+Tab`;
   - form validation;
   - modal/drawer;
   - route focus restoration trong browser flow thật;
   - responsive states;
   - tabs/menu interaction đầy đủ.
6. Các scripts theo flow tồn tại, nhưng flow-level tests sẽ được bổ sung trong các phase tương ứng.
7. CI workflow accessibility gate chưa xuất hiện trong nhóm file changes này.
8. Safari + VoiceOver, zoom 200%/400%, forced colors, reduced motion và content verification vẫn cần manual work.
9. Các issue page-specific như price filters, contrast và course-detail list không được tự động đóng chỉ vì shared foundation đã thay đổi.

---

## 11. Checklist tự kiểm tra sau khi đọc xong

Nếu đã hiểu implementation, bạn nên giải thích được các câu sau mà không cần đọc lại toàn bộ repo:

- Vì sao Pa11y chỉ scan URL ổn định còn Axe được dùng cho interactive state?
- Vì sao baseline collector không gọi `checkA11y()`?
- Vì sao report có `scanError` không được coi là pass?
- Vì sao `axeViolations` và `seriousNodes` là hai đơn vị khác nhau?
- Fixture ngăn ghi vào backend như thế nào?
- Vì sao password toggle cũ là blocker dù keyboard snapshot báo 0 issue?
- `aria-describedby` nối helper text và error ra sao?
- Khi nào dùng `role="alert"` và khi nào dùng `role="status"`?
- Vì sao Skeleton cần bị loại khỏi accessibility tree?
- Route change chuyển focus đến đâu và query-string-only change có làm vậy không?
- “Before evidence”, generated runtime artifact và “after evidence” khác nhau thế nào?
- Tại sao automated scan không thay thế Safari + VoiceOver?

Nếu trả lời được các câu này, bạn đã nắm được kiến trúc Phase 0 thay vì chỉ nhớ tên file.

---

## 12. Cheat sheet: khi gặp một vấn đề thì mở file nào?

| Câu hỏi | File mở đầu tiên |
|---|---|
| Phase 0 yêu cầu gì? | `4-flow-a11y.md`, mục 2 |
| Baseline đang có lỗi gì? | `frontend/e2e/BASELINE_ACCESSIBILITY_AUDIT.md` |
| Route nào có critical/serious? | `frontend/e2e/accessibility-reports/before/summary.json` |
| Node cụ thể bị lỗi ở đâu? | `frontend/e2e/accessibility-reports/before/<route>.json` |
| Chạy test bằng command nào? | `frontend/e2e/ACCESSIBILITY_TESTING.md` |
| Axe gate hoạt động thế nào? | `frontend/e2e/utils/accessibility.ts` |
| Keyboard helper hoạt động thế nào? | `frontend/e2e/utils/accessibility.ts` |
| Utility được test ra sao? | `frontend/e2e/tests/user/accessibility-utils.spec.ts` |
| Pa11y scan routes nào? | `frontend/e2e/pa11y/config.cjs` |
| API mock trả dữ liệu gì? | `frontend/e2e/pa11y/fixtures.cjs` |
| Pa11y tạo report thế nào? | `frontend/e2e/pa11y/run.cjs` |
| Axe before report được sinh thế nào? | `frontend/e2e/tests/user/baseline-a11y.spec.ts` |
| Label/error form được nối ra sao? | `frontend/libs/user/ui/src/lib/Form/Input.tsx` |
| Dialog/tabs contract ra sao? | `Modal.tsx`, `ConfirmDialog.tsx`, `Tabs.tsx` |
| Shared remediation được bảo vệ bởi test nào? | `shared-ui-accessibility.test.tsx` |
| Route focus/title được xử lý ở đâu? | `ScrollToTop.tsx` và test tương ứng |

Reading path ngắn nhất để ôn lại sau này:

```text
4-flow-a11y.md mục 2
  → BASELINE_ACCESSIBILITY_AUDIT.md
  → before/summary.json
  → accessibility.ts
  → baseline-a11y.spec.ts
  → shared-ui-accessibility.test.tsx
  → component cụ thể đang điều tra
```
