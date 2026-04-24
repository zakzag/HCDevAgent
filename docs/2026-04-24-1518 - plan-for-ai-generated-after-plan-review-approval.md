# Plan For AI Generated After Plan Review Approval

**Date:** 2026-04-24 15:18  
**Type:** Architecture / Design Decision  
**Affects:** planning workflow, prompt design, Jira field timing, conductor orchestration

## Summary

The planning workflow is split into two sequential artifacts:

1. `Implementation Plan` is generated while the issue is in `PLAN` and is reviewed by a human in `PLAN REVIEW`.
2. `Implementation Plan For AI` is generated only after that reviewer-facing plan is approved and the issue reaches `READY FOR IMPLEMENTATION`.

## Why

Generating the machine-readable implementation contract before review created two problems:

- the implementation agent could receive a plan that had not yet been approved by a human
- rejected reviewer feedback forced regeneration of both artifacts even though only the human-facing plan was under review

By delaying `Implementation Plan For AI` until after approval, the machine plan is guaranteed to reflect the approved reviewer plan.

## Decision

- While the issue is in `PLAN`, the agent generates only `Implementation Plan`.
- `moveToPlanReview()` writes only `Implementation Plan` and transitions to `PLAN REVIEW`.
- If a human rejects the plan and moves the issue back to `PLAN`, the agent refines only `Implementation Plan`.
- When the issue reaches `READY FOR IMPLEMENTATION`, the agent reads the approved `Implementation Plan` plus `Description For AI` and generates `Implementation Plan For AI`.
- `Implementation Plan For AI` is persisted without another planning-status transition.

## Expected Operational Outcome

- Human review happens against the exact artifact intended for human review.
- The implementation phase starts only after a machine-readable plan has been derived from an approved human plan.
- Rejection loops stay focused on the reviewer plan and do not prematurely regenerate implementation instructions.

## Related Files

- `packages/shared/src/interfaces/PlanGenerator.ts`
- `packages/shared/src/interfaces/IssueTrackerOperations.ts`
- `packages/shared/src/interfaces/PromptRegistry.ts`
- `packages/agent/src/modules/planning/CopilotPlanGenerator.ts`
- `packages/agent/src/modules/issueTracker/IssueTrackerModule.ts`
- `packages/agent/src/conductor/Conductor.ts`
- `packages/agent/src/services/prompts/templates/planning.prompts.ts`
- `docs/initial/0-initial-description.md`
- `docs/initial/2-issue-workflow-events.md`
- `docs/initial/3-interfaces.md`
- `docs/initial/4-jira-custom-fields.md`

