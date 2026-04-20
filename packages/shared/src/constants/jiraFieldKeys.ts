/**
 * Jira custom field IDs for HCDevAgent-specific fields.
 *
 * These are the actual REST API identifiers (customfield_XXXXX) used by
 * Jira Cloud. They are NOT the human-readable display names shown in the UI.
 * To find IDs for new fields: GET /rest/api/3/field and look for customfield_* entries.
 *
 * Last verified against zakzag.atlassian.net on 2026-04-20.
 */
export const JIRA_CUSTOM_FIELDS = {
    /** "Description For AI" — customfield_10164 */
    DESCRIPTION_FOR_AI: 'customfield_10164',
    /** "Implementation Plan" — customfield_10197 */
    IMPLEMENTATION_PLAN: 'customfield_10197',
    /** "Implementation Plan for AI" — customfield_10198 */
    IMPLEMENTATION_PLAN_FOR_AI: 'customfield_10198',
    /** "Branch Name" — customfield_10199 */
    BRANCH_NAME: 'customfield_10199',
    /** "PR URL" — customfield_10200 */
    PR_URL: 'customfield_10200',
    /** "Failure Reason" — customfield_10201 */
    FAILURE_REASON: 'customfield_10201',
} as const;

/** Union type of all custom field IDs. */
export type JiraCustomField = (typeof JIRA_CUSTOM_FIELDS)[keyof typeof JIRA_CUSTOM_FIELDS];

/**
 * JQL display names for HCDevAgent custom fields.
 *
 * In JQL you reference custom fields by their human-readable display name,
 * wrapped in double-quotes when the name contains spaces.
 * Use these constants instead of hard-coding display name strings in JQL builders.
 *
 * Rule: JIRA_CUSTOM_FIELDS  → REST API field access  (customfield_XXXXX)
 *       JIRA_CUSTOM_FIELD_JQL_NAMES → JQL queries ("Display Name")
 */
export const JIRA_CUSTOM_FIELD_JQL_NAMES = {
    /** JQL name for "Description For AI" */
    DESCRIPTION_FOR_AI: '"Description For AI"',
    /** JQL name for "Implementation Plan" */
    IMPLEMENTATION_PLAN: '"Implementation Plan"',
    /** JQL name for "Implementation Plan for AI" */
    IMPLEMENTATION_PLAN_FOR_AI: '"Implementation Plan for AI"',
    /** JQL name for "Branch Name" */
    BRANCH_NAME: '"Branch Name"',
    /** JQL name for "PR URL" */
    PR_URL: '"PR URL"',
    /** JQL name for "Failure Reason" */
    FAILURE_REASON: '"Failure Reason"',
} as const;

/** Union type of all JQL field name strings. */
export type JiraCustomFieldJqlName = (typeof JIRA_CUSTOM_FIELD_JQL_NAMES)[keyof typeof JIRA_CUSTOM_FIELD_JQL_NAMES];
