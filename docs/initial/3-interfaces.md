# HCDevAgent — Service & Module Interfaces

> This document defines every abstract interface used across the system. Each interface belongs to
> either the **Service layer** (low-level adapters) or the **Module layer** (high-level,
> workflow-aware). Implementations can be swapped without affecting consumers.
>
> See [initial-description.md](0-initial-description.md) for architecture overview and
> [issue-workflow-events.md](2-issue-workflow-events.md) for the full event table.

---

## Layering

```
Conductor  ──►  Modules (high-level)  ──►  Services (low-level adapters)  ──►  External APIs
```

- **Services** expose small, generic operations (e.g., `transitionStatus`, `addComment`).
- **Modules** compose service calls into workflow-aware operations (e.g., `markBlockedForPlanClarification`).
- **Conductor** only talks to Modules — never directly to Services.

---

## 1. Issue Tracker Service — `IssueReader`

Low-level read adapter for the issue tracker (e.g., Jira REST API).

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `fetchIssuesByStatus` | `statusName: string` | `Issue[]` | Fetch all issues currently in the given workflow status |
| `getIssue` | `issueKey: string` | `Issue` | Fetch full issue details (summary, description, status, assignee, etc.) |
| `getComments` | `issueKey: string` | `Comment[]` | Fetch all comments on an issue, ordered chronologically |
| `getLatestComment` | `issueKey: string` | `Comment \| null` | Fetch the most recent comment (used to read human replies) |
| `getCustomField` | `issueKey: string, fieldName: string` | `string \| null` | Read the value of a custom field (e.g., `Description For AI`, `Implementation Plan`) |
| `getStatus` | `issueKey: string` | `string` | Read the current workflow status of an issue |

### Notes
- All methods are read-only — they never modify the issue.
- `statusName` values are resolved from `config.jira.statusMapping` at runtime.
- The `Issue` and `Comment` types are defined in the shared types package.

---

## 2. Issue Tracker Service — `IssueWriter`

Low-level write adapter for the issue tracker (e.g., Jira REST API).

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `transitionStatus` | `issueKey: string, statusName: string` | `void` | Move the issue to a new workflow status |
| `addComment` | `issueKey: string, body: string` | `void` | Post a comment on the issue |
| `updateCustomField` | `issueKey: string, fieldName: string, value: string` | `void` | Write a value to a custom Jira field |

### Notes
- These three methods are the **only write primitives** the agent uses against the issue tracker.
- See [issue-workflow-events.md](2-issue-workflow-events.md) for the full list of agent writes that
  compose from these primitives.

---

## 3. Issue Tracker Module — `IssueTrackerOperations`

High-level, workflow-aware interface consumed by the Conductor. Each method internally composes one
or more `IssueReader` / `IssueWriter` calls.

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `fetchNextIssue` | — | `Issue \| null` | Poll for the next issue in `SELECTED FOR TRIAGE` status |
| `startInvestigation` | `issueKey: string` | `void` | → `ISSUE INVESTIGATION` |
| `markBlockedForPlanClarification` | `issueKey: string, questions: string` | `void` | → `BLOCKED FOR PLAN CLARIFICATION` + comment |
| `moveToPlan` | `issueKey: string, descriptionForAi: string` | `void` | Write `Description For AI` field + → `PLAN` |
| `moveToPlanReview` | `issueKey: string, plan: string, planForAi: string` | `void` | Write `Implementation Plan` + `Implementation Plan For AI` fields + → `PLAN REVIEW` |
| `startImplementation` | `issueKey: string, branchName: string` | `void` | → `IN PROGRESS` + write `Branch Name` field |
| `markBlockedForCodeClarification` | `issueKey: string, questions: string` | `void` | → `BLOCKED FOR CODE CLARIFICATION` + comment |
| `resumeImplementation` | `issueKey: string` | `void` | → `IN PROGRESS` (after code clarification resolved) |
| `markCodeCommitted` | `issueKey: string` | `void` | → `CODE COMMITTED` |
| `markPrInReview` | `issueKey: string, prUrl: string` | `void` | → `PR IN REVIEW` + write `PR URL` field + comment with PR URL |
| `markPrApproved` | `issueKey: string` | `void` | → `PR APPROVED` |
| `markDone` | `issueKey: string` | `void` | → `DONE` |
| `markPrChangesRequested` | `issueKey: string, reviewComment: string` | `void` | → `PR CHANGES REQUESTED` + comment |
| `markFailed` | `issueKey: string, reason: string` | `void` | → `FAILURE` + write `Failure Reason` field + comment |
| `getDescriptionForAi` | `issueKey: string` | `string \| null` | Read `Description For AI` custom field |
| `getPlan` | `issueKey: string` | `string \| null` | Read `Implementation Plan` custom field |
| `getPlanForAi` | `issueKey: string` | `string \| null` | Read `Implementation Plan For AI` custom field |
| `getBranchName` | `issueKey: string` | `string \| null` | Read `Branch Name` custom field |
| `getPrUrl` | `issueKey: string` | `string \| null` | Read `PR URL` custom field |
| `getLatestHumanReply` | `issueKey: string` | `Comment \| null` | Read the latest human comment (for clarification responses) |
| `getCurrentStatus` | `issueKey: string` | `string` | Read current status (for detecting cancellation / external changes) |

