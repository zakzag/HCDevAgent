# HCDevAgent — Implementation Steps

> Each step includes unit tests and mocks alongside the implementation.

| # | Step | Short Description |
|---|------|-------------------|
| 1 | **Project Setup** | Monorepo scaffold, TypeScript strict mode, Vite, ESLint (Airbnb), Vitest, InversifyJS, folder structure |
| 2 | **Configuration Service** | Load and validate config from env/config files, typed access, default values |
| 3 | **Logging Service** | Pino-based structured logging, log levels, injectable logger |
| 4 | **Error Handling Service** | Custom error classes, retry logic, error reporting utilities |
| 5 | **Event Bus** | In-process typed pub/sub system for decoupled module communication |
| 6 | **Storage Service** | MongoDB/Mongoose connection, `activeIssues` collection, execution history, audit log |
| 7 | **Issue Tracker Service + Module** | `IssueReader`/`IssueWriter` adapters (Jira) + high-level `IssueTrackerOperations` module |
| 8 | **Issue Investigation Module** | `IssueInvestigator` — quality checks, clarification detection, `Description For AI` generation |
| 9 | **AI Planning Module** | `PlanGenerator` — generates `Implementation Plan` (human) + `Implementation Plan For AI` (machine) from `Description For AI` |
| 10 | **AI Code Implementation Module** | `CodeImplementer` — generates code changes from `Implementation Plan For AI`, handles PR feedback |
| 11 | **Version Control Module** | Git operations and GitHub API — branch, commit, push, pull request management |
| 12 | **Conductor Service** | Main workflow orchestrator — coordinates all modules through the full issue lifecycle |
| 13 | **API Server** | Fastify REST + WebSocket server, endpoints for issue data, plan details, real-time updates |
| 14 | **Dashboard Frontend** | React UI — issue queue, plan viewer, implementation progress, real-time status |

