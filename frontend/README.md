# 🧠 EduMind Frontend Monorepo

> **Status:** 🚀 Active Development
> **Monorepo Strategy:** [Nx](https://nx.dev)
> **Engine:** Node.js v24+

Welcome to the **EduMind** frontend repository. This workspace follows a unified monorepo architecture, housing both the **React-based User Platform** and the **Angular-based Admin Console**, backed by shared TypeScript libraries.

---

## 🛠 Technology Stack

We leverage a modern, bleeding-edge stack to ensure performance, scalability, and developer experience.

| Domain | Technnology | version |
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

This project uses **Strict Module Boundaries** and **Path Aliases** to maintain clean imports and separation of concerns.

### Path Mapping
Instead of deep relative imports (`../../../../`), we use explicit path aliases defined in `tsconfig.base.json`:

| Alias | Resolves To | Purpose |
| :--- | :--- | :--- |
| **Shared Libs** | | |
| `@edumind/shared-types` | `libs/shared/types` | Shared interfaces & DTOs |
| `@edumind/shared-constants` | `libs/shared/constants` | Global config & constants |
| `@edumind/shared-utils` | `libs/shared/utils` | Helper functions |
| **User App** | | |
| `@user/stores` | `apps/user/.../stores` | Zustand stores |
| `@user/services` | `apps/user/.../services` | API clients |
| `@user/components` | `apps/user/.../components` | Reusable UI atoms |
| `@user/pages` | `apps/user/.../pages` | Route views |
| **Admin App** | | |
| `@admin/core` | `apps/admin/.../core` | Guards, Interceptors, Singleton services |
| `@admin/features` | `apps/admin/.../features` | Lazy-loaded smart modules |

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
# Run Linting (ESLint 9 + Typescript-ESLint)
npm run lint

# Run Tests (Vitest)
npm run test:user
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
| `nx serve user` | Start React Dev Server |
| `nx serve admin` | Start Angular Dev Server |
| `nx build user` | Build React App for Production |
| `nx build admin` | Build Angular App for Production |
| `nx test user` | Run Vitest Unit Tests |
| `nx graph` | Visualize Module Dependencies |