### Notes
- `fetchNextIssue` uses `IssueReader.fetchIssuesByStatus` internally.
- Write methods combine `IssueWriter.transitionStatus` + `IssueWriter.addComment` and/or
  `IssueWriter.updateCustomField` as needed.
- Read convenience methods delegate to `IssueReader`.
- See [4-jira-custom-fields.md](4-jira-custom-fields.md) for full field format specifications.

---

## 4. Issue Investigation Module — `IssueInvestigator`

Analyses a raw issue to determine whether it is ready for planning. Called by the Conductor during
Phase 1 (Investigation). Uses the AI Agent Service internally.

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `investigate` | `issue: Issue, relatedIssues?: Issue[]` | `InvestigationResult` | Run all quality checks on the issue and produce a verdict |

### `InvestigationResult`

| Field | Type | Description |
|---|---|---|
| `ready` | `boolean` | `true` if the issue is clear enough to proceed to planning |
| `descriptionForAi` | `string \| null` | Enhanced AI-friendly description (only when `ready === true`) |
| `clarificationQuestions` | `string[] \| null` | List of questions for the human (only when `ready === false`) |
| `qualityReport` | `QualityReport` | Detailed breakdown of each quality check |
| `contextUsed` | `InvestigationContext` | Project description, code chunks, and rendered investigator settings used during the AI call |
| `autoFixabilityReport` | `AutoFixabilityReport` | Weighted decision describing whether the issue looks safe for mostly autonomous implementation |

### `QualityReport`

| Field | Type | Description |
|---|---|---|
| `clarity` | `CheckResult` | Is the description clear enough to derive implementation steps? |
| `completeness` | `CheckResult` | Are acceptance criteria, expected behaviour, and scope defined? |
| `ambiguity` | `CheckResult` | Are there multiple possible interpretations? |
| `specificity` | `CheckResult` | Is it precise enough, or too vague? |
| `conflictDetection` | `CheckResult` | Does it contradict or duplicate other known issues? |
| `scope` | `CheckResult` | Is it a single, well-bounded unit of work? |

### `CheckResult`

| Field | Type | Description |
|---|---|---|
| `passed` | `boolean` | Whether this check passed |
| `summary` | `string` | Short explanation of the finding |

### `InvestigationContext`

| Field | Type | Description |
|---|---|---|
| `projectDescription` | `string` | Repo-level description loaded from `WORKSPACE_PATH/.agent/project-description.md` (or fallback README) |
| `codeChunksContext` | `string` | Relevant code snippets collected from the target workspace |
| `investigatorSettingsContext` | `string` | Prompt-friendly rendering of the repo-specific investigator settings |
| `relevantFiles` | `string[]` | Relative file paths selected as code anchors |

### `AutoFixabilityReport`

| Field | Type | Description |
|---|---|---|
| `decision` | `'autoFixable' \| 'needsHumanReview' \| 'needsHumanClarification'` | Final routing verdict after applying repo settings to AI scores |
| `score` | `number` | Weighted overall automation score (0–100) |
| `threshold` | `number` | Minimum score required by the repository settings |
| `blockingReasons` | `string[]` | Reasons why the issue should still get human attention |
| `assumptions` | `string[]` | Important assumptions inferred during investigation |
| `suggestedFollowUp` | `string[]` | Suggested next steps or clarification prompts |
| `metrics` | `AutoFixabilityMetrics` | Raw metric scores used to compute the final decision |

### `AutoFixabilityMetrics`

Each metric is a `{ score: number, summary: string }` pair, where `score` is on a 0–100 scale.

