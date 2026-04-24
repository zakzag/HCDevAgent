# Jira Issue Workflow Events

## Overview

Every write the agent makes to a Jira issue ultimately goes through the `IssueWriter` interface,
which is a **low-level adapter** implemented by the Issue Tracker Service. It exposes three
primitive operations:

| Method | Description |
|---|---|
| `transitionStatus(issueKey, statusName)` | Move the issue to a new workflow status |
| `addComment(issueKey, body)` | Post a comment on the issue |
| `updateCustomField(issueKey, fieldName, value)` | Write a value to a custom Jira field |

> **Note:** The Conductor does **not** call `IssueWriter` directly. It calls the high-level
> methods on the **Issue Tracker Module** (e.g., `markBlockedForPlanClarification`,
> `startInvestigation`), which internally compose one or more `IssueWriter` and `IssueReader`
> calls. The table below shows the underlying `IssueWriter` method(s) that each event triggers.

The status names used in calls to `transitionStatus` are resolved at runtime from
`config.jira.statusMapping` — see [environment-config.md](environment-config.md#status-mapping)
for the full mapping.

Source: `src/services/issueTracker/IssueWriter.ts`, `src/services/issueTracker/IssueReader.ts`

---

## All Modification Events

Events are ordered by when they occur in the ticket's lifecycle.
Human rows are included for context — they are **not** agent writes.

| #  | Phase                                | From Status                      | Jira Change                        | Action initiator | `IssueWriter` Method | Description                                                             |
|----|--------------------------------------|----------------------------------|------------------------------------|------------------|----------------------|-------------------------------------------------------------------------|
| 1  | Pickup                               | `BACKLOG`                        | → `SELECTED FOR TRIAGE`            | Human            | —                    | Human selects issue for triage — triggers the workflow                  |
| 2  | Pickup                               | `SELECTED FOR TRIAGE`            | → `ISSUE INVESTIGATION`            | Agent            | `transitionStatus`   | Agent picks up the issue and starts investigation                       |
| 3  | Investigation — clarification        | `ISSUE INVESTIGATION`            | → `BLOCKED FOR PLAN CLARIFICATION` | Agent            | `transitionStatus`   | AI needs clarification before planning can begin                        |
| 4  | Investigation — clarification        | `BLOCKED FOR PLAN CLARIFICATION` | new comment                        | Agent            | `addComment`         | AI posts clarification questions for the human to answer                |
| 5  | Investigation — clarification        | `BLOCKED FOR PLAN CLARIFICATION` | —                                  | Human            | —                    | Human replies to comment — agent re-queues internally, no Jira write    |
| 6  | Investigation — clarification        | `BLOCKED FOR PLAN CLARIFICATION` | → `ISSUE INVESTIGATION`            | Human            | —                    | Human sets status to queue issue again                                  |
| 7  | Investigation — complete             | `ISSUE INVESTIGATION`            | field update                       | Agent            | `updateCustomField`  | AI writes enhanced description to the `Description For AI` custom field |
| 8  | Planning                             | `ISSUE INVESTIGATION`            | → `PLAN`                           | Agent            | `transitionStatus`   | "Description for AI" produced — issue moves into plan status            |
| 9  | Planning                             | `PLAN`                           | field update                       | Agent            | `updateCustomField`  | AI writes human-readable plan to `Implementation Plan` custom field     |
| 10 | Planning                             | `PLAN`                           | → `PLAN REVIEW`                    | Agent            | `transitionStatus`   | Reviewer-facing plan ready for human review                             |
| 11 | Planning                             | `PLAN REVIEW`                    | → `READY FOR IMPLEMENTATION`       | Human            | —                    | Happy Path: Human approves the plan in Jira                             |
| 12 | Planning                             | `READY FOR IMPLEMENTATION`       | field update                       | Agent            | `updateCustomField`  | Agent writes machine-parseable plan to `Implementation Plan For AI` custom field |
| 13 | Planning                             | `PLAN REVIEW`                    | new comment                        | Human            | —                    | Unhappy Path: Human writes comment why plan was rejected                |
| 14 | Planning                             | `PLAN REVIEW`                    | → `PLAN`                           | Human            | —                    | Unhappy Path: Human rejects the plan — agent re-runs reviewer-plan generation |
| 15 | Implementation — start (or re-entry) | `READY FOR IMPLEMENTATION`       | → `IN PROGRESS`                    | Agent            | `transitionStatus`   | Agent starts Phase 3 — code implementation after `Implementation Plan For AI` exists |
| 16 | Implementation — start (or re-entry) | `IN PROGRESS`                    | field update                       | Agent            | `updateCustomField`  | Agent writes `Branch Name` custom field with the created branch name    |
| 17 | Implementation                       | `IN PROGRESS`                    | → `BLOCKED FOR CODE CLARIFICATION` | Agent            | `transitionStatus`   | AI cannot implement without more information                            |
| 18 | Implementation                       | `BLOCKED FOR CODE CLARIFICATION` | new comment                        | Agent            | `addComment`         | AI posts implementation questions for the human to answer               |
| 19 | Implementation                       | `BLOCKED FOR CODE CLARIFICATION` | —                                  | Human            | —                    | Human replies to comment — agent re-queues internally, no Jira write    |
| 20 | Implementation                       | `BLOCKED FOR CODE CLARIFICATION` | → `IN PROGRESS`                    | Human            | —                    | Human sets status to resume implementation                              |
| 21 | Implementation — code committed      | `IN PROGRESS`                    | → `CODE COMMITTED`                 | Agent            | `transitionStatus`   | AI committed and pushed code to the feature branch                      |
| 22 | Implementation — PR created          | `CODE COMMITTED`                 | → `PR IN REVIEW`                   | Agent            | `transitionStatus`   | Pull request created on GitHub                                          |
| 23 | Implementation — PR created          | `PR IN REVIEW`                   | field update                       | Agent            | `updateCustomField`  | Agent writes `PR URL` custom field with the pull request URL            |
| 24 | Implementation — PR created          | `PR IN REVIEW`                   | new comment                        | Agent            | `addComment`         | Agent posts the PR URL as a comment on the Jira issue                   |
| 25 | PR review                            | `PR IN REVIEW`                   | —                                  | Human            | —                    | Reviewer reviews the pull request on GitHub                             |
| 26 | PR review                            | `PR IN REVIEW`                   | → `PR APPROVED`                    | Agent            | `transitionStatus`   | PR merged on GitHub                                                     |
| 27 | PR review                            | `PR APPROVED`                    | → `DONE`                           | Agent            | `transitionStatus`   | Ticket complete — branch cleaned up                                     |
| 28 | PR changes requested                 | `PR IN REVIEW`                   | → `PR CHANGES REQUESTED`           | Agent            | `transitionStatus`   | Reviewer requested changes on the PR                                    |
| 29 | PR changes requested                 | `PR CHANGES REQUESTED`           | → `IN PROGRESS`                    | Agent            | `transitionStatus`   | Agent re-enters Phase 3 to apply the requested changes                  |
| 30 | —                                    | Any                              | → `CANCELLED`                      | Human            | —                    | Human cancels the ticket — workflow stops                               |
| 31 | Failure                              | `IN PROGRESS`                    | field update                       | Agent            | `updateCustomField`  | Agent writes `Failure Reason` custom field                              |
| 32 | Failure                              | `IN PROGRESS`                    | → `FAILURE`                        | Agent            | `transitionStatus`   | Unrecoverable error during implementation                               |
| 33 | Failure                              | `CODE COMMITTED`                 | field update                       | Agent            | `updateCustomField`  | Agent writes `Failure Reason` custom field                              |
| 34 | Failure                              | `CODE COMMITTED`                 | → `FAILURE`                        | Agent            | `transitionStatus`   | Unrecoverable error after code commit                                   |
| 35 | Failure                              | `PR IN REVIEW`                   | field update                       | Agent            | `updateCustomField`  | Agent writes `Failure Reason` custom field                              |
| 36 | Failure                              | `PR IN REVIEW`                   | → `FAILURE`                        | Agent            | `transitionStatus`   | Unrecoverable error during PR review phase                              |
| 37 | Failure                              | `PR APPROVED`                    | field update                       | Agent            | `updateCustomField`  | Agent writes `Failure Reason` custom field                              |
| 38 | Failure                              | `PR APPROVED`                    | → `FAILURE`                        | Agent            | `transitionStatus`   | Unrecoverable error after PR approval                                   |

---

## Summary by Modification Type

| Modification Type | Count | Event Numbers |
|---|---|---|
| `transitionStatus` | 16 | 2, 3, 8, 11, 15, 17, 21, 22, 26, 27, 28, 29, 32, 34, 36, 38 |
| `addComment` | 3 | 4, 18, 24 |
| `updateCustomField` | 9 | 7, 9, 10, 16, 23, 31, 33, 35, 37 |
| **Total agent writes** | **28** | |

---

## Summary by Workflow Phase

| Workflow Phase                       | Status Transitions | Comments | Custom Field Updates |
|--------------------------------------|--------------------|----------|----------------------|
| Pickup                               | 1                  | 0        | 0                    |
| Investigation — clarification        | 1                  | 1        | 1                    |
| Planning                             | 2                  | 0        | 2                    |
| Implementation — start (or re-entry) | 1                  | 0        | 1                    |
| Implementation                       | 1                  | 1        | 0                    |
| Implementation — code committed      | 1                  | 0        | 0                    |
| Implementation — PR created          | 1                  | 1        | 1                    |
| PR review                            | 2                  | 0        | 0                    |
| PR changes requested                 | 2                  | 0        | 0                    |
| Failure                              | 4                  | 0        | 4                    |
| **Total**                            | **16**             | **3**    | **9**                |
