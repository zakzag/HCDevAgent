# Investigation Bypass via Comment Command

**Date:** 2026-04-27  
**Status:** Implemented

## Context

The investigation phase analyses every Jira issue with an AI model before allowing it to proceed to planning. In some situations the issue owner already knows the answer to the investigator's questions and wants to force the issue forward without another round of clarification. The current flow had no escape hatch for this, causing the issue to cycle back into `BLOCKED FOR PLAN CLARIFICATION` indefinitely.

## Decision

Add an opt-in bypass mechanism controlled by a new `investigator.bypass` block in the target project's `.agent/project-settings.json`.

When the feature is **enabled** and any of the issue's comments contains one of the configured **trigger phrases** (case-insensitive, substring match), the `CopilotIssueInvestigator` short-circuits the AI call entirely. It builds a synthetic `InvestigationResult` (`ready = true`) directly from the issue's `summary` and `description` fields and promotes the issue straight to planning.

## New `project-settings.json` fields

```json
{
  "investigator": {
    "bypass": {
      "enabled": true,
      "triggerPhrases": [
        "!bypass-investigation",
        "please ignore investigation",
        "skip investigation"
      ]
    }
  }
}
```

| Field | Type | Default | Description |
|---|---|---|---|
| `bypass.enabled` | `boolean` | `true` | Master switch. Set to `false` to disable the feature for the project. |
| `bypass.triggerPhrases` | `string[]` | see above | Any comment whose body contains one of these strings (case-insensitive) triggers the bypass. |

## How to trigger bypass

1. The agent has posted clarification questions and moved the issue to **BLOCKED FOR PLAN CLARIFICATION**.  
2. Write a comment on the issue containing any configured trigger phrase (e.g. `"!bypass-investigation"`).  
3. Manually move the issue back to **SELECTED FOR TRIAGE**.  
4. On the next agent tick the bypass is detected and the issue is promoted to **PLAN** immediately.

## Implementation details

- **`InvestigatorBypassSettings`** — new interface in `packages/shared/src/types/phases.types.ts`.  
- **`PreparedInvestigationContext.bypassSettings`** — carries bypass config from `WorkspaceInvestigationContextProvider` to `CopilotIssueInvestigator`.  
- **`detectInvestigationBypass(issue, bypassSettings)`** — pure helper in `packages/agent/src/modules/investigation/investigationBypass.ts`. Scans all comments, returns the first matching one.  
- **`buildBypassedInvestigationResult(issue, contextUsed, triggeringComment)`** — pure helper in the same file. Creates a synthetic `InvestigationResult` with all quality dimensions passing and all auto-fixability scores set to 100.  
- **`CopilotIssueInvestigator.investigate()`** — calls `detectInvestigationBypass` after loading context; if triggered, skips the AI call and returns the bypassed result.

## Trade-offs

| Concern | Mitigation |
|---|---|
| Anyone can write a bypass comment | `bypass.enabled` can be set to `false` per project; trigger phrases are project-configurable. |
| Bypassed issues may have thin descriptions | The issue description goes to planning as-is; planning will handle thin context the same way it would any other issue. |
| No visibility in Jira | The agent logs an `info` message including the comment author and id; a future enhancement can post a Jira comment as an audit trail. |

## Consequences

- The `PreparedInvestigationContext` type now has a required `bypassSettings` field — all mocks and tests must supply it.  
- Existing behaviour is unchanged when `bypass.enabled = false` or when no comment matches.

