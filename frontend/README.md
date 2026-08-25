# EduMind Frontend

Frontend monorepo for EduMind, containing the public learning platform, teacher workspace, and administration console.

> Status: active development. Both applications are production-buildable; production deployment is intentionally started manually through GitHub Actions. See [Production status](#production-status).

## Applications

| Project | Stack | Development URL | Scope |
| --- | --- | --- | --- |
| [`apps/user`](apps/user/README.md) | React 19, Vite 7 | `http://localhost:3000` | Catalog, authentication, learning, AI tools, checkout, orders, certificates, and teacher workflows |
| [`apps/admin`](apps/admin/README.md) | Angular 20 | `http://localhost:4200` | Dashboard, teacher applications, students, course management and archival, categories, reports, refunds, and payouts |

Internal workspace libraries:

- `@edumind/shared-types`: DTOs and Zod schemas
- `@edumind/shared-constants`: domain constants
- `@edumind/shared-utils`: environment, route, response, date, download, and Cloudinary helpers
- `@edumind/user-ui`: React UI primitives
- `@edumind/admin-ui`: Angular standalone UI components

See [`libs/README.md`](libs/README.md) for their current API surface.

## Technology

| Area | Implementation |
| --- | --- |
| Workspace | Nx 22, npm workspaces |
| Language | TypeScript 5.9 in strict mode |
| User application | React 19, React Router 6, Vite 7 |
| Admin application | Angular 20 standalone components |
| Styling | Tailwind CSS 3.4 |
| Data and state | Axios, TanStack Query 5, Zustand 5, Angular Signals, RxJS 7.8 |
| Forms and validation | React Hook Form, Zod |
| Unit/integration tests | Vitest 3, Testing Library, Angular `TestBed` |
| E2E/accessibility | Playwright, axe-core, pa11y |
| Monitoring | Sentry for React and Angular |

Versions above reflect `package.json` and `package-lock.json`. Treat the lockfile as the authoritative dependency source.

## Prerequisites

- Node.js 24.x (the version used by CI and Vercel)
- npm; do not use pnpm, Yarn, or Bun in this repository
- EduMind API Gateway, normally `http://localhost:8080` for local development

Run every command in this document from `frontend/`.

## Local setup

```bash
npm ci
cp .env.example apps/user/.env
npm run start:user
```

Use `npm install` instead when intentionally changing dependencies. CI and reproducible setup use `npm ci`.

```bash
npm run start:user     # React app on port 3000
npm run start:admin    # Angular app on port 4200
npm start              # all Nx serve targets; long-running
```

### Environment configuration

The React Vite root is `apps/user`, so local Vite env files belong in that directory, for example `apps/user/.env.local`. A root-level `frontend/.env` is not loaded by the current Vite configuration.

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_URL` | Yes | API Gateway base URL |
| `VITE_APP_URL` | No | Public user-app URL used for canonical/SEO URLs; production fallback is built into the app |
| `VITE_SENTRY_DSN_USER` | Production monitoring only | Sentry DSN for the user application |
| `VITE_APP_VERSION` | No | Release identifier injected by release CI |

The Angular application uses compile-time files:

- `apps/admin/src/environments/environment.ts` for development
- `apps/admin/src/environments/environment.prod.ts` for production through Angular file replacement

They configure the API URL, Sentry, environment name, and version. Changing the production endpoint requires rebuilding the admin application.

For E2E, copy `.env.e2e.example` to `.env.e2e` and provide dedicated student, teacher, and admin accounts. Do not commit populated env files or credentials.

## Architecture

```text
frontend/
├── apps/
│   ├── user/                 # React user and teacher application
│   └── admin/                # Angular administration application
├── libs/
│   ├── shared/               # types, constants, utilities
│   ├── user/ui/              # React component library
│   └── admin/ui/             # Angular component library
├── e2e/                      # Playwright and accessibility suites
├── tools/                    # prerender and sitemap tooling
├── nx.json
├── package.json
└── tsconfig.base.json        # compiler options and path aliases
```

### User application

- Routes live in `apps/user/src/app/app.tsx`. Most route pages are lazy-loaded; home and not-found are eager-loaded.
- Domain services under `apps/user/src/app/services` use the shared Axios client.
- TanStack Query manages server state. Zustand manages authentication and client/UI workflows such as cart, checkout, chat, and uploads.
- Authentication stores the access token in `localStorage`; the backend supplies the refresh token as an HttpOnly cookie. The Axios interceptor coalesces concurrent refresh attempts.
- Implemented areas include catalog and enrollment, lesson progress, quizzes and AI learning tools, wishlist, cart/checkout, PayPal and Sepay flows, orders/refunds/invoices, certificates, teacher course management, analytics, earnings, and payouts.

See [`apps/user/README.md`](apps/user/README.md) for the detailed route, service, state, and feature inventory.

### Admin application

- The app bootstraps through Angular standalone APIs and has no application `NgModule`.
- `apps/admin/src/app/app.routes.ts` lazy-loads feature components.
- A functional HTTP interceptor adds authentication, unwraps API envelopes, and coordinates token refresh.
- Angular Signals hold local view state; RxJS handles HTTP and cross-request coordination.
- Guards protect the main layout, and login rejects users without the admin role.

See [`apps/admin/README.md`](apps/admin/README.md) for feature and HTTP-layer details.

### Boundaries and validation

TypeScript aliases are defined in `tsconfig.base.json`; application aliases use wildcard forms such as `@user/services/*` and `@admin/core/*`. Public libraries are imported through their `@edumind/*` entry points. Nx and ESLint enforce both domain scope and library layer for every frontend project:

| Source | Allowed dependencies |
| --- | --- |
| `scope:user` | `scope:user`, `scope:shared` |
| `scope:admin` | `scope:admin`, `scope:shared` |
| `scope:shared` | `scope:shared` |
| `type:app` | `type:ui`, `type:types`, `type:constants`, `type:util` |
| `type:ui` | `type:ui`, `type:types`, `type:constants`, `type:util` |
| `type:util` | `type:util`, `type:types`, `type:constants` |
| `type:types` | `type:types`, `type:constants` |
| `type:constants` | `type:constants` |

Both constraints apply to an import. This prevents User and Admin code from depending on each other, prevents shared libraries from depending on application-specific code, and prevents libraries from importing applications.

Runtime validation is risk-based rather than universal. New or materially changed boundaries must validate external or otherwise untrusted payloads at runtime, with priority given to authentication, payments, AI, browser-persisted state, and responses likely to change independently of the frontend. SSE events, uploads, and direct third-party responses require boundary-specific validation based on their failure and compatibility risks. Internal, stable, low-risk responses may continue to use strict TypeScript contracts.

This is the direction for new and changed code, not a claim that every existing high-risk path has already been migrated. The current inventory confirms broad schema coverage for payment and non-streaming AI responses, while auth refresh and persisted state, AI SSE metadata, upload persistence, and direct Cloudinary/upload responses still have uneven runtime coverage. Those paths should be hardened only with their backend contracts, compatibility behavior, and failure UX verified; completing that migration is intentionally outside the README work. See [`../docs/known-limitations.md`](../docs/known-limitations.md#runtime-validation-policy) for the inventory and adoption policy.

## Quality checks

### Lint and type checking

```bash
npm run lint
npm run lint:a11y
npx nx typecheck user
```

### Unit and integration tests

```bash
npm run test:user
npm run test:user:watch
npm run test:user:coverage
npm run test:admin
npm run test:admin:watch
npm run test:admin:coverage
npm test
```

Focused user test with Vitest:

```bash
npx vitest run --root apps/user src/app/services/auth.service.test.ts
```

Or through Nx, using a path relative to `apps/user`:

```bash
NX_DAEMON=false NX_ISOLATE_PLUGINS=false \
  npx nx test user src/app/services/auth.service.test.ts
```

The explicit Nx flags support sandboxed environments where daemon/plugin-worker IPC is unavailable.

Current coverage is uneven: user tests cover several core and accessibility flows, while admin tests are concentrated in authentication. Coverage reports exist, but no minimum threshold is enforced.

### End-to-end tests

E2E requires the backend and configured accounts. Playwright starts the frontend development servers defined by its configuration.

```bash
npm run e2e
npm run e2e:user
npm run e2e:admin
npm run e2e:ui
npm run e2e:report
```

See [`e2e/E2E_TESTING_GUIDE.md`](e2e/E2E_TESTING_GUIDE.md).

### Accessibility

```bash
npm run test:a11y
npm run test:a11y:public
npm run test:a11y:auth
npm run test:a11y:purchase
npm run test:a11y:learning
npm run test:a11y:utilities
npm run pa11y
npm run pa11y:ci
```

See [`e2e/ACCESSIBILITY_TESTING.md`](e2e/ACCESSIBILITY_TESTING.md) and [`e2e/BASELINE_ACCESSIBILITY_AUDIT.md`](e2e/BASELINE_ACCESSIBILITY_AUDIT.md).

## Production builds

```bash
npm run build:user        # dist/apps/user
npm run build:user:full   # build plus SEO prerender
npm run build:admin       # dist/apps/admin/browser
npm run build             # all build targets
```

Both production builds emit source maps locally. The release workflow uploads and then deletes them from its artifacts.

`build:user:full` runs Puppeteer after the normal build. It prerenders static routes and fetches course slugs from `VITE_API_URL`. Production builds require this variable and fail if the API or TLS verification fails, preventing fallback/error HTML from being deployed.

The Angular application builder places the deployable browser artifact in `dist/apps/admin/browser`. Static hosting must provide SPA fallback routing.

## Deployment and CI

Workflows live in `.github/workflows`:

| Workflow | Trigger | Current behavior |
| --- | --- | --- |
| `frontend-ci.yml` | Every PR; heavy jobs only when frontend paths change | Detects relevant changes, then runs lint, test, build, accessibility, and a stable required summary check |
| `frontend-release.yml` | Manual dispatch | Validates the current `main` HEAD, builds both projects with Vercel production settings, uploads Sentry source maps, removes maps, and deploys the prebuilt outputs |
| `frontend-seo-rebuild.yml` | Manual dispatch | Backup trigger for the user portal deploy hook; cron-job.org invokes the same hook daily at 02:00 |

Production code releases are deliberately manual. The user project remains
connected to Git because its deploy hook rebuilds dynamic prerendered content;
`git.deploymentEnabled: false` prevents ordinary commits from auto-deploying.
The admin project can remain disconnected and deploy only through Vercel CLI.

### User hosting

`vercel.json` defines user-portal SPA rewrites, immutable caching for `/assets/*`, and baseline `X-Content-Type-Options` and `Referrer-Policy` headers. `vercel-build.sh` installs Chromium requirements and runs the user prerender target. `vercel.admin.json` provides the admin SPA fallback and security headers.

### Monitoring

Both apps initialize Sentry before application bootstrap. Release source maps are uploaded when GitHub Actions has the required Sentry credentials. The user DSN comes from `VITE_SENTRY_DSN_USER`; admin production settings are compiled from `environment.prod.ts`.

## Production status

Known limitations in the current implementation:

- Production releases require the two Vercel projects and GitHub repository configuration described in the CI/CD runbook.
- No frontend container image is defined; hosting is static-site oriented.
- Automated coverage is uneven and has no enforced threshold.
- AI chat enables raw HTML through `rehype-raw`; unlike the article viewer, it does not currently sanitize that HTML with DOMPurify. Treat this as a hardening item before accepting untrusted HTML-generating sources.

## Contribution rules

- Keep TypeScript strict and avoid `any` unless a documented integration boundary requires it.
- Put reusable API contracts in `@edumind/shared-types`. Runtime-validate new or materially changed untrusted and high-risk boundaries according to the policy above; do not add universal parsing to stable, low-risk responses solely for consistency.
- Keep HTTP access in domain services, not components.
- Use TanStack Query for React server state and Zustand for client/UI workflows.
- Preserve lazy loading for non-critical route pages.
- Add or update tests with behavior changes.
- Use Conventional Commit prefixes such as `feat:`, `fix:`, `test:`, `docs:`, and `chore:`.

## Command reference

| Command | Purpose |
| --- | --- |
| `npm run start:user` | Start React development server |
| `npm run start:admin` | Start Angular development server |
| `npm start` | Start all serve targets |
| `npm run build:user` | Build React application |
| `npm run build:user:full` | Build and prerender React application |
| `npm run build:admin` | Build Angular application |
| `npm run build` | Build all projects |
| `npm run test:user` | Test React application |
| `npm run test:admin` | Test Angular application |
| `npm test` | Test all projects |
| `npm run lint` | Lint configured projects |
| `npm run lint:a11y` | Run JSX accessibility linting |
| `npm run e2e` | Run all Playwright projects |
| `npm run graph` | Open Nx dependency graph |
| `npm run reset` | Reset Nx state and cache |
