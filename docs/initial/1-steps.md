# HCDevAgent — Implementation Steps

> Each step includes unit tests and mocks alongside the implementation.
> Each step must produce a runnable application that demonstrates the step's functionality.

| # | Step | Short Description |
|---|------|-------------------|
| 1 | **Project Setup** | Monorepo scaffold, TypeScript strict mode, Vite, ESLint (Airbnb), Vitest, InversifyJS, folder structure |
| 2 | **Conductor Scaffold** | Runnable agent with real polling loop, Jira Cloud integration, IssueTrackerOperations module, stub investigator, CLI entry points |
| 3 | **Issue Investigation Module** | Real AI-powered `OpenAiIssueInvestigator` with six quality checks, clarification loop, `Description For AI` generation |
