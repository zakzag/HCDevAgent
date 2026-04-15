# HCDevAgent — Step 1: Project Setup Plan

> **Date:** 2026-04-15

---

## Overview

Bootstrap the HCDevAgent monorepo with four packages:

- **`shared`** — Types, interfaces, constants, errors, shared test utilities
- **`agent`** — Services (adapters), modules (workflow), conductor orchestrator
- **`api`** — Fastify REST + WebSocket server
- **`dashboard`** — React SPA frontend

---

## Step 1: Initialize the Monorepo Root

Create the following root files:

- `package.json` — private, workspaces pointing to `packages/*`, scripts: `build`, `test`, `lint`, `typecheck`, `clean`
- `pnpm-workspace.yaml` — list `packages/*`
- `turbo.json` — pipelines for `build`, `test`, `lint`, `typecheck`; `build` is a dependency of `test`
- `tsconfig.base.json` — strict mode, `experimentalDecorators`, `emitDecoratorMetadata`, `target: ES2020`, `module: esnext`, `moduleResolution: bundler`, `skipLibCheck: true`
- `.nvmrc` — Node 20
- `.env.example` — placeholder keys: `JIRA_BASE_URL`, `JIRA_USER_EMAIL`, `JIRA_API_TOKEN`, `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `MONGODB_URI`, `MONGODB_DB_NAME`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `AGENT_LOG_LEVEL`, `AGENT_POLL_INTERVAL_MS`
- `.prettierrc` — formatting standard

---

## Step 2: Scaffold the Four Packages

For each package (`shared`, `agent`, `api`, `dashboard`) create:

- `packages/<name>/package.json` — name `@hcdevagent/<name>`, private, `exports` → `dist/index.js`, scripts: `build`, `test`, `lint`, `typecheck`
- `packages/<name>/tsconfig.json` — extends root `tsconfig.base.json`, `outDir: dist`, `rootDir: src`
- `packages/<name>/vite.config.ts` — library mode for `shared`/`agent`/`api`; SPA mode for `dashboard`
- `packages/<name>/vitest.config.ts` — environment `node` for `shared`/`agent`/`api`; `jsdom` for `dashboard`; setupFiles pointing to `vitest.setup.ts`; coverage thresholds 80/80/75/80
- `packages/<name>/vitest.setup.ts` — imports `reflect-metadata` as first line (required for `agent` and `api`)

---

## Step 3: Configure ESLint

Create at root:

- `eslint.config.mjs` — flat config, Airbnb base + Airbnb TypeScript, `@typescript-eslint` parser, `camelCase` for variables/functions, `PascalCase` for classes, JSDoc required on public members

Packages inherit root config; override per-package only if needed.

---

## Step 4: Install Dependencies

**Root dev dependencies:**
- `turbo`
- `typescript`
- `eslint`, `eslint-config-airbnb-base`, `eslint-config-airbnb-typescript`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`
- `vite`
- `vitest`
- `prettier`

**`packages/shared`:**
- `runtypes`

**`packages/agent`:**
- `inversify`, `reflect-metadata`
- `pino`; dev: `pino-pretty`
- `mongoose`
- `runtypes`
- `@hcdevagent/shared` (workspace)
- Dev: `@types/node`

**`packages/api`:**
- `fastify`, `@fastify/websocket`, `@fastify/cors`
- `inversify`, `reflect-metadata`
- `pino`
- `@hcdevagent/shared`, `@hcdevagent/agent` (workspace)
- Dev: `@types/node`

**`packages/dashboard`:**
- `react`, `react-dom`
- Dev: `@vitejs/plugin-react`, `jsdom`, `@types/react`, `@types/react-dom`

Run `pnpm install` after all `package.json` files are in place.

---

## Step 5: Create the Folder Structure

**`packages/shared/src/`**
```
types/
  index.ts
  domain.types.ts        # Issue, Comment, CodeChanges, PullRequest
  phases.types.ts        # InvestigationResult, PlanResult, QualityReport
  storage.types.ts       # ActiveIssue, ExecutionLogEntry, PhaseMetric
  api.types.ts           # API request/response shapes
interfaces/
  index.ts
  IssueReader.ts
  IssueWriter.ts
  IssueTrackerOperations.ts
  IssueInvestigator.ts
  PlanGenerator.ts
  CodeImplementer.ts
  VersionControl.ts
  StorageAdapter.ts
  EventBus.ts
  ConfigProvider.ts
  Logger.ts
errors/
  index.ts
  BaseError.ts
  ValidationError.ts
  IntegrationError.ts
  StorageError.ts
  ConfigError.ts
  ImplementationError.ts
constants/
  index.ts
  workflowStatuses.ts
  eventNames.ts
  jiraFieldKeys.ts
  phaseNames.ts
  symbols.ts             # InversifyJS injection tokens
test/
  mocks/
    index.ts
    MockLogger.ts
    MockConfigProvider.ts
    MockIssueReader.ts
    MockIssueWriter.ts
    MockStorageAdapter.ts
    MockVersionControl.ts
    MockEventBus.ts
  helpers.ts
index.ts
```

