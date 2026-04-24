# Jira ADF Custom Field Handling

**Date:** 2026-04-23 23:28  
**Type:** Architecture / Design Decision  
**Affects:** Jira issue writer, Jira issue reader, custom-field serialization

## Summary

Updated the Jira adapter layer to support Jira Cloud custom fields that require **Atlassian Document Format (ADF)** instead of plain strings.

The issue surfaced when updating `Description For AI` (`customfield_10164`) with markdown text. Jira accepted the field as editable, but rejected the update payload with:

- `Operation value must be an Atlassian Document (see the Atlassian Document Format)`

## Decision

The Jira adapter now decides field serialization in `JiraIssueWriter` based on field metadata from:

- `GET /rest/api/3/issue/{issueKey}/editmeta`

If the field schema indicates a Jira textarea, the writer converts the plain string into a minimal ADF document before sending the update.

If the field is a normal single-line text field, the writer continues sending a plain string.

## Known HCDevAgent Multi-line Fields

These fields are currently treated as multi-line / ADF-capable by default:

- `Description For AI`
- `Implementation Plan`
- `Implementation Plan For AI`
- `Failure Reason`

This acts as a conservative fallback when Jira metadata is incomplete.

## Read Compatibility

`JiraIssueReader` now also normalizes ADF-backed custom fields back into plain text.

That keeps the public application contracts unchanged:

- `IssueReader.getCustomField()` still returns `string | null`
- `InvestigationResult.descriptionForAi` still remains a markdown string
- planning and workflow code do not need to understand ADF directly

## Serialization Strategy

The writer uses a minimal ADF representation:

- top-level `doc`
- `paragraph` blocks
- `text` nodes
- `hardBreak` nodes for line breaks inside a paragraph

This is intentionally simple and dependency-free. The agent preserves the original markdown text content while satisfying Jira's payload requirements.

## Why This Approach

This keeps Jira-specific document formatting isolated to the issue-tracker adapter layer.

Benefits:

- no public interface changes
- no planning/investigation type changes
- no Jira-specific logic leaking into higher-level modules
- future multi-line Jira fields can reuse the same serializer

## Related Files

- `packages/agent/src/services/issueTracker/JiraIssueWriter.ts`
- `packages/agent/src/services/issueTracker/JiraIssueReader.ts`
- `packages/agent/src/test/mocks/JiraIssueWriter.test.ts`
- `packages/agent/src/test/mocks/JiraIssueReader.test.ts`
- `docs/initial/4-jira-custom-fields.md`

