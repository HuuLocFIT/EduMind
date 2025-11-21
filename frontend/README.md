# EduMind Frontend Monorepo

This workspace hosts the **Angular Admin** and **React User** applications plus shared TypeScript libraries, all orchestrated with [Nx](https://nx.dev). Use this guide for consistent onboarding and day-to-day operations.

## Requirements

- Node.js 24+ (prefer using nvm to match the team version) (we use node 24.2.0)
- npm (repo currently ships with `package-lock.json`)
- Local Nx CLI is installed via `npm install`

## Install & Core Commands

```sh
npm install               # run inside frontend/
npm run start:admin       # Angular dev server (http://localhost:4200)
npm run start:user        # React/Vite dev server (runs `nx serve user`)
npm run build             # build everything (leverages Nx caching)
npm run lint              # lint all projects
npm run test              # run tests (currently Vitest, passWithNoTests on)
```

You can run any target directly: `npx nx <target> <project>` (e.g. `npx nx build admin`).

## Projects

| Project | Stack | Tags | Main commands |
| --- | --- | --- | --- |
| `admin` (`apps/admin`) | Angular 20 (`@angular/build`) | `scope:app`,`type:angular` | `nx serve admin`, `nx build admin` |
| `user` (`apps/user`) | React 19 + Vite | `scope:app`,`type:react` | `nx serve user`, `nx build user`, `nx test user` |
| `shared-constants`, `shared-types`, `shared-utils` | TypeScript libs (`@nx/js:tsc`) | `scope:shared` | `nx build shared-constants` etc. |

Visualize the dependency graph with `npx nx graph`.

## Module Boundaries

Current tag conventions:

- `scope:app` may depend only on `scope:shared`.
- `scope:shared` must not depend on `scope:app`.
- `type:*` describes technology (`angular`, `react`, `util`, `types`) and can be expanded.

To enforce the rules, update `@nx/enforce-module-boundaries` in `eslint.config.mjs`, e.g.:

```js
depConstraints: [
  { sourceTag: "scope:app", onlyDependOnLibsWithTags: ["scope:shared"] },
  { sourceTag: "scope:shared", bannedExternalImports: ["apps/*"] }
];
```

## Testing & Quality

- React uses Vitest (`nx test user`). Add actual specs and remove `passWithNoTests` once ready.
- Angular admin currently lacks unit/e2e targets; consider wiring Jest/Vitest and Playwright or Cypress.
- Type checking via `nx run user:typecheck` or `nx run-many -t typecheck`.

## CI Suggestions

```sh
npx nx affected -t lint,test,build --base=origin/main --head=HEAD
```

Enable Nx Cloud (`npx nx connect`) to speed up pipelines with remote caching and task distribution.

## Generate New Projects

```sh
npx nx g @nx/angular:app apps/<name>
npx nx g @nx/react:app apps/<name> --bundler=vite
npx nx g @nx/js:lib libs/shared/<feature>
```

Always assign appropriate `tags` in each `project.json` to keep boundaries correct.

## Further Reading

- [Nx Fundamentals](https://nx.dev/getting-started/intro)
- [Angular + Nx](https://nx.dev/angular)
- [React + Nx (Vite)](https://nx.dev/react)
- [Module Boundaries](https://nx.dev/concepts/module-boundaries)
