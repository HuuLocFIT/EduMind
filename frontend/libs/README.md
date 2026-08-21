# Frontend Shared Libraries

This directory contains all shared libraries consumed by both the React user app (`apps/user`) and Angular admin app (`apps/admin`). Libraries are managed as Nx projects and resolved via TypeScript path aliases — no publishing or symlinking required during development.

---

## Library Index

| Package | Path | Consumers | Purpose |
|---------|------|-----------|---------|
| [`@edumind/shared-types`](#edumindshared-types) | `shared/types` | Both apps | Zod schemas + inferred TypeScript types for all domain models |
| [`@edumind/shared-constants`](#edumindshared-constants) | `shared/constants` | Both apps | Enum-like constant objects (roles, statuses, payment methods) |
| [`@edumind/shared-utils`](#edumindshared-utils) | `shared/utils` | Both apps | API helpers, endpoint maps, route constants, date/download utilities |
| [`@edumind/user-ui`](#eduminduser-ui) | `user/ui` | React app only | Reusable React component library (Tailwind + Headless UI) |
| [`@edumind/admin-ui`](#edumindadmin-ui) | `admin/ui` | Angular app only | Reusable Angular standalone component library (Tailwind) |

All path aliases are declared in `frontend/tsconfig.base.json` and forwarded to Vite via `frontend/vite.config.ts`.

---

## `@edumind/shared-types`

> **Rule:** Every API contract and domain model **must** be defined here as a Zod schema. TypeScript types are always inferred from schemas — never written by hand.

### Pattern

```ts
// 1. Define schema
export const CourseSchema = z.object({
  id: z.number(),
  title: z.string(),
  status: z.nativeEnum(CourseStatus),
});

// 2. Export inferred type alongside the schema
export type Course = z.infer<typeof CourseSchema>;
```

### Schema Files

#### Base / Infrastructure

| File | Key Exports |
|------|-------------|
| `base-response.schemas.ts` | `ApiResponse<T>`, `PagedResponse<T>`, `ApiError`, `PaginationMetadata`, `createApiResponseSchema<T>()`, `createPagedResponseSchema<T>()` |
| `file-upload.schemas.ts` | `FileUploadResponse` (publicId, url, fileName, size) |
| `stats.schemas.ts` | `InstructorStatsResponse` (totalCourses, totalStudents, averageRating) |

#### Authentication & Users

| File | Key Exports |
|------|-------------|
| `auth.schemas.ts` | `UserSchema`, `JwtResponseSchema`, `LoginRequestSchema`, `SignupRequestSchema`, `TwoFactorSetupResponseSchema`, `PasswordResetRequestSchema`, `UserRole` enum, `Provider` enum |
| `auth.validation.ts` | `createPasswordSchema()`, `createUsernameSchema()`, `createPhoneNumberSchema()`, `createNumericCodeSchema()`, `createRequiredStringSchema()` |
| `auth.regex.ts` | `USERNAME_REGEX`, `PASSWORD_REGEX` |
| `admin.schemas.ts` | `AdminCreateUserRequest`, `TeacherApplicationRequest`, `TeacherApplicationResponse`, `ReviewApplicationRequest`, `TrialStatusResponse`, `ApplicationStatus` enum |

`auth.validation.ts` exports factory functions for composable field validation. Use them in form schemas rather than duplicating logic:

```ts
import { createPasswordSchema } from '@edumind/shared-types';

const changePasswordSchema = z.object({
  current: createPasswordSchema(),
  next: createPasswordSchema(),
});
```

#### Course & Content

| File | Key Exports |
|------|-------------|
| `course.schemas.ts` | `CourseResponse`, `CourseDetailResponse`, `CreateCourseRequest`, `UpdateCourseRequest`, `CourseLevel` enum, `CourseStatus` enum |
| `section.schemas.ts` | `SectionResponse`, `SectionDetailResponse` (includes lessons array), `CreateSectionRequest`, `UpdateSectionRequest` |
| `lesson.schemas.ts` | `LessonResource`, `CreateLessonRequest`, `UpdateLessonRequest`, `ContentType` enum (`VIDEO`, `ARTICLE`, `QUIZ`, `RESOURCE`) |
| `course-category.schemas.ts` | `CategoryResponse`, `CategoryInCourse`, `CreateCategoryRequest`, `UpdateCategoryRequest` |

#### Enrollment & Progress

| File | Key Exports |
|------|-------------|
| `enrollment.schemas.ts` | `EnrollmentResponse`, `EnrollmentStats`, `EnrollRequest`, `EnrollmentStatus` enum |
| `progress.schemas.ts` | `LessonProgressResponse` (isCompleted, watchDuration, watchPercentage), `UpdateProgressRequest` |

#### Interaction

| File | Key Exports |
|------|-------------|
| `review.schemas.ts` | `ReviewResponse`, `CreateReviewRequest`, `InstructorReplyRequest`, `RatingDistributionResponse`, `InstructorReviewsStatsResponse`, `TeacherReviewFilterParams` |
| `wishlist.schemas.ts` | `WishlistItemResponse`, `WishlistPagedResponse` |

#### Commerce

| File | Key Exports |
|------|-------------|
| `cart.schemas.ts` | `CartResponse` (with pricing breakdown), `CartItemResponse`, `AddToCartRequest` |
| `checkout.schemas.ts` | `CheckoutPreviewResponse`, `CheckoutResultResponse`, `CheckoutRequest`, `DirectCheckoutRequest`, `PaymentMethod` enum, `OrderStatus` enum |
| `order.schemas.ts` | `OrderResponse`, `OrderSummaryResponse`, `OrderItemResponse`, `TransactionResponse`, `OrderCountResponse` |
| `invoice.schemas.ts` | `InvoiceResponse`, `InvoicePagedResponse`, `InvoiceStatus` enum |
| `earning.schemas.ts` | `EarningResponse`, `EarningsSummaryResponse`, `MonthlyEarningResponse`, `CourseEarningResponse`, `EarningStatus` enum |
| `refund.schemas.ts` | `RefundRequest`, `RefundResponse`, `RefundPolicyResponse`, `AdminRefundApproveRequest`, `AdminRefundRejectRequest` |
| `payout.schemas.ts` | `PayoutResponse`, `PayoutSummaryResponse`, `PayoutSettings`, `CreatePayoutRequest`, `PayoutStatus` enum |

#### AI

| File | Key Exports |
|------|-------------|
| `ai.schemas.ts` | `AiJobResponseSchema`, `AiJobStatus` enum, `GeneratedQuizResponse`, `QuizQuestionDto`, `GenerateQuizRequest`, `SubmitQuizAttemptRequest`, `QuizAttemptResponse`, `LessonSummaryResponse`, `VocabularyItem`, `ChatRequest`, `ChatResponse`, `SourceLessonDto`, `ConversationTurn`, `TranscribeRequest` |

`QuizQuestionDto` has nullable `correctIndex` and `explanation` — these are `null` in the student-facing view before submission and populated only in the post-attempt review response.

---

## `@edumind/shared-constants`

> **Rule:** Never hardcode role strings or status values inline. Import from this library.

### `auth.constant.ts`

```ts
export const UserRole = {
  STUDENT:       'ROLE_STUDENT',
  TEACHER:       'ROLE_TEACHER',
  TEACHER_TRIAL: 'ROLE_TEACHER_TRIAL',
  ADMIN:         'ROLE_ADMIN',
} as const;

export const PROVIDER = {
  LOCAL:    'LOCAL',
  GOOGLE:   'GOOGLE',
  FACEBOOK: 'FACEBOOK',
} as const;
```

### `course.constant.ts`

```ts
ContentType      // VIDEO | ARTICLE | QUIZ | RESOURCE
CourseLevel      // BEGINNER | INTERMEDIATE | ADVANCED | ALL_LEVELS
CourseStatus     // DRAFT | PUBLISHED | ARCHIVED
EnrollmentStatus // ACTIVE | COMPLETED | SUSPENDED | EXPIRED | DROPPED
```

### `payment.constant.ts`

```ts
PaymentMethod       // FREE | MOCK | PAYPAL | SEPAY
OrderStatus         // PENDING | PROCESSING | COMPLETED | FAILED | REFUNDED | CANCELLED
TransactionStatus   // PENDING | SUCCESS | FAILED | REFUNDED | CANCELLED | EXPIRED
EarningStatus       // PENDING | AVAILABLE | PAID | REFUNDED
InvoiceStatus       // GENERATED | SENT | VIEWED
RefundStatus        // PENDING | APPROVED | AWAITING_MANUAL_REFUND | REJECTED | COMPLETED | FAILED
PayoutStatus        // PENDING | PROCESSING | AWAITING_MANUAL_PAYOUT | COMPLETED | FAILED
PayoutMethod        // BANK_TRANSFER | PAYPAL
```

---

## `@edumind/shared-utils`

### `api-response.helper.ts`

Utilities for unwrapping the `ApiResponse<T>` envelope returned by all backend endpoints.

| Export | Signature | Description |
|--------|-----------|-------------|
| `isApiResponseEnvelope` | `(payload: unknown) => boolean` | Type guard: checks for `status: number` + `success: boolean` |
| `hasPagination` | `(payload) => payload is PagedResponse` | Type guard: checks for `pagination` key |
| `toMessageShape` | `(payload) => { message, status, success }` | Extracts status fields from any envelope |
| `unwrapApiResponse` | `(payload: unknown) => unknown` | Returns `data` if present; full response if paginated; message shape otherwise |

`unwrapApiResponse` is called automatically by `apiClient` interceptors in the apps — you should not need to call it manually in most cases.

### `api-endpoints.ts`

Single source of truth for all API paths. Every constant group is a `const` object to enable IDE autocomplete and prevent string typos.

```ts
// Static path
COURSE_ENDPOINTS.LIST                   // '/api/courses'

// Dynamic path (function)
COURSE_ENDPOINTS.DETAIL(courseId)       // '/api/courses/42'
AI_ENDPOINTS.CHAT_STREAM(courseId)      // '/api/ai/chat/courses/42/stream'
```

| Constant | Coverage |
|----------|----------|
| `AUTH_ENDPOINTS` | Login, signup, logout, refresh, 2FA, OAuth2, password reset, email verification |
| `USER_ENDPOINTS` | Profile, avatar, change password |
| `TEACHER_PORTAL_ENDPOINTS` | Course create, update, publish, and archive; section and lesson management; student list; reviews |
| `COURSE_ENDPOINTS` | Public course listing, search, filter, detail, publish, and archive |
| `CATEGORY_ENDPOINTS` | CRUD + toggle status |
| `ENROLLMENT_ENDPOINTS` | My enrollments, check, suspend, activate |
| `LESSON_PROGRESS_ENDPOINTS` | Start, watch, complete |
| `REVIEW_ENDPOINTS` | Course reviews, instructor reviews, rating distribution |
| `WISHLIST_ENDPOINTS`, `CART_ENDPOINTS` | Wishlist/cart management |
| `CHECKOUT_ENDPOINTS`, `ORDER_ENDPOINTS` | Checkout flow |
| `INVOICE_ENDPOINTS` | Download, view, list |
| `EARNING_ENDPOINTS`, `PAYOUT_ENDPOINTS`, `REFUND_ENDPOINTS` | Teacher financials |
| `ADMIN_ENDPOINTS` | User, admin course listing, teacher and student management; applications |
| `AI_ENDPOINTS` | Quiz generation, job polling, chat stream, transcription, summaries |

Helper functions:

```ts
buildApiUrl(endpoint, baseUrl?)    // Prepends API base URL
getOAuth2Url(provider, baseUrl?)   // Returns full redirect URL for OAuth2
```

### `routes.config.ts`

Route path constants for both apps. Use these whenever navigating programmatically instead of hardcoding strings.

```ts
USER_ROUTES.COURSE_DETAIL           // '/courses/:courseId'
TEACHER_ROUTES.COURSE_EDIT          // '/teacher/courses/:courseId/edit'
ADMIN_ROUTES.TEACHER_APPLICATIONS   // '/teachers/applications'
```

Dynamic route helpers:

```ts
UserRouteHelpers.courseDetail(42)           // '/courses/42'
TeacherRouteHelpers.courseEdit(42, 'info')  // '/teacher/courses/42/edit?tab=info'
buildRoute('/courses', { page: 2, size: 10 })
buildRouteWithParams('/courses/:courseId', { courseId: 42 })
```

### `date.helper.ts`

All functions accept `string | Date | number`. Backed by `date-fns`.

| Function | Output example |
|----------|----------------|
| `formatDate(value)` | `Jan 15, 2026` |
| `formatDateTime(value)` | `Jan 15, 2026, 3:45 PM` |
| `formatDateCompact(value)` | `01/15/26` |
| `formatTimeAgo(value)` | `2 days ago` |
| `formatTimeAgoSmart(value)` | `Today` / `Yesterday` / `5 days ago` / full date |
| `formatMonthYear(value)` | `January 2026` |
| `formatISODate(value)` | `2026-01-15` |

### `download.helper.ts`

| Function | Description |
|----------|-------------|
| `downloadBlob(blob, filename)` | Creates object URL and triggers browser download |
| `downloadFromUrl(url, filename?)` | Downloads from a remote URL with optional renamed filename |
| `base64ToBlob(base64, mimeType)` | Converts base64 string to `Blob` |
| `downloadBase64(base64, filename, mimeType)` | Downloads a base64-encoded file |

### `auth.helper.ts`

| Function | Signature | Description |
|----------|-----------|-------------|
| `getUserDisplayName<T>` | `(user: T) => string` | Returns `firstName lastName`; falls back to `username`, then `email` |
| `getPrimaryRole<T>` | `(user: T) => UserRole` | Returns first entry from `user.roles` |
| `isTrialExpired<T>` | `(user: T) => boolean` | Checks if `user.trialExpiry` is in the past |
| `getPasswordStrength` | `(password: string) => { score, label, color }` | Strength meter for UI feedback |

### `env.config.ts`

```ts
export const API_URL: string;   // from VITE_API_URL — required at runtime
export const isDev: boolean;
export const isProd: boolean;
```

---

## `@edumind/user-ui`

> React 19 component library. Tailwind CSS for styling, `clsx` for conditional class merging, `lucide-react` for icons. All form components use `React.forwardRef`.

### Buttons

```tsx
import { Button, IconButton } from '@edumind/user-ui';

<Button variant="primary" size="md" isLoading leftIcon={<PlusIcon />}>
  Create Course
</Button>

<IconButton icon={<TrashIcon />} variant="danger" size="sm" />
```

**`Button` props:** `variant` (`primary | secondary | outline | ghost | danger`), `size` (`sm | md | lg`), `isLoading`, `leftIcon`, `rightIcon`, `fullWidth`. Extends native `<button>` attributes.

### Forms

```tsx
import { Input, Textarea, Select, Checkbox, Switch, Radio, PasswordInput } from '@edumind/user-ui';

<Input
  label="Email"
  error={errors.email?.message}
  helperText="We'll never share your email"
  leftIcon={<MailIcon />}
  fullWidth
  {...register('email')}
/>
```

All form components:
- Accept a `label`, `error`, and `helperText` prop for consistent field layout
- Use `forwardRef` — compatible with React Hook Form's `register` and `Controller`
- Apply `aria-invalid` and `aria-describedby` automatically when `error` is set

### Cards

```tsx
import { Card, CardHeader, CardBody, CardFooter, StatCard } from '@edumind/user-ui';

<Card variant="elevated" padding="lg">
  <CardHeader>Course Overview</CardHeader>
  <CardBody>...</CardBody>
  <CardFooter>...</CardFooter>
</Card>

<StatCard title="Total Students" value={1240} change={+12.4} />
```

**`Card` props:** `variant` (`default | bordered | elevated`), `padding` (`none | sm | md | lg`).

### Feedback

```tsx
import { Alert, useToast } from '@edumind/user-ui';

<Alert variant="error" title="Upload failed" onClose={handleClose}>
  File size exceeds the 25 MB limit.
</Alert>

// Toast (hook)
const { showToast } = useToast();
showToast({ variant: 'success', message: 'Course published.' });
```

`ToastContainer` must be rendered once at the app root. `useToast` works anywhere inside it.

### Modals

```tsx
import { Modal, useModal } from '@edumind/user-ui';

const { isOpen, open, close } = useModal();

<Modal
  isOpen={isOpen}
  onClose={close}
  title="Confirm deletion"
  size="md"
  closeOnOverlayClick
>
  <p>This cannot be undone.</p>
</Modal>
```

**`Modal` sizes:** `sm | md | lg | xl | 2xl | 3xl | full`.

### Other Components

| Component | Props summary |
|-----------|--------------|
| `RatingStars` | `value`, `onChange?` (interactive), `max` (default 5) |
| `PriceTag` | `price`, `originalPrice?`, `currency` |
| `ProgressBar` | `value` (0–100), `variant`, `showLabel` |
| `Skeleton` | Placeholder block; accepts `width`, `height`, `rounded` |
| `FileUpload` | Drag-and-drop, `accept`, `maxSize`, `onUpload`, `isLoading` |
| `Tabs` | `tabs: { id, label, content }[]`, controlled and uncontrolled modes |
| `Spinner` | Inline spinner; accepts `size` |
| `LoadingOverlay` | Full-viewport overlay with spinner |
| `FullPageLoading` | Full-page screen for initial load |

---

## `@edumind/admin-ui`

> Angular 20 standalone component library. Tailwind CSS. Form components implement `ControlValueAccessor` for seamless integration with Angular Reactive Forms.

### Buttons

```html
<app-button variant="primary" size="md" [isLoading]="saving" (clicked)="submit()">
  Save Changes
</app-button>

<app-icon-button [icon]="trashIcon" variant="danger" />
```

**`ButtonComponent` inputs:** `variant` (`primary | secondary | outline | ghost | danger`), `size` (`sm | md | lg`), `isLoading`, `leftIcon`, `rightIcon`, `fullWidth`, `type` (`button | submit | reset`).
**Output:** `(clicked)` — avoids conflict with native `(click)`.

### Forms

```html
<app-input
  label="Course Title"
  [formControl]="titleControl"
  [error]="titleControl.invalid && titleControl.touched ? 'Required' : ''"
  placeholder="Enter title..."
  [fullWidth]="true"
/>
```

All form components implement `ControlValueAccessor` and accept `[formControl]` / `[formControlName]` directly. No wrapper needed.

| Component | Inputs |
|-----------|--------|
| `InputComponent` | `label`, `type`, `placeholder`, `error`, `helperText`, `required`, `disabled`, `fullWidth`, `leftIcon`, `rightIcon` |
| `TextareaComponent` | Same as Input, plus `rows` |
| `CheckboxComponent` | `label`, `error`, `disabled` |
| `SwitchComponent` | `label`, `disabled` |

### Cards

```html
<app-card variant="bordered" padding="md">
  <app-stat-card title="Revenue" [value]="revenue" [change]="+8.2" />
</app-card>
```

**`CardComponent` inputs:** `variant` (`default | bordered | elevated`), `padding` (`none | sm | md | lg`).
Note: Admin cards use a **dark theme** (`slate-800` background) — do not port these to the user app.

### Data Table

The most complex component in the admin library. Fully generic: `DataTableComponent<T>`.

```html
<app-data-table
  [data]="courses"
  [columns]="columns"
  [loading]="isLoading"
  [selectable]="true"
  (selectionChange)="onSelect($event)"
  (sortChange)="onSort($event)"
  (pageChange)="onPage($event)"
/>
```

**Column definition (`TableColumn<T>`):**

```ts
columns: TableColumn<Course>[] = [
  { key: 'title',     label: 'Title',   sortable: true },
  { key: 'status',    label: 'Status',  template: this.statusTpl },
  { key: 'createdAt', label: 'Created', sortable: true, sticky: 'left', stickyOffset: 0 },
];
```

| Input | Type | Description |
|-------|------|-------------|
| `data` | `T[]` | Row data |
| `columns` | `TableColumn<T>[]` | Column definitions |
| `loading` | `boolean` | Shows skeleton rows when true |
| `selectable` | `boolean` | Enables checkbox selection column |
| `trackBy` | `(index, item: T) => any` | Performance optimization |
| `emptyMessage` | `string` | Custom empty state text |

| Output | Payload | Description |
|--------|---------|-------------|
| `selectionChange` | `T[]` | Emits selected rows |
| `rowClick` | `T` | Emits clicked row |
| `sortChange` | `SortEvent` (`{ key, direction }`) | Emits sort column and direction |
| `pageChange` | `PageEvent` (`{ page, size }`) | Emits page and page size |

### Modals

```html
<app-modal
  [isOpen]="showModal"
  title="Review Application"
  size="lg"
  (close)="showModal = false"
>
  <!-- content -->
  <app-modal-footer>
    <app-button variant="outline" (clicked)="showModal = false">Cancel</app-button>
    <app-button variant="primary" (clicked)="submit()">Approve</app-button>
  </app-modal-footer>
</app-modal>

<app-confirm-dialog
  [isOpen]="confirmOpen"
  title="Delete category?"
  message="This action cannot be undone."
  (confirm)="deleteCategory()"
  (cancel)="confirmOpen = false"
/>
```

### Other Components

| Component | Inputs / Outputs |
|-----------|-----------------|
| `AlertComponent` | `variant` (info/success/warning/error), `title`, `description` |
| `BadgeComponent` | `variant`, `size` |
| `StatusBadgeComponent` | `status` string — maps to color automatically |
| `DropdownMenuComponent` | `items: MenuItem[]`, `trigger` template |
| `EmptyStateComponent` | `title`, `description`, `icon` |
| `SearchBarComponent` | `placeholder`, `debounce`; Output: `search` |
| `SelectComponent` | `options: Option[]`, `label`, `error`; implements CVA |
| `TabsComponent` + `TabPanelComponent` | Declarative tab panels |

---

## Adding to the Libraries

### New domain schema (`shared-types`)

1. Create `shared/types/src/lib/<domain>.schemas.ts`
2. Export both the Zod schema and the inferred type
3. Re-export from `shared/types/src/index.ts`
4. If it has corresponding API calls, add endpoint entries to `shared/utils/src/lib/api-endpoints.ts`

### New route constant (`shared-utils`)

Add to the appropriate `*_ROUTES` object in `shared/utils/src/lib/routes.config.ts`. Add a `*RouteHelpers` entry if the route has dynamic segments.

### New React component (`user-ui`)

1. Create `user/ui/src/lib/<ComponentName>/<ComponentName>.tsx`
2. Export from the appropriate category barrel in `user/ui/src/index.ts`
3. Use `forwardRef` for any component that wraps an input element

### New Angular component (`admin-ui`)

1. Create `admin/ui/src/lib/<component-name>/<component-name>.component.ts` as a standalone component
2. Export from `admin/ui/src/index.ts`
3. Implement `ControlValueAccessor` if it wraps a form control

---

## Build & Test Commands

Run from the `frontend/` directory (parent of this folder).

```bash
# Build individual libs (required before consuming in some contexts)
nx build shared-types
nx build shared-utils
nx build shared-constants
nx build user-ui
nx build admin-ui

# Lint
npm run lint

# Test (libs are covered by app-level test suites)
npm run test:user          # Vitest — React app + shared lib tests
npm run test:admin         # Angular — admin app + lib tests
```

> **Note:** The `user-ui` library has a pre-built `dist/` folder committed to the repository. After making changes to its source, run `nx build user-ui` to regenerate it before the React app will pick up the changes.
