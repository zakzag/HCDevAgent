/**
 * Workflow status constants matching exact Jira status names.
 * From 0-initial-description.md workflow statuses.
 */
export const WORKFLOW_STATUSES = {
    BACKLOG: 'Backlog',
    SELECTED_FOR_TRIAGE: 'Selected for Triage',
    ISSUE_INVESTIGATION: 'Issue Investigation',
    BLOCKED_FOR_PLAN_CLARIFICATION: 'Blocked for Plan Clarification',
    PLAN: 'Plan',
    PLAN_REVIEW: 'Plan Review',
    READY_FOR_IMPLEMENTATION: 'Ready for Implementation',
    IN_PROGRESS: 'In Progress',
    BLOCKED_FOR_CODE_CLARIFICATION: 'Blocked for Code Clarification',
    CODE_COMMITTED: 'Code Committed',
    PR_IN_REVIEW: 'PR in Review',
    PR_APPROVED: 'PR Approved',
    PR_CHANGES_REQUESTED: 'PR Changes Requested',
    DONE: 'Done',
    FAILURE: 'Failure',
    CANCELLED: 'Cancelled',
} as const;

/** Union type of all valid workflow statuses. */
export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[keyof typeof WORKFLOW_STATUSES];
