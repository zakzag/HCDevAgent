# HCDevAgent — Step 2: Conductor Scaffold

> **Date:** 2026-04-15

---

## Overview

Build a runnable agent app with the real Conductor polling loop, a real
`IssueTrackerOperations` module wired to the Jira Cloud API, and all
supporting infrastructure (config, logging, event bus). After this step
you can start the agent, watch it poll Jira for `SELECTED FOR TRIAGE`
issues, and see it transition the first matching issue to
`ISSUE INVESTIGATION`.

The investigation itself is a stub — it always returns "ready" with a
placeholder `Description For AI`. The goal is to prove the full vertical
slice: poll → pick → transition → log.

---

## What Gets Built

| Layer | What | New / Rewrite |
|-------|------|---------------|
| **shared — types** | Rewrite `Issue`, `Comment` to match 3-interfaces.md; add custom-field key constants from 4-jira-custom-fields.md | **Rewrite** |
| **shared — types** | Rewrite `InvestigationResult`, `QualityReport`, `CheckResult` to match 3-interfaces.md §4 | **Rewrite** |
| **shared — types** | Rewrite `ActiveIssue`, `ExecutionLogEntry`, `PhaseMetric` to match 3-interfaces.md §8 | **Rewrite** |
| **shared — interfaces** | Rewrite `IssueReader` — add `fetchIssuesByStatus`, `getComments`, `getLatestComment`, `getCustomField`, `getStatus` per 3-interfaces.md §1 | **Rewrite** |
| **shared — interfaces** | Rewrite `IssueWriter` — rename to `transitionStatus`, `addComment`, `updateCustomField` per 3-interfaces.md §2 | **Rewrite** |
| **shared — interfaces** | Rewrite `IssueTrackerOperations` — full method table from 3-interfaces.md §3 (fetchNextIssue, startInvestigation, markBlockedForPlanClarification, moveToPlan, markFailed, getCurrentStatus, etc.) | **Rewrite** |
| **shared — interfaces** | Rewrite `StorageAdapter` — match 3-interfaces.md §8 (getActiveIssue, setActiveIssue, clearActiveIssue, addExecutionLog, addMetric, updateMetric, etc.) | **Rewrite** |
| **shared — constants** | Rewrite `workflowStatuses.ts` — use the exact Jira status names from 0-initial-description.md (SELECTED FOR TRIAGE, ISSUE INVESTIGATION, BLOCKED FOR PLAN CLARIFICATION, PLAN, PLAN REVIEW, etc.) | **Rewrite** |
| **shared — constants** | Add `jiraCustomFields.ts` — field keys from 4-jira-custom-fields.md (`description_for_ai`, `implementation_plan`, `implementation_plan_for_ai`, `branch_name`, `pr_url`, `failure_reason`) | **Rewrite** |
| **shared — constants** | Rewrite `eventNames.ts` to match the workflow phases properly | **Rewrite** |
| **shared — mocks** | Update all mock classes to match new interface signatures | **Rewrite** |
| **agent — services/config** | Keep `EnvConfigProvider` as-is (already works) | Unchanged |
| **agent — services/logging** | Keep `PinoLogger` as-is (already works) | Unchanged |
| **agent — services/eventBus** | Keep `InProcessEventBus` as-is (already works) | Unchanged |
| **agent — services/issueTracker** | Rewrite `JiraIssueReader` — implement all 6 methods from §1 against Jira Cloud REST API v3 | **Rewrite** |
| **agent — services/issueTracker** | Rewrite `JiraIssueWriter` — implement `transitionStatus`, `addComment`, `updateCustomField` against Jira Cloud REST API v3 | **Rewrite** |
| **agent — modules/issueTracker** | Rewrite `IssueTrackerModule` — implement full `IssueTrackerOperations` interface, composing `IssueReader`/`IssueWriter` calls. Only the methods needed for Phase 1 need real logic now; the rest throw `NotImplementedError` | **Rewrite** |
| **agent — modules/investigation** | **Stub** — `StubIssueInvestigator` that always returns `{ ready: true, descriptionForAi: "<placeholder>" }` | **New** |
| **agent — conductor** | Rewrite `Conductor` — real polling loop with `setInterval`, calls `IssueTrackerOperations.fetchNextIssue`, `startInvestigation`, stub investigator, `moveToPlan`. Handles cancellation check. Emits events. Logs everything. | **Rewrite** |
| **agent — container** | Rewire DI container to load only the modules needed | **Rewrite** |
| **agent — cli** | New `src/cli.ts` — entry point that builds the container and calls `conductor.start()`. Graceful shutdown on SIGINT/SIGTERM. | **New** |
| **api — cli** | New `src/cli.ts` — entry point that calls `createServer()` and listens (so the API is also runnable) | **New** |

