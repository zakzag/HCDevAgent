/**
 * Jira custom field key constants.
 * From 4-jira-custom-fields.md.
 */
export const JIRA_CUSTOM_FIELDS = {
    DESCRIPTION_FOR_AI: 'description_for_ai',
    IMPLEMENTATION_PLAN: 'implementation_plan',
    IMPLEMENTATION_PLAN_FOR_AI: 'implementation_plan_for_ai',
    BRANCH_NAME: 'branch_name',
    PR_URL: 'pr_url',
    FAILURE_REASON: 'failure_reason',
} as const;

/** Union type of all custom field keys. */
export type JiraCustomField = (typeof JIRA_CUSTOM_FIELDS)[keyof typeof JIRA_CUSTOM_FIELDS];
