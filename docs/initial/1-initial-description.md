# HCDevAgent



Autonomous Developer Agent for Developers

This project implements an autonomous AI agent that integrates with Jira to automatically pick up tickets, investigate
them, generate implementation plans, and execute code changes. The agent follows a three-phase approach: first 
investigating the issue and producing an AI-friendly description, then generating a plan for human approval, then 
implementing the approved plan — committing code changes, creating Pull Requests, and updating Jira tickets throughout.

The architecture is modular, with separate modules for Jira integration, issue investigation, AI planning, code 
implementation, storage, version control, event handling, and API serving. The agent is designed to be extensible and 
maintainable.

 
## Main Principles


The agent should be able to use multiple kind of Issue Tracker, Version System, AI agent, and Storage.
The interfaces between modules should be abstracted, so that we can easily swap out implementations (e.g., Jira for
another issue tracker, GitHub for another version control system, etc.) without affecting the overall architecture.

Since Jira holds the plan, the issue state, comments, and the queue is just a Jira status query — the Storage module's 
role shrinks considerably. It is no needed for the core workflow data.

What's left for Storage (MongoDB) is internal operational data only:

- Execution history / audit logs — what the agent did, when, and what the outcome was
- Agent runtime state — e.g., which issue is currently being processed, last poll timestamp
- Recovery state — if the agent crashes mid-implementation, what step was it on
- Cached metadata — optional performance optimization to avoid re-fetching from Jira repeatedly
- Metrics / telemetry — execution times, failure counts, etc.
- Configuration storage — if we want to store agent configuration in the database instead of environment variables
- Other non-core data that supports the agent's operation but is not part of the source of truth for issue data (which is Jira).


## Workflow


