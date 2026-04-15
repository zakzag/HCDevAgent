# Architecture Decision: Project Setup & Monorepo Structure

> **Date:** 2026-04-15 17:30
> **Status:** Accepted

---

## Context

HCDevAgent is an autonomous agent that processes Jira issues, investigates them, generates implementation plans, and implements them with tests. The project needs a well-organized monorepo structure with clear separation of concerns.

## Decision

We set up a pnpm-based monorepo with Turborepo for orchestration, organized into four packages:

### Packages

| Package | Purpose |
|---------|---------|
| `@hcdevagent/shared` | Types, interfaces, constants, errors, shared test utilities |
| `@hcdevagent/agent` | Services (adapters), modules (workflow), conductor orchestrator |
| `@hcdevagent/api` | Fastify REST + WebSocket server |
| `@hcdevagent/dashboard` | React SPA frontend |

### Key Technical Choices

1. **InversifyJS** for dependency injection — all services are bound via `ContainerModule`s, enabling testability and loose coupling.
2. **Symbol-based injection tokens** in `@hcdevagent/shared/constants/symbols.ts` — shared across all packages.
3. **Vitest aliases** for workspace packages during testing — avoids requiring a full build before running tests.
4. **Vite library mode** for `shared`, `agent`, `api` packages; SPA mode for `dashboard`.
5. **Test isolation** via `createTestContainer()` — factory function that builds a fresh DI container with all mock implementations.

### Folder Structure

- Each service has its own subfolder with implementation, DI module, and index barrel file.
- Workflow modules (investigation, planning, implementation) are separated from infrastructure services.
- Mock classes live in `shared/src/test/mocks/` and are reused across all packages.

## Consequences

- All packages can be built, tested, and type-checked independently.
- The DI container serves as the single composition root.
- Adding a new service requires: (1) define interface in `shared`, (2) add symbol, (3) implement in `agent`, (4) create `ContainerModule`, (5) load in `container.ts`.