| Field | Description |
|---|---|
| `acceptanceCriteriaCoverage` | How well expected outcomes and acceptance criteria are covered |
| `reproductionClarity` | How clearly the current or desired behavior can be reproduced |
| `codeContextCoverage` | How well the gathered repository context anchors the issue in real code |
| `changeLocality` | Whether the work appears localized or cross-cutting |
| `dependencyConfidence` | Confidence that required dependencies and integrations are understood |
| `testability` | How easily the change can be verified with tests |
| `blastRadiusConfidence` | Confidence that unintended side effects are limited |
| `humanDecisionIndependence` | Whether implementation can proceed without product/business decisions |

### Notes
- `relatedIssues` is optional — the Conductor can pass recent/active issues for conflict detection.
- When `ready === false`, the Conductor uses `clarificationQuestions` to post a Jira comment and
  block the issue. When the human replies and unblocks, the Conductor calls `investigate` again
  with the updated issue (which now includes the human's reply in the comments).
- The AI Agent Service provides the underlying LLM call — this interface orchestrates the prompt
  and parses the structured response.
- Repo-specific investigator thresholds, risky paths, and review labels live under
  `WORKSPACE_PATH/.agent/project-settings.json` so the metric model stays general while routing stays project-aware.

---

## 5. AI Agent Service — `PlanGenerator`

Generates implementation plans from the enhanced `Description For AI`. Produces two outputs:
a human-readable `Implementation Plan` and a machine-parseable `Implementation Plan For AI`.

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `generatePlan` | `descriptionForAi: string, feedback?: string` | `PlanResult` | Generate both plan formats from the enhanced description |
| `refinePlan` | `existingPlanForAi: string, rejectionComment: string` | `PlanResult` | Re-generate both plans incorporating human rejection feedback |

### `PlanResult`

| Field | Type | Description |
|---|---|---|
| `plan` | `string` | Human-readable plan (written to `Implementation Plan` custom field) |
| `planForAi` | `string` | Standardized markdown plan (written to `Implementation Plan For AI` custom field) |

### Notes
- Both fields are always written together — they represent the same plan in two formats.
- `feedback` is the human's clarification reply (if any) from the Investigation phase.
- `rejectionComment` is the human's comment explaining why the plan was rejected.
- `generateDescriptionForAi` has been moved to the `IssueInvestigator` interface (section 4)
  because producing the enhanced description is an investigation responsibility, not a planning one.
- See [4-jira-custom-fields.md](4-jira-custom-fields.md) for the exact format of both fields.

---

## 6. AI Agent Service — `CodeImplementer`

Generates code changes based on an approved plan. Reads the `Implementation Plan For AI` field as input.

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `implementPlan` | `planForAi: string, codebase: CodebaseContext` | `CodeChanges` | Generate code changes for the full plan |
| `applyPrFeedback` | `planForAi: string, codebase: CodebaseContext, reviewComments: string` | `CodeChanges` | Re-generate code incorporating PR review feedback |
| `answerClarification` | `planForAi: string, codebase: CodebaseContext, clarification: string` | `CodeChanges` | Continue implementation after human clarification |

### Notes
- The `planForAi` parameter is read from the `Implementation Plan For AI` Jira custom field — not the human-readable `Implementation Plan`.
- `CodebaseContext` represents the relevant files and structure the AI needs to understand.
- `CodeChanges` represents the set of file modifications (create, update, delete) to be committed.

---

## 7. Version Control Service — `VersionControl`

Abstracts Git operations and remote platform API (e.g., GitHub).

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `createBranch` | `branchName: string, baseBranch?: string` | `void` | Create a new feature branch from base (default: main) |
| `applyChanges` | `changes: CodeChanges` | `void` | Stage file modifications in the working tree |
| `commit` | `message: string` | `string` | Commit staged changes, returns commit SHA |
| `push` | `branchName: string` | `void` | Push branch to remote |
| `createPullRequest` | `options: PrOptions` | `PullRequest` | Open a PR on the remote platform |
| `getPullRequestStatus` | `prId: string` | `PrStatus` | Check PR state (open, merged, changes requested) |
| `deleteBranch` | `branchName: string` | `void` | Delete remote and local branch (cleanup after merge) |

### Notes
- `PrOptions` includes `title`, `body`, `sourceBranch`, `targetBranch`, `issueKey`.
- `PrStatus` includes state (`open`, `merged`, `changesRequested`), review comments, and merge SHA.

---

## 8. Storage Service — `StorageAdapter`

Abstracts database operations for agent-internal data (not issue data — that lives in Jira).

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `getActiveIssue` | — | `ActiveIssue \| null` | Fetch the currently active issue record |
| `setActiveIssue` | `record: ActiveIssue` | `void` | Create or update the active issue record |
| `clearActiveIssue` | `issueKey: string` | `void` | Remove the active issue record (done / cancelled / failed) |
| `addExecutionLog` | `entry: ExecutionLogEntry` | `void` | Append an audit log entry |
| `getExecutionHistory` | `issueKey?: string` | `ExecutionLogEntry[]` | Fetch execution history, optionally filtered by issue |
| `addMetric` | `metric: PhaseMetric` | `void` | Insert or update a phase metric record |
| `updateMetric` | `issueKey: string, phase: string, update: Partial<PhaseMetric>` | `void` | Update an in-progress metric (e.g., token count, completion) |
| `getMetrics` | `issueKey?: string` | `PhaseMetric[]` | Fetch metrics, optionally filtered by issue |
| `getConfigOverride` | `key: string` | `unknown \| null` | Read a runtime config override from the database |
| `setConfigOverride` | `key: string, value: unknown, updatedBy?: string` | `void` | Upsert a runtime config override |

### Notes
- `ActiveIssue` holds agent runtime state: `issueKey`, `phase`, `agentId`, `currentStep`,
  `branchName`, `prUrl`, `retryCount`, `lastError`, timestamps.
- `ExecutionLogEntry` holds audit data: `issueKey`, `action`, `timestamp`, `phase`, `details`,
  `outcome`, `durationMs`, `errorMessage`.
- `PhaseMetric` holds per-phase performance data: `issueKey`, `phase`, `startedAt`, `completedAt`,
  `durationMs`, `aiTokensUsed`, `aiCallCount`, `retryCount`, `outcome`.
- Config overrides are optional — when a key is not present, the `ConfigProvider` falls back to
  env/config file values.

---

## 9. Event Bus — `EventBus`

In-process typed pub/sub system.

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `emit` | `eventName: string, payload: unknown` | `void` | Publish an event to all registered listeners |
| `on` | `eventName: string, handler: (payload) => void` | `void` | Register a listener for an event |
| `off` | `eventName: string, handler: (payload) => void` | `void` | Remove a previously registered listener |

### Notes
- Event names and payload types should be defined as a typed map in the shared types package.
- See [initial-description.md](0-initial-description.md) Event Bus section for example events.

---

## 10. Configuration Service — `ConfigProvider`

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `get` | `key: string` | `T` | Read a typed configuration value |
| `getRequired` | `key: string` | `T` | Read a required value — throws if missing |
| `has` | `key: string` | `boolean` | Check whether a key is defined |

### Notes
- Validates all required keys at startup using runtypes schemas.
- Supports nested keys (e.g., `jira.baseUrl`, `ai.model`, `github.token`).

---

## 11. Logging Service — `Logger`

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `info` | `message: string, context?: object` | `void` | Log an informational message |
| `warn` | `message: string, context?: object` | `void` | Log a warning |
| `error` | `message: string, error?: Error, context?: object` | `void` | Log an error with optional Error object |
| `debug` | `message: string, context?: object` | `void` | Log a debug message |
| `child` | `bindings: object` | `Logger` | Create a child logger with additional context (e.g., `{ issueKey }`) |

### Notes
- Implemented with Pino. `context` is merged into structured log output.
- `child` is used to create per-issue loggers so every log line includes the issue key.

---

## Interface → Implementation mapping

| Interface | Layer | First implementation | Swappable for |
|---|---|---|---|
| `IssueReader` | Service | `JiraIssueReader` | Any issue tracker API |
| `IssueWriter` | Service | `JiraIssueWriter` | Any issue tracker API |
| `IssueTrackerOperations` | Module | `JiraIssueTrackerModule` | Any issue tracker module |
| `IssueInvestigator` | Module | `OpenAiIssueInvestigator` | Custom rule-based investigator |
| `PlanGenerator` | Module | `OpenAiPlanGenerator` | Any LLM provider |
| `CodeImplementer` | Module | `OpenAiCodeImplementer` | Any LLM provider |
| `VersionControl` | Service | `GitHubVersionControl` | Any Git platform |
| `StorageAdapter` | Service | `MongoStorageAdapter` | Any database |
| `EventBus` | Service | `InProcessEventBus` | External message broker |
| `ConfigProvider` | Service | `EnvConfigProvider` | File-based, DB-based |
| `Logger` | Service | `PinoLogger` | Any structured logger |