---

## Steps

### 1. Align shared types with the spec

Rewrite these files to match the specifications from 3-interfaces.md and
4-jira-custom-fields.md exactly:

- [types/domain.types.ts](../../packages/shared/src/types/domain.types.ts) — keep `Issue`, `Comment`, `CodeChanges`, `PullRequest` but ensure `Issue` has all fields the `IssueReader` needs (custom fields map, etc.)
- [types/phases.types.ts](../../packages/shared/src/types/phases.types.ts) — rewrite `InvestigationResult` to have `ready`, `descriptionForAi`, `clarificationQuestions`, `qualityReport`; add `CheckResult`, `QualityReport` matching §4
- [types/storage.types.ts](../../packages/shared/src/types/storage.types.ts) — rewrite `ActiveIssue` to include `phase`, `agentId`, `currentStep`, `branchName`, `prUrl`, `retryCount`, `lastError`, timestamps per §8

### 2. Align shared interfaces with the spec

Rewrite every interface to match 3-interfaces.md method signatures exactly:

- [IssueReader.ts](../../packages/shared/src/interfaces/IssueReader.ts) — 6 methods from §1
- [IssueWriter.ts](../../packages/shared/src/interfaces/IssueWriter.ts) — 3 methods from §2
- [IssueTrackerOperations.ts](../../packages/shared/src/interfaces/IssueTrackerOperations.ts) — full 19-method table from §3 (standalone interface, no longer extends IssueReader/IssueWriter)
- [StorageAdapter.ts](../../packages/shared/src/interfaces/StorageAdapter.ts) — 10 methods from §8
- [IssueInvestigator.ts](../../packages/shared/src/interfaces/IssueInvestigator.ts) — `investigate(issue, relatedIssues?)` returning new `InvestigationResult`

### 3. Align shared constants with the spec

- [workflowStatuses.ts](../../packages/shared/src/constants/workflowStatuses.ts) — exact Jira status names: `BACKLOG`, `SELECTED_FOR_TRIAGE`, `ISSUE_INVESTIGATION`, `BLOCKED_FOR_PLAN_CLARIFICATION`, `PLAN`, `PLAN_REVIEW`, `READY_FOR_IMPLEMENTATION`, `IN_PROGRESS`, `BLOCKED_FOR_CODE_CLARIFICATION`, `CODE_COMMITTED`, `PR_IN_REVIEW`, `PR_APPROVED`, `PR_CHANGES_REQUESTED`, `DONE`, `FAILURE`, `CANCELLED`
- [jiraFieldKeys.ts](../../packages/shared/src/constants/jiraFieldKeys.ts) → rename to `jiraCustomFields.ts` — keys from 4-jira-custom-fields.md
- [eventNames.ts](../../packages/shared/src/constants/eventNames.ts) — add events matching the workflow phases (`investigation.blocked`, `investigation.ready`, `conductor.poll`, `conductor.idle`, etc.)

### 4. Update shared mocks to match new interfaces

Rewrite every mock class in [shared/src/test/mocks/](../../packages/shared/src/test/mocks/) so method signatures match the new interfaces. Add `MockIssueTrackerOperations` (the module-level mock). Update barrel exports.

