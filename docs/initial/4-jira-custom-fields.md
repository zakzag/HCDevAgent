# HCDevAgent — Jira Custom Fields

> This document defines every custom Jira field the agent reads or writes. These fields are the
> primary data exchange mechanism between the agent and human reviewers — Jira is the source of
> truth for all issue-level data.
>
> See [1-initial-description.md](0-initial-description.md) for workflow overview and
> [3-interfaces.md](3-interfaces.md) for the `IssueWriter.updateCustomField` method.

---

## Field Summary

| # | Field Name | Jira Field Key | Written by | Read by | Phase |
|---|---|---|---|---|---|
| 1 | Description For AI | `description_for_ai` | Agent | Agent (Planning) | Investigation |
| 2 | Implementation Plan | `implementation_plan` | Agent | Human | Planning |
| 3 | Implementation Plan For AI | `implementation_plan_for_ai` | Agent | Agent (Implementation) | Planning |
| 4 | Branch Name | `branch_name` | Agent | Human, Agent (recovery) | Implementation |
| 5 | PR URL | `pr_url` | Agent | Human, Agent (recovery) | Implementation |
| 6 | Failure Reason | `failure_reason` | Agent | Human | Failure |

---

## 1. Description For AI

| Property | Value |
|---|---|
| **Jira field key** | `description_for_ai` |
| **Type** | Multi-line text |
| **Written during** | Phase 1 — Investigation (event #7) |
| **Written by** | Agent (via `IssueWriter.updateCustomField`) |
| **Read by** | Agent — the Planning phase consumes this as input |
| **Visible to** | Humans (read-only context) |

### Purpose

A standardized, AI-friendly reformulation of the original issue description. The Investigation
Module analyses the raw issue and produces this field so that downstream AI phases (planning,
implementation) receive clean, structured input instead of raw human text.

### Format

```markdown
## Summary
One-paragraph summary of what needs to be done.

## Goal
What is the desired end state or behaviour after implementation.

## Requirements
- Requirement 1
- Requirement 2
- …

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- …

## Constraints
Any technical constraints, dependencies, or limitations.

## Context
Relevant background information, related issues, or prior decisions.
```

### Notes
- The original issue description is **not modified** — this field is a separate, parallel
  representation.
- If the Investigation Module requests clarification and the human replies, the field is
  regenerated incorporating the clarification.

---

## 2. Implementation Plan

| Property | Value |
|---|---|
| **Jira field key** | `implementation_plan` |
| **Type** | Multi-line text |
| **Written during** | Phase 2 — Planning (events #9) |
| **Written by** | Agent (via `IssueWriter.updateCustomField`) |
| **Read by** | Human reviewer — this is what the human approves or rejects |
| **Visible to** | Humans (primary review artifact) |

### Purpose

A human-readable implementation plan. This is the document the human reviews during `PLAN REVIEW`
to decide whether to approve or reject. It should be written in clear, natural language — not
optimized for machine parsing.

### Format

```markdown
## Summary
Brief overview of what will be implemented and why.

## Approach
High-level description of the technical approach chosen.

## Steps
1. **Step title** — Description of what this step does and why.
2. **Step title** — Description of what this step does and why.
3. …

## Files Affected
- `path/to/file.ts` — what changes and why
- `path/to/other.ts` — what changes and why

## Testing Strategy
How the implementation will be tested (unit tests, integration tests, edge cases).

## Risks & Open Questions
Any risks, assumptions, or questions that remain.

## Checklist
- [ ] All steps implemented
- [ ] Tests written and passing
- [ ] No regressions introduced
- [ ] Documentation updated
```

### Notes
- When the human rejects the plan and moves the issue back to `PLAN`, the agent regenerates this
  field taking the rejection comment into account.
- This field is for **human consumption only** — the agent reads `Implementation Plan For AI` instead.

---

## 3. Implementation Plan For AI

| Property | Value |
|---|---|
| **Jira field key** | `implementation_plan_for_ai` |
| **Type** | Multi-line text |
| **Written during** | Phase 2 — Planning (events #10, alongside `Implementation Plan`) |
| **Written by** | Agent (via `IssueWriter.updateCustomField`) |
| **Read by** | Agent — the Implementation phase consumes this as its primary input |
| **Visible to** | Humans (read-only reference) |

### Purpose

A standardized, machine-parseable version of the implementation plan with mandatory fields and
strict structure. The Implementation Module reads this field to know exactly what code changes to
produce. The structure is designed so the AI can unambiguously extract each step, its expected
input/output, file paths, and verification criteria.

### Format

All sections are **mandatory**. The AI implementation phase will reject a plan that is missing any
section.

```markdown
## META
- issueKey: PROJ-123
- baseBranch: main
- targetBranch: agent/PROJ-123
- estimatedFiles: 5
- estimatedSteps: 3

## DESCRIPTION
Single-paragraph machine-readable summary derived from `Description For AI`.

## STEPS
### STEP 1: <title>
- action: create | modify | delete
- file: path/to/file.ts
- description: What to do in this file and why.
- dependencies: [STEP 2] (if this step depends on another)
- verification: How to verify this step is correct.

### STEP 2: <title>
- action: create | modify | delete
- file: path/to/other.ts
- description: What to do in this file and why.
- dependencies: []
- verification: How to verify this step is correct.

## TESTS
### TEST 1: <title>
- file: path/to/file.test.ts
- covers: [STEP 1]
- cases:
  - happy path: description
  - error case: description
  - edge case: description

## VERIFICATION
- [ ] All steps produce compilable code
- [ ] All tests pass
- [ ] No existing tests broken
- [ ] Linting passes
```

### Notes
- `Implementation Plan` and `Implementation Plan For AI` are written at the same time during the Planning phase. They represent
  the same plan in two formats: one for humans, one for the AI.
- When a plan is rejected and regenerated, **both fields** are updated.
- The strict structure allows the Implementation Module to iterate step-by-step and verify each
  step independently.

---

## 4. Branch Name

| Property | Value |
|---|---|
| **Jira field key** | `branch_name` |
| **Type** | Single-line text |
| **Written during** | Phase 3 — Implementation (when the branch is created) |
| **Written by** | Agent (via `IssueWriter.updateCustomField`) |
| **Read by** | Human (quick reference), Agent (crash recovery) |
| **Visible to** | Humans |

### Purpose

Stores the Git branch name the agent created for this issue. Useful for:
- Humans to quickly find the branch without searching GitHub.
- Agent crash recovery — on restart, the agent can read this field to know which branch to resume
  work on.

### Format

```
agent/PROJ-123
```

Convention: `agent/<issueKey>` (configurable via `config.vcs.branchPattern`).

---

## 5. PR URL

| Property | Value |
|---|---|
| **Jira field key** | `pr_url` |
| **Type** | Single-line text (URL) |
| **Written during** | Phase 3 — Implementation (when the PR is created, events #22–24) |
| **Written by** | Agent (via `IssueWriter.updateCustomField`) |
| **Read by** | Human (quick link), Agent (crash recovery, PR status checks) |
| **Visible to** | Humans |

### Purpose

Stores the pull request URL. The PR URL is **also** posted as a Jira comment (event #24), but
having it as a queryable field makes it easier to:
- Link from the dashboard.
- Find the PR during agent recovery after a crash.
- Build Jira filters/reports that include PR links.

### Format

```
https://github.com/org/repo/pull/42
```

---

## 6. Failure Reason

| Property | Value |
|---|---|
| **Jira field key** | `failure_reason` |
| **Type** | Multi-line text |
| **Written during** | Failure (events #31, #33, #35, #37) |
| **Written by** | Agent (via `IssueWriter.updateCustomField`) |
| **Read by** | Human (to understand what went wrong) |
| **Visible to** | Humans |

### Purpose

When the agent transitions an issue to `FAILURE`, this field records the reason. While the failure
is also posted as a comment, having it in a dedicated field makes it:
- Searchable / filterable in Jira.
- Visible at a glance on the issue detail screen.
- Available for dashboard reporting.

### Format

```markdown
## Error
Brief error message.

## Phase
Which phase failed (Investigation / Planning / Implementation / PR Review).

## Details
Full error details, stack trace, or explanation of why the agent could not continue.

## Last Successful Step
The last step that completed successfully before the failure (if applicable).
```

---

## Workflow Events → Custom Field Mapping

Updated mapping of which workflow events write which custom fields:

| Event # | Phase | Custom Field Written |
|---|---|---|
| 7 | Investigation | `Description For AI` |
| 9 | Planning | `Implementation Plan` |
| 10 | Planning | `Implementation Plan For AI` |
| 16 | Implementation (branch created) | `Branch Name` |
| 23 | Implementation (PR created) | `PR URL` |
| 31, 33, 35, 37 | Failure | `Failure Reason` |

