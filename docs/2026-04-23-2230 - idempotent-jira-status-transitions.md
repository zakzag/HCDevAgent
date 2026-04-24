# Idempotent Jira Status Transitions

**Date:** 2026-04-23 22:30  
**Type:** Architecture / Design Decision  
**Affects:** Agent issue-tracker module, Jira transition handling, workflow reliability

## Summary

Updated the issue-tracker workflow operations to treat Jira status transitions as **idempotent**.

Before invoking the low-level writer transition API, `IssueTrackerModule` now reads the current issue status and skips the transition when the issue is already in the requested target status.

## Why This Change Was Needed

Jira only exposes transitions that are valid **from the current state**.
If an issue has already been moved externally (for example by a human or another automation) into the target state, Jira will not return a transition back into the same state.

That previously caused failures such as:

- requested status: `Issue Investigation`
- current Jira status already: `Issue Investigation`
- available transitions only include outgoing states like `Plan`, `Backlog`, or `Cancelled`

In that situation, the previous implementation threw `IntegrationError` even though the desired workflow state had already been reached.

## Decision

`IssueTrackerModule` now uses the current issue status as the source of truth before performing a workflow transition.

If `currentStatus === targetStatus` (case-insensitive):

- do not call `IssueWriter.transitionStatus`
- log that the transition was skipped
- continue the workflow normally

This keeps higher-level workflow operations resilient to race conditions and external Jira changes.

## Scope

The current implementation applies this behavior to the already implemented workflow methods:

- `startInvestigation`
- `markBlockedForPlanClarification`
- `moveToPlan`
- `markFailed`

## Additional Diagnostics

`JiraIssueWriter` transition lookup failures now include richer error context:

- transition id
- transition name
- destination status name

This makes workflow mismatches easier to diagnose from logs.

## Related Files

- `packages/agent/src/modules/issueTracker/IssueTrackerModule.ts`
- `packages/agent/src/services/issueTracker/JiraIssueWriter.ts`
- `packages/agent/src/test/modules/IssueTrackerModule.test.ts`
- `packages/agent/src/test/mocks/JiraIssueWriter.test.ts`

