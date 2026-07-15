# Frontend

All frontend commands are run from the repository root using [Task](https://taskfile.dev/):

- `task frontend:dev` — start Vite dev server (localhost:5173)
- `task frontend:build` — production build
- `task frontend:test` — run tests
- `task frontend:test:watch` — run tests in watch mode
- `task frontend:lint` — run ESLint + cycle detection
- `task frontend:typecheck` — run TypeScript type checking
- `task frontend:check` — run typecheck + lint + test
- `task frontend:install` — install npm dependencies

## Layout

`frontend/` is a workspace containing one or more apps. Today it holds the
PDF editor under `frontend/editor/`; new apps (the developer portal, etc.)
will sit alongside it as siblings. Shared tooling — `package.json`, `node_modules`,
`.storybook/`, ESLint, Prettier — lives at `frontend/` so every app installs
once and lints with the same config.

## Environment Variables

The editor's environment variables live in committed `.env` files at
`frontend/editor/`:

- `.env` — used by all builds (core, proprietary, and as the base for SaaS)
- `.env.saas` — additional vars loaded in SaaS mode

These files contain non-secret defaults and are checked into Git, so most dev work needs no further setup.

To override values locally (API keys, machine-specific settings), create an uncommitted sibling `editor/.env.local` / `editor/.env.saas.local`. Vite automatically layers these on top of the committed files.

## Docker Setup

For Docker deployments and configuration, see the [Docker README](../docker/README.md).
