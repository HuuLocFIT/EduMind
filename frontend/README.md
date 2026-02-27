# 🧠 EduMind Frontend Monorepo

> **Status:** 🚀 Active Development
> **Monorepo Strategy:** [Nx](https://nx.dev)
> **Engine:** Node.js v24+

Welcome to the **EduMind** frontend repository. This workspace follows a unified monorepo architecture, housing both the **React-based User Platform** and the **Angular-based Admin Console**, backed by shared TypeScript libraries.

---

## 🛠 Technology Stack

We leverage a modern, bleeding-edge stack to ensure performance, scalability, and developer experience.

| Domain | Technology | Version |
| :--- | :--- | :--- |
| **Monorepo** | Nx | v22 |
| **User App** | React + Vite | v19 / v7 |
| **Admin App** | Angular | v20 |
| **Language** | TypeScript | v5.9 |
| **Styling** | Tailwind CSS | v3.4 |
| **Testing** | Vitest | v3.0 |

### 🎓 User Application (`apps/user`)
A high-performance consumer-facing learning platform.

- **Core**: React 19, Vite, TypeScript.
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) (Client state), [TanStack Query v5](https://tanstack.com/query) (Server state).
- **Forms & Validation**: React Hook Form + Zod.
- **UI System**: Tailwind CSS, Headless UI, Lucide React (Icons).
- **Utilities**: Date-fns, Axios, JWT Decode.
- **Testing**: Vitest (Unit/Integration).

### 🛡️ Admin Application (`apps/admin`)
A robust enterprise management console.

- **Core**: Angular 20 (Zone.js enabled).
- **Reactive Programming**: RxJS 7.8.
- **Architecture**: Modular layout with separation of Core, Features, and Layouts.
- **Bundler**: Angular CLI (@angular/build).

---

## 🏗 Architecture & Path Aliases

This project uses **strict module boundaries**, **workspace libraries**, and **path aliases** to maintain clean imports and separation of concerns.

### Path Mapping
Instead of deep relative imports (`../../../../`), we use explicit path aliases defined in `tsconfig.base.json`:

| Alias | Resolves To | Purpose |
| :--- | :--- | :--- |
| **Shared Libs** | | |
| `@edumind/shared-types` | `libs/shared/types/src` | Zod schemas & shared DTOs |
| `@edumind/shared-constants` | `libs/shared/constants/src` | Global config & constants |
| `@edumind/shared-utils` | `libs/shared/utils/src` | Env config, helpers, routes, API helpers |
| `@edumind/user-ui` | `libs/user/ui/src` | Shared React UI components |
| **User App** | | |
| `@user/stores` | `apps/user/src/app/stores` | Zustand stores |
| `@user/services` | `apps/user/src/app/services` | API clients (`apiClient`, domain services) |
| `@user/components` | `apps/user/src/app/components` | Reusable UI atoms & compounds |
| `@user/pages` | `apps/user/src/app/pages` | Route-level views |
| **Admin App** | | |
| `@admin/core` | `apps/admin/src/app/core` | Guards, interceptors, singleton services |
| `@admin/features` | `apps/admin/src/app/features` | Lazy-loaded smart modules |
| `@admin/layouts` | `apps/admin/src/app/layouts` | Layout components |

### User App Architecture (React, `apps/user`)

**Directory layout (simplified):**

```text
apps/user/src/app/
├── services/        # HTTP/API services (all Axios calls via apiClient)
├── stores/          # Zustand stores (UI + auth/cart orchestration only)
├── components/      # Reusable presentational/compound components
├── layouts/         # App-wide layouts (auth, main, teacher)
├── pages/           # Route-level pages (public, dashboard, learning, teacher, payment)
└── lib/             # Query client/config, query keys, shared infra
```

- **State management**:
  - **TanStack Query v5** for all server-side data (courses, lessons, orders, payouts, etc.).
  - **Zustand** only for client/UI state (auth snapshot, cart state, modals, layout toggles).
- **API layer**:
  - All HTTP traffic goes through `api-client.service.ts` and domain services in `services/`.
  - `@edumind/shared-utils` provides `API_URL`, endpoint constants, and helpers like `unwrapApiResponse`.
- **Routing**:
  - Central router in `app.tsx`, with lazy-loaded pages and guards (`ProtectedRoute`, teacher guards).
- **AI & streaming**:
  - AI learning features (chat, summaries, quizzes) use streaming endpoints and SSE helpers in `services/` and `components/learning/`.

For reference-quality patterns, see:
- `apps/user/src/app/services/auth.service.ts`
- `apps/user/src/app/pages/auth/LoginPage.tsx`

### Admin App Architecture (Angular, `apps/admin`)

**Directory layout (simplified):**

```text
apps/admin/src/app/
├── core/              # Guards, interceptors, singleton services
├── features/          # Lazy-loaded feature areas (auth, courses, categories, teachers, payments)
├── layouts/           # Main shell layout(s)
└── app.routes.ts      # Top-level route configuration
```

- **Feature modules**:
  - Each domain (auth, courses, categories, teachers, payments) lives under `features/` as a coherent module.
  - Components, routes, and services stay co-located inside each feature.
- **Core responsibilities**:
  - Auth, users, payouts, refunds, categories, courses, teacher applications (`core/services`).
  - HTTP interceptors (JWT injection, error handling) and route guards (`core/interceptors`, `core/guards`).
- **Reactive patterns**:
  - HTTP via Angular `HttpClient` + RxJS.
  - Components prefer `async` pipes in templates and focused observables for view-models.

### Shared Libraries

Common, framework-agnostic logic lives in `libs/` and is shared across both apps:

| Library | Path | Purpose |
| :--- | :--- | :--- |
| `@edumind/shared-types` | `libs/shared/types` | Zod schemas + TypeScript types for all DTOs |
| `@edumind/shared-constants` | `libs/shared/constants` | API endpoint constants, global config |
| `@edumind/shared-utils` | `libs/shared/utils` | Env config (`API_URL`), routes, helpers, response unwrapping |
| `@edumind/user-ui` | `libs/user/ui` | Shared React UI primitives for the user app |

---

## 📦 Project Structure

```text
frontend/
├── apps/
│   ├── admin/               # Angular Admin Console
│   └── user/                # React User Platform
├── libs/
│   ├── admin/               # Admin-specific libraries
│   ├── shared/              # Shared logic (types, utils, constants)
│   └── user/                # User-specific libraries
├── tools/                   # Workspace scripts
├── nx.json                  # Nx Configuration
├── package.json             # Root dependencies
└── tsconfig.base.json       # Base TS config & Path Aliases
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v24.x (Checked via `node -v`)
- **Package Manager**: npm (ships with `package-lock.json`)

### Installation
```sh
# Install dependencies
npm install
```

### Environment & Backend Integration

Both frontends talk to the **API Gateway** on `http://localhost:8080` (see backend docs for startup order and routing).

- **User App (React)**:
  - Uses `VITE_API_URL` at build/runtime, wired via `@edumind/shared-utils/env.config`.
  - Create `apps/user/.env` (or `.env.local`) and set:
    - `VITE_API_URL=http://localhost:8080`
- **Admin App (Angular)**:
  - Uses Angular environment files:
    - `apps/admin/src/environments/environment.ts` (dev)
    - `apps/admin/src/environments/environment.prod.ts` (prod)
  - Default dev `apiUrl` is `http://localhost:8080`; adjust per deployment environment.

### Development Server
Run the applications locally:

```sh
# Start User App (http://localhost:3000)
npm run start:user

# Start Admin App (http://localhost:4200)
npm run start:admin

# Start Both (Parallel)
npm start
```

### Quality Checks
```sh
# Run Linting (ESLint 9 + TypeScript-ESLint) for all apps/libs
npm run lint

# Run User App tests (React + Vitest)
npm run test:user

# Run Admin App tests (Angular + Vitest)
npm run test:admin

# Run all tests via Nx (all configured projects)
npm test
```

For deeper testing patterns and examples, see:
- `apps/user/TESTING_GUIDE.md`
- `apps/admin/TESTING_GUIDE.md`

### Build for Production

```sh
# Build only the User App
npm run build:user

# Build only the Admin App
npm run build:admin

# Build all frontend projects in the workspace
npm run build
```

---

## 🤝 Contribution Guidelines

1.  **Strict Typing**: No `any`. Define interfaces in `@edumind/shared-types` if reused.
2.  **State Management**:
    - Use **Zustand** for global client interaction (Sidebar, Modals).
    - Use **TanStack Query** for all API data fetching and caching.
3.  **Components**:
    - **User App**: Favor small, functional components with hooks.
    - **Admin App**: Use standalone components where possible.
4.  **Commits**: Follow conventional commits (e.g., `feat:`, `fix:`, `chore:`).

---

## 📚 Commands Reference

| Command | Action |
| :--- | :--- |
| `npm run start:user` | Start React dev server (`apps/user`, port 3000) |
| `npm run start:admin` | Start Angular dev server (`apps/admin`, port 4200) |
| `npm start` | Run all `serve` targets via Nx (`nx run-many -t serve`) |
| `npm run build:user` | Production build for the React user app |
| `npm run build:admin` | Production build for the Angular admin app |
| `npm run build` | Build all frontend projects (`nx run-many -t build`) |
| `npm run test:user` | Run Vitest tests for the user app |
| `npm run test:admin` | Run Vitest tests for the admin app |
| `npm test` | Run Nx `test` target for all projects |
| `npm run lint` | Lint all apps and libs (`nx run-many -t lint`) |
| `nx serve user` | Serve user app directly via Nx |
| `nx serve admin` | Serve admin app directly via Nx |
| `nx build user` | Build user app directly via Nx |
| `nx build admin` | Build admin app directly via Nx |
| `nx test user` | Run user app tests directly via Nx |
| `nx run-many -t test` | Run tests for all configured projects |
| `nx graph` | Visualize project and dependency graph |
| `nx reset` | Clear the Nx cache (useful if tasks behave unexpectedly) |