**`packages/agent/src/`**
```
container.ts             # Root DI container — loads all ContainerModules
services/
  index.ts
  config/
    EnvConfigProvider.ts
    config.module.ts
    index.ts
  logging/
    PinoLogger.ts
    logging.module.ts
    index.ts
  eventBus/
    InProcessEventBus.ts
    eventBus.module.ts
    index.ts
  issueTracker/
    JiraIssueReader.ts
    JiraIssueWriter.ts
    issueTracker.module.ts
    index.ts
  versionControl/
    GitHubVersionControl.ts
    versionControl.module.ts
    index.ts
  storage/
    MongoStorageAdapter.ts
    storage.module.ts
    index.ts
  ai/
    OpenAiClient.ts
    ai.module.ts
    index.ts
modules/
  index.ts
  issueTracker/
    IssueTrackerModule.ts
    issueTrackerModule.module.ts
    index.ts
  investigation/
    OpenAiIssueInvestigator.ts
    investigation.module.ts
    index.ts
  planning/
    OpenAiPlanGenerator.ts
    planning.module.ts
    index.ts
  implementation/
    OpenAiCodeImplementer.ts
    implementation.module.ts
    index.ts
conductor/
  Conductor.ts
  conductor.module.ts
  index.ts
index.ts                 # First line: import 'reflect-metadata'
test/
  mocks/
    index.ts
  helpers/
    createTestContainer.ts
    index.ts
  fixtures/
    testIssue.fixture.ts
    testPlan.fixture.ts
    index.ts
```

**`packages/api/src/`**
```
routes/
  index.ts
  issues.routes.ts
  plans.routes.ts
  status.routes.ts
plugins/
  index.ts
  websocket.plugin.ts
  cors.plugin.ts
middleware/
  logging.ts
server.ts
index.ts                 # First line: import 'reflect-metadata'
container.ts
test/
  mocks/
    index.ts
```

**`packages/dashboard/src/`**
```
components/
  index.ts
  IssueQueue.tsx
  PlanViewer.tsx
  ImplementationProgress.tsx
  RealTimeStatus.tsx
pages/
  index.ts
  HomePage.tsx
  IssueDetailPage.tsx
hooks/
  index.ts
  useIssues.ts
  usePlan.ts
  useWebSocket.ts
utils/
  index.ts
  api.ts
  formatting.ts
App.tsx
main.tsx
test/
  mocks/
    index.ts
```

---

## Step 6: Set Up InversifyJS DI Container

For the `agent` package:

1. Define all injection tokens in `packages/shared/src/constants/symbols.ts` using `Symbol.for(name)` — one token per interface
2. Decorate every implementation class with `@injectable()`; decorate every constructor dependency with `@inject(token)`
3. Create one `ContainerModule` per service/module group in its `*.module.ts` file; bind each interface token to its implementation in singleton scope
4. Create `packages/agent/src/container.ts` as the single composition root — instantiate `Container`, load all `ContainerModule`s, export as default
5. Ensure `import 'reflect-metadata'` is the first line in `packages/agent/src/index.ts`, `packages/agent/src/container.ts`, and `packages/api/src/index.ts`
6. Create `packages/agent/src/test/helpers/createTestContainer.ts` — a factory that builds a fresh container wired with all mock implementations; accepts an optional callback to rebind specific tokens per test
7. All mock classes in `packages/shared/src/test/mocks/` must carry `@injectable()` and use `vi.fn()` for every method

---

## Step 7: Add Entry Points and Smoke Tests

**Entry points:**

- `packages/shared/src/index.ts` — re-export from `types`, `interfaces`, `errors`, `constants`
- `packages/agent/src/index.ts` — `import 'reflect-metadata'` first; re-export from `services`, `modules`, `conductor`
- `packages/api/src/index.ts` — `import 'reflect-metadata'` first; export `createServer`
- `packages/dashboard/src/main.tsx` — React root render

**One smoke test per package** (`src/test/smoke.test.ts`):

- `shared` — assert the package exports are defined
- `agent` — assert package exports are defined; assert `container.ts` loads without error; assert `container.get(SYMBOLS.Logger)` resolves
- `api` — assert `createServer` is exported as a function
- `dashboard` — assert `App` component is defined

---

## Success Criteria

- `pnpm install` succeeds
- `turbo run build` — all four packages compile to `dist/`
- `turbo run typecheck` — zero TypeScript errors
- `turbo run lint` — zero errors
- `turbo run test` — all smoke tests pass, coverage reported
- `container.get(SYMBOLS.Logger)` resolves without throwing
- `createTestContainer()` returns an isolated container wired with mocks

---

## Next Steps

Proceed to **Step 2: Configuration Service** — implement `ConfigProvider` to load and validate environment variables at startup.