### 5. Implement `JiraIssueReader` and `JiraIssueWriter` services

Rewrite [JiraIssueReader.ts](../../packages/agent/src/services/issueTracker/JiraIssueReader.ts) — implement all 6 methods against Jira Cloud REST API v3. Rewrite [JiraIssueWriter.ts](../../packages/agent/src/services/issueTracker/JiraIssueWriter.ts) — implement `transitionStatus` (with transition-ID lookup), `addComment` (ADF format), `updateCustomField`.

### 6. Implement `IssueTrackerModule`

Rewrite [IssueTrackerModule.ts](../../packages/agent/src/modules/issueTracker/IssueTrackerModule.ts) to implement the full `IssueTrackerOperations` interface. Phase-1-required methods (`fetchNextIssue`, `startInvestigation`, `markBlockedForPlanClarification`, `moveToPlan`, `markFailed`, `getCurrentStatus`, `getLatestHumanReply`) have real logic. Remaining methods throw a `NotImplementedError` placeholder.

### 7. Create stub `IssueInvestigator`

Create `StubIssueInvestigator` in [modules/investigation/](../../packages/agent/src/modules/investigation/) — always returns `{ ready: true, descriptionForAi: "stub", clarificationQuestions: null, qualityReport: <all-passed> }`. This will be replaced by the real AI investigator in Step 3.

### 8. Rewrite the `Conductor`

Rewrite [Conductor.ts](../../packages/agent/src/conductor/Conductor.ts):
- `start()` — begins a `setInterval` polling loop (interval from `ConfigProvider`)
- `stop()` — clears interval, awaits in-flight work
- `tick()` — single poll iteration: call `fetchNextIssue()`, if found → `startInvestigation()` → `investigate()` → `moveToPlan()` or `markBlockedForPlanClarification()`. Check for cancellation before each step.
- Inject: `IssueTrackerOperations`, `IssueInvestigator`, `StorageAdapter`, `EventBus`, `Logger`, `ConfigProvider`
- Emit events at each transition
- Log at each step
- Wrap the full tick in try/catch → `markFailed()` on unrecoverable errors

### 9. Create agent CLI entry point

Create `packages/agent/src/cli.ts`:
- `import 'reflect-metadata'`
- Build the DI container
- Resolve `Conductor`
- Call `conductor.start()`
- Listen for SIGINT/SIGTERM → `conductor.stop()` → `process.exit(0)`
- Add `"dev": "tsx src/cli.ts"` and `"start": "node dist/cli.js"` scripts to `packages/agent/package.json`
- Install `tsx` as dev dependency

### 10. Create API server CLI entry point

Create `packages/api/src/cli.ts`:
- `import 'reflect-metadata'`
- Call `createServer()` and `app.listen()`
- Add `"dev": "tsx src/cli.ts"` and `"start": "node dist/cli.js"` scripts to `packages/api/package.json`
- Install `tsx` as dev dependency

### 11. Write unit tests

- `JiraIssueReader` — mock `fetch`, test all 6 methods, error cases
- `JiraIssueWriter` — mock `fetch`, test all 3 methods, error cases, transition-ID lookup
- `IssueTrackerModule` — mock `IssueReader`/`IssueWriter`, test all Phase-1 composite operations
- `StubIssueInvestigator` — verify it always returns `ready: true`
- `Conductor` — mock everything, test: poll finds issue → full Phase 1 flow; poll finds nothing → idle; investigate returns blocked → mark blocked; tick throws → mark failed; cancellation detection; start/stop lifecycle

---

## Runnable Demo

After this step:

```powershell
# Terminal 1 — start the agent (polls Jira every AGENT_POLL_INTERVAL_MS)
cd packages/agent
cp ../../.env.example .env   # fill in real Jira credentials
pnpm dev

# Terminal 2 — start the API server
cd packages/api
pnpm dev
