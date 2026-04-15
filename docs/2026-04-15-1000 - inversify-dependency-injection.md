# Architecture Decision: InversifyJS Dependency Injection

> **Date:** 2026-04-15
> **Status:** Accepted
> **Applies to:** `packages/agent`, `packages/api`

---

## Context

HCDevAgent is a modular autonomous agent with a layered architecture:

```
Conductor → Modules (high-level) → Services (low-level adapters) → External APIs
```

Each layer depends on abstractions (interfaces), not concretions (implementations). This design requires a
mechanism that:

1. Wires implementations to their interfaces at startup
2. Allows swapping any implementation without touching callers (Open/Closed Principle)
3. Makes unit tests easy — callers should receive mocks, not real adapters
4. Prevents circular dependencies and hidden coupling (no global singletons, no service locator anti-pattern)

**Decision:** Use **InversifyJS** as the IoC container for all `agent` and `api` packages.

---

## Why InversifyJS

| Criterion | Decision |
|-----------|----------|
| TypeScript-native | ✅ Full decorator support with `@injectable()` / `@inject()` |
| Reflects interfaces at runtime | ✅ Via `reflect-metadata` + `emitDecoratorMetadata` |
| Modular container (no god-object) | ✅ `ContainerModule` pattern keeps bindings encapsulated |
| Testability | ✅ Easy to create isolated containers with mock bindings |
| Maturity | ✅ Stable, widely adopted in TypeScript projects |
| SOLID compatibility | ✅ Enforces Dependency Inversion by design |

Alternatives considered:

- **tsyringe** — lighter, but less mature `ContainerModule` support
- **TypeDI** — simpler API but lacks fine-grained scope control
- **Manual DI (factory functions)** — viable for small projects, but does not scale cleanly across 10+ services

---

## Injection Tokens (`SYMBOLS`)

All injection tokens are defined in `packages/shared/src/constants/symbols.ts` and exported as a
single `SYMBOLS` constant. Tokens are created with `Symbol.for(name)` (not `Symbol(name)`) so the
same token identity is maintained across module boundaries.

```typescript
/** Injection tokens for InversifyJS bindings. Shared across all packages. */
export const SYMBOLS = {
  // ── Core services ──────────────────────────────────────────────────
  ConfigProvider:          Symbol.for('ConfigProvider'),
  Logger:                  Symbol.for('Logger'),
  EventBus:                Symbol.for('EventBus'),

  // ── Issue Tracker service layer (low-level adapters) ───────────────
  IssueReader:             Symbol.for('IssueReader'),
  IssueWriter:             Symbol.for('IssueWriter'),

  // ── Other service adapters ─────────────────────────────────────────
  StorageAdapter:          Symbol.for('StorageAdapter'),
  VersionControl:          Symbol.for('VersionControl'),

  // ── Module layer (high-level, workflow-aware) ──────────────────────
  IssueTrackerOperations:  Symbol.for('IssueTrackerOperations'),
  IssueInvestigator:       Symbol.for('IssueInvestigator'),
  PlanGenerator:           Symbol.for('PlanGenerator'),
  CodeImplementer:         Symbol.for('CodeImplementer'),

  // ── Conductor ──────────────────────────────────────────────────────
  Conductor:               Symbol.for('Conductor'),
} as const;
```

`SYMBOLS` is re-exported from `packages/shared/src/index.ts` so both `agent` and `api` packages
can import it without circular dependencies.

---

## Decorating Implementation Classes

Every class that is resolved by the DI container must:

1. Be decorated with `@injectable()` (from `inversify`)
2. Have each constructor parameter decorated with `@inject(SYMBOLS.X)` (from `inversify`)

### Rules

- ❌ **Never** call `new SomeService()` outside of the container or a test helper
- ❌ **Never** inject a concrete class — always inject the interface's token
- ❌ **Never** omit `@inject()` from a constructor parameter that is a DI-resolved dependency
- ✅ Always bind to the interface generic type: `bind<Logger>(SYMBOLS.Logger).to(PinoLogger)`

---

## Container Module Pattern

Each service or module group owns exactly one binding file named `<group>.module.ts`. This keeps the
root container clean and enables swapping a full group by replacing a single module.

### All `ContainerModule` files

| `ContainerModule` file | Binds |
|------------------------|-------|
| `services/config/config.module.ts` | `SYMBOLS.ConfigProvider` → `EnvConfigProvider` |
| `services/logging/logging.module.ts` | `SYMBOLS.Logger` → `PinoLogger` |
| `services/eventBus/eventBus.module.ts` | `SYMBOLS.EventBus` → `InProcessEventBus` |
| `services/issueTracker/issueTracker.module.ts` | `SYMBOLS.IssueReader` → `JiraIssueReader`<br>`SYMBOLS.IssueWriter` → `JiraIssueWriter` |
| `services/versionControl/versionControl.module.ts` | `SYMBOLS.VersionControl` → `GitHubVersionControl` |
| `services/storage/storage.module.ts` | `SYMBOLS.StorageAdapter` → `MongoStorageAdapter` |
| `services/ai/ai.module.ts` | AI client bindings |
| `modules/issueTracker/issueTrackerModule.module.ts` | `SYMBOLS.IssueTrackerOperations` → `IssueTrackerModule` |
| `modules/investigation/investigation.module.ts` | `SYMBOLS.IssueInvestigator` → `OpenAiIssueInvestigator` |
| `modules/planning/planning.module.ts` | `SYMBOLS.PlanGenerator` → `OpenAiPlanGenerator` |
| `modules/implementation/implementation.module.ts` | `SYMBOLS.CodeImplementer` → `OpenAiCodeImplementer` |
| `conductor/conductor.module.ts` | `SYMBOLS.Conductor` → `Conductor` |

---

## Root Container (Composition Root)

`packages/agent/src/container.ts` is the **single composition root**. It instantiates the
`Container`, loads all `ContainerModule`s, and exports the configured container as a default export.
Nothing else in the codebase should call `new Container()` (except test helpers).