The agent operates in a loop, continuously polling Jira for new issues in a specific workflow status (e.g., "Selected
for Triage").

The workflow of an issue is described in workflow-chart.png.

Any ticket can be cancelled any time, and set as failed when cannot continue after implementation starts.

### Workflow Statuses

The full lifecycle of an issue uses the following Jira statuses:

```
BACKLOG → SELECTED FOR TRIAGE → ISSUE INVESTIGATION →
  BLOCKED FOR PLAN CLARIFICATION (optional loop) →
PLAN → PLAN REVIEW →
  PLAN (rejection loop) →
READY FOR IMPLEMENTATION → IN PROGRESS →
  BLOCKED FOR CODE CLARIFICATION (optional loop) →
CODE COMMITTED → PR IN REVIEW →
  PR CHANGES REQUESTED (optional loop back to IN PROGRESS) →
PR APPROVED → DONE

Any status → CANCELLED (human)
IN PROGRESS / CODE COMMITTED / PR IN REVIEW / PR APPROVED → FAILURE (agent)
```

### Custom Fields

The agent uses the following Jira custom fields (see [4-jira-custom-fields.md](4-jira-custom-fields.md) for full
format specifications and examples):

- **Description For AI** — a standardized, AI-friendly reformulation of the original issue description, produced during
  the Investigation phase. The agent reads this field as input for planning.
- **Implementation Plan** — a human-readable implementation plan (summary, approach, steps, testing strategy, checklist).
  This is what the human reviews and approves or rejects during `PLAN REVIEW`.
- **Implementation Plan For AI** — a standardized markdown plan with mandatory fields and strict structure (META, STEPS,
  TESTS, VERIFICATION). Written alongside `Implementation Plan`, this is what the Implementation phase reads as its
  primary input.
- **Branch Name** — the Git branch created for this issue (e.g., `agent/PROJ-123`). Used for human reference and agent
  crash recovery.
- **PR URL** — the pull request URL on GitHub. Also posted as a comment, but stored as a field for queryability and
  recovery.
- **Failure Reason** — structured error details when the agent transitions an issue to `FAILURE`.

JIRA workflow is managed by statuses, custom fields and comments.

### Phase 1 — Investigation

When the agent picks up an issue (status: `SELECTED FOR TRIAGE`), it transitions the issue to `ISSUE INVESTIGATION` and
begins analysing the raw issue description. The goal is to produce a clear, structured `Description For AI` custom field
that the Planning phase can consume.

If the agent encounters ambiguity or missing information during investigation, it can:
1. Transition the issue to `BLOCKED FOR PLAN CLARIFICATION`
2. Post a comment with specific clarification questions
3. Wait for a human to reply and move the issue back to `ISSUE INVESTIGATION`

Once the enhanced description is ready, the agent writes it to the `Description For AI` custom field and transitions
the issue to `PLAN`.

### Phase 2 — Planning

During the `PLAN` status, the agent generates an implementation plan based on the `Description For AI` field. The plan
follows a standardized format (summary, steps, checklist) and is written to the `Implementation Plan` and
`Implementation Plan For AI` custom fields.

Once the plan is ready, the agent transitions the issue to `PLAN REVIEW` and waits for human approval.

- **Happy path:** the human approves and moves the issue to `READY FOR IMPLEMENTATION`.
- **Unhappy path:** the human rejects the plan (optionally with a comment explaining why) and moves the issue back to 
  `PLAN`. The agent re-generates the plan taking the feedback into account.

### Phase 3 — Implementation

When the issue reaches `READY FOR IMPLEMENTATION`, the agent transitions it to `IN PROGRESS` and begins generating code
based on the approved plan.

If the agent encounters ambiguity during implementation, it can:
1. Transition the issue to `BLOCKED FOR CODE CLARIFICATION`
2. Post a comment with specific implementation questions
3. Wait for a human to reply and move the issue back to `IN PROGRESS`

Once the code is complete, the agent:
1. Commits and pushes the code to a feature branch → transitions to `CODE COMMITTED`
2. Creates a Pull Request on GitHub → transitions to `PR IN REVIEW` and posts the PR URL as a comment

### Phase 4 — PR Review

During `PR IN REVIEW`, a human reviews the pull request on GitHub.

- **Approved & merged:** the agent transitions to `PR APPROVED`, then to `DONE`. Branch is cleaned up.
- **Changes requested:** the agent transitions to `PR CHANGES REQUESTED`, then back to `IN PROGRESS` to apply the 
  requested changes (re-enters Phase 3).

### Cancellation & Failure

- A human can cancel any ticket at any time by moving it to `CANCELLED` — the workflow stops immediately.
- If the agent encounters an unrecoverable error during implementation or later phases, it transitions the issue to 
  `FAILURE`.

### Source of Truth

The source of truth of the Jira issues is the JIRA cloud itself. The agent works only one issue at a time, and it picks
the next issue only when the current one is marked as Done, Cancelled, or Failure. The agent updates the status of the
issue in Jira to reflect its progress through the workflow.

The agent also handles VCS operations, such as committing code changes and creating Pull Requests on GitHub. It uses a
version control module to abstract away the details of Git operations and GitHub API interactions.

## Architecture

### Core Services

Core services serve operations for the modules, such as configuration management, logging, and error handling. 
They provide foundational functionality that other modules depend on.

#### Configuration Service
- Loads configuration from environment variables or config files.
- Provides a centralized way to access configuration values across modules.
- Supports validation and default values for configuration settings.

#### Logging Service
- Provides a consistent logging interface for all modules.
- Supports different log levels (info, warning, error) and structured logging.

#### Error Handling Service
- Defines custom error classes for different error scenarios (e.g., API errors, validation errors, implementation errors).
- Provides utilities for error logging and reporting.
- Supports retry logic and failure handling strategies.

#### Event Bus
- An in-process pub/sub system for emitting and listening to events across modules.
- Allows for decoupled communication between modules (e.g., issue status changes, plan generation completion, code 
  implementation results).

#### API Server
- A Fastify-based REST and WebSocket API server that serves the dashboard frontend.
- Provides endpoints for fetching issue data, plan details, code changes, and real-time updates via WebSockets.

#### Version Control Service
- Abstracts Git operations and GitHub API interactions.
- Provides methods for creating branches, committing code, pushing changes, and managing Pull Requests.

#### AI Agent Service — Investigation
- Abstracts the AI model interaction for the Investigation phase.
- Implements the `IssueInvestigator` interface — analyses raw issues, runs quality checks
  (clarity, completeness, ambiguity, specificity, conflict detection, scope), and produces either
  a `Description For AI` or a list of clarification questions.
- Supports configuration of AI parameters (model choice, temperature, max tokens) and handles API
  rate limits and errors.

#### AI Agent Service — Planning
- Abstracts the AI model interaction for the Planning phase.
- Implements the `PlanGenerator` interface — generates `Implementation Plan` (human-readable) and `Implementation Plan For AI`
  (machine-parseable) from the `Description For AI` field.
- Supports plan refinement after human rejection feedback.

#### AI Agent Service — Code Implementation
- Abstracts the AI model interaction for the Implementation phase.
- Implements the `CodeImplementer` interface — generates code changes from `Implementation Plan For AI`, applies
  PR review feedback, and handles code clarification responses.
- Supports configuration of AI parameters and handles API rate limits and errors.

#### Issue Tracker Service
- Abstracts interactions with the issue tracker (e.g., Jira API) through two low-level interfaces:
  - `IssueReader` — fetching issues by status, reading issue details, reading comments, reading custom fields.
  - `IssueWriter` — `transitionStatus(issueKey, statusName)`, `addComment(issueKey, body)`, 
    `updateCustomField(issueKey, fieldName, value)`.
- These interfaces are the **adapter layer** — the Issue Tracker Module builds high-level operations on top of them.
- Supports configuration of issue tracker parameters (e.g., project key, workflow statuses).
- See [service-interfaces.md](3-interfaces.md) for full method signatures of all interfaces.

#### Storage Service
- Abstracts interactions with the database (e.g., MongoDB).
- Provides methods for storing and retrieving agent runtime state, execution history, and metrics.
- Supports configuration of database connection parameters and handles connection pooling and errors.

#### Conductor Service
- The main orchestrator that manages the workflow of picking up issues, investigating them,
  generating plans, implementing code, and updating Jira tickets.
- Coordinates the interactions between the Issue Investigation Module, AI Planning Module,
  AI Code Implementation Module, Issue Tracker Module, Version Control Module, Storage Service,
  and Event Bus to drive the full lifecycle of each ticket.

#### Dashboard Frontend
- A React-based frontend that connects to the API Server to display the queue of issues, their details, generated 
  plans, and implementation progress.
- Provides real-time updates on the status of each issue and allows users to monitor the agent's activity across 
  multiple agents if needed.

#### Testing and Mocks
- A set of test utilities and mock implementations for each module to facilitate unit testing and integration testing.
- Allows for testing the Conductor Service in isolation by mocking dependencies like the Issue
  Investigation Module, AI Planning Module, AI Code Implementation Module, Issue Tracker Module,
  Version Control Module, and Storage Service.
 
### Modules

#### Issue Tracker Module
Handles all interactions with the issue tracker (e.g., Jira).
It depends on the Issue Tracker Service (`IssueReader` and `IssueWriter` interfaces) to perform low-level operations
and builds high-level, workflow-aware methods on top of them.
It does not expose basic operations like `transitionStatus` or `addComment` directly to the Conductor — instead it
provides composite operations that combine status transitions, comments, and custom field writes in a single call:
- fetch next issue (polls for `SELECTED FOR TRIAGE`)
- start investigation (→ `ISSUE INVESTIGATION`)
- mark issue blocked for plan clarification and adds comment (→ `BLOCKED FOR PLAN CLARIFICATION`)
- move to plan (→ `PLAN`) and write `Description For AI` custom field
- move to plan review (→ `PLAN REVIEW`) and write `Implementation Plan` + `Implementation Plan For AI` custom fields
- start implementation (→ `IN PROGRESS`)
- mark issue blocked for code clarification and adds comment (→ `BLOCKED FOR CODE CLARIFICATION`)
- mark code committed (→ `CODE COMMITTED`)
- mark PR in review and adds PR URL comment (→ `PR IN REVIEW`)
- mark PR approved (→ `PR APPROVED`)
- mark issue done (→ `DONE`)
- mark issue PR changes requested and adds comment (→ `PR CHANGES REQUESTED`)
- mark issue failed (→ `FAILURE`)
- cancel issue (→ `CANCELLED` — human action, not agent)

#### Issue Investigation Module
Responsible for Phase 1 of the workflow — analysing a raw issue and deciding whether it is ready
for planning. The Conductor calls this module after picking up an issue in `SELECTED FOR TRIAGE`.

The module uses the AI Agent Service to analyse the issue and produces one of two outcomes:
- **Ready:** the issue is clear, unambiguous, and self-contained → produces a `Description For AI`
  text and signals the Conductor to proceed to `PLAN`.
- **Needs clarification:** the issue is ambiguous, too short, incomplete, conflicting with other
  issues, or otherwise not actionable → produces a list of clarification questions and signals the
  Conductor to block the issue.

Quality checks performed during investigation:
- **Clarity** — is the description clear enough to derive implementation steps?
- **Completeness** — are acceptance criteria, expected behaviour, and scope defined?
- **Ambiguity** — are there multiple possible interpretations?
- **Specificity** — is it precise enough, or too vague / hand-wavy?
- **Conflict detection** — does it contradict or duplicate other known issues?
- **Scope** — is it a single, well-bounded unit of work?

It depends on:
- `AI Agent Service` (`IssueInvestigator` interface) — to perform the AI-powered analysis.
- `Issue Tracker Module` — to read issue details and related issues (via the Conductor).

It does not interact with Jira directly — the Conductor handles all Jira state transitions.

#### AI Planning Module
Generates implementation plans based on issue details.
It uses the `PlanGenerator` interface to generate both `Implementation Plan` (human-readable) and `Implementation Plan For AI`
(machine-parseable) from the `Description For AI` custom field.
It supports plan refinement when a human rejects the plan and provides feedback.
It does not interact with Jira directly — the Conductor handles all Jira state transitions.

#### AI Code Implementation Module
Generates code changes based on the approved `Implementation Plan For AI`.
It uses the `CodeImplementer` interface to produce `CodeChanges` (file create/modify/delete)
that the Version Control Module can commit.
It supports:
- Full plan implementation from `Implementation Plan For AI`
- Applying PR review feedback (changes requested)
- Continuing implementation after human code clarification
It does not interact with Jira or Git directly — the Conductor coordinates between this module,
the Issue Tracker Module, and the Version Control Module.
