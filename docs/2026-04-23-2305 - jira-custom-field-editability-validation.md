# Jira Custom Field Editability Validation

**Date:** 2026-04-23 23:05  
**Type:** Architecture / Design Decision  
**Affects:** Jira issue writer, custom-field updates, investigation-to-plan workflow

## Summary

Updated the Jira writer to validate custom-field editability before sending issue update requests.

`JiraIssueWriter.updateCustomField()` now:

1. fetches `GET /rest/api/3/issue/{issueKey}/editmeta`
2. checks that the requested custom field is editable for the current issue
3. only then sends the `PUT /rest/api/3/issue/{issueKey}` update

If Jira still rejects the request, the writer now preserves Jira's response payload in the error context.

## Why

A plain `400` from Jira was not actionable enough. In practice, custom-field updates can fail for several Jira-specific reasons:

- the `customfield_XXXXX` ID is stale or wrong
- the field is not available for the issue's project or issue-type context
- the field is missing from the Jira edit screen for the current workflow state
- the payload does not match the field's Jira schema

Without `editmeta` validation and response-body capture, the conductor log only showed `Jira API PUT returned 400`.

## Decision

The writer now fails fast with a clearer `IntegrationError` when the field is not editable for the issue.

Error context includes:

- `issueKey`
- `fieldName`
- available editable field keys from Jira
- suggested likely causes

For failed Jira HTTP responses, error context now also includes:

- request path
- HTTP status
- request body
- parsed Jira `errorMessages`
- parsed Jira field-level `errors`
- raw response body when parsing fails

## Expected Operational Outcome

When a Jira field update fails, logs should now reveal whether the problem is:

- agent configuration drift
- Jira workflow/screen configuration
- Jira custom-field context configuration
- payload/schema mismatch

This should significantly reduce time-to-diagnosis for issues like `Description For AI` update failures during `moveToPlan`.

## Related Files

- `packages/agent/src/services/issueTracker/JiraIssueWriter.ts`
- `packages/agent/src/test/mocks/JiraIssueWriter.test.ts`
- `docs/initial/4-jira-custom-fields.md`

